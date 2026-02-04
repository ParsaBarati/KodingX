import fs from 'fs/promises';
import path from 'path';
import { bootstrap } from './bootstrap.js';
import { loadConfig } from './config.js';
import { getPaths, inboxTaskDir } from './paths.js';
import { writeHeartbeat } from './heartbeat.js';
import { appendEvent } from './journal.js';
import { logJson } from './logger.js';
import { selectRunnable } from './scheduler.js';
import { spawnAgent, availableAgents } from './runner.js';
import { pollTelegram, handleUpdates, ackTelegramUpdates } from './telegram.js';
import { processIncoming, applyApproval } from './processor.js';
import { processOutbox } from './outbox_processor.js';
import { loadState, saveState } from './state.js';
import { loadStatus } from './status.js';
import { updateTaskStatus, updatePipelineState } from './task_store.js';
import { acquireLock, releaseLock, cleanupStaleLocks } from './locks.js';
import { notifyAdmins } from './notifier.js';
import { maybeCreateSelfTask } from './self_task.js';
import { assertConfig } from './config_check.js';

async function countQueue(queueDir) {
  const buckets = ['incoming', 'ready', 'running', 'blocked', 'done'];
  const counts = {};
  for (const bucket of buckets) {
    try {
      const items = await fs.readdir(path.join(queueDir, bucket), { withFileTypes: true });
      counts[bucket] = items.filter(d => d.isDirectory()).length;
    } catch {
      counts[bucket] = 0;
    }
  }
  return counts;
}

async function tick(repoRoot, config) {
  const paths = getPaths(repoRoot);
  let queueCounts = await countQueue(paths.queueDir);

  const status = await loadStatus(paths);
  if (status.paused) {
    await writeHeartbeat(paths.heartbeatJson, {
      uptime: Math.round(process.uptime()),
      queue_depth: Object.values(queueCounts).reduce((a, b) => a + b, 0),
      running_count: queueCounts.running,
      paused: true
    });
    return;
  }

  await writeHeartbeat(paths.heartbeatJson, {
    uptime: Math.round(process.uptime()),
    queue_depth: Object.values(queueCounts).reduce((a, b) => a + b, 0),
    running_count: queueCounts.running
  });

  const polling = await pollTelegram(paths, config);
  if (polling.updates?.length) {
    await handleUpdates(paths, config, polling.updates, true);
    await ackTelegramUpdates(paths, polling.updates);
  }

  await processIncoming(paths, config);
  await applyApproval(paths, config);
  await processOutbox(paths, config);

  queueCounts = await countQueue(paths.queueDir);

  const state = await loadState(paths);
  state.queue = queueCounts;
  await saveState(paths, state);

  const selfDraft = await maybeCreateSelfTask(paths, config, queueCounts);
  if (selfDraft) {
    await notifyAdmins(config, `🤖 Self-task created: ${selfDraft.task_id}`);
    queueCounts = await countQueue(paths.queueDir);
  }

  await appendEvent(paths.eventsNdjson, {
    type: 'heartbeat',
    data: queueCounts
  });

  const availableSlots = Math.max(0, config.globalMaxConcurrency - queueCounts.running);
  if (availableSlots === 0) return;

  const runnable = await selectRunnable(paths, config, availableSlots);
  for (const entry of runnable) {
    const { taskId, agent, task } = entry;

    const taskLockPath = path.join(paths.locksDir, 'task', `${taskId}.lock`);
    const agentLockPath = path.join(paths.locksDir, 'agent', `${agent}.lock`);

    try {
      const taskLocked = await acquireLock(taskLockPath, { taskId, agent }, config.locks?.ttlSeconds || 3600);
      if (!taskLocked) continue;
      const agentLocked = await acquireLock(agentLockPath, { taskId }, config.locks?.ttlSeconds || 3600);
      if (!agentLocked) {
        await releaseLock(taskLockPath);
        continue;
      }
      await fs.rename(path.join(paths.queueDir, 'ready', taskId), path.join(paths.queueDir, 'running', taskId));
    } catch {
      await logJson(paths.lexbotLog, 'warn', 'task_move_failed', { taskId });
      continue;
    }

    await appendEvent(paths.eventsNdjson, {
      type: 'task_started',
      task_id: taskId,
      data: { agent }
    });
    await notifyAdmins(config, `▶️ Running: ${taskId} on ${agent}`);

    const taskDir = inboxTaskDir(paths.inboxDir, agent, taskId);
    const timeout = task.constraints?.max_time_minutes || config.timeouts?.defaultMinutes || 45;
    await updateTaskStatus(paths, agent, taskId, 'running');
    await updatePipelineState(paths, agent, taskId, { stage: 'execute' });
    const spawnResult = await spawnAgent(paths, taskId, agent, taskDir, `.kodingx/agents/${agent}.md`, timeout, config);
    if (!spawnResult.spawned) {
      await logJson(paths.lexbotLog, 'error', 'agent_spawn_failed', { taskId, agent });
      await updateTaskStatus(paths, agent, taskId, 'blocked', 'missing_agent_template');
      await fs.rename(path.join(paths.queueDir, 'running', taskId), path.join(paths.queueDir, 'blocked', taskId));
      await releaseLock(taskLockPath);
      await releaseLock(agentLockPath);
      await appendEvent(paths.eventsNdjson, { type: 'task_blocked', task_id: taskId, data: { agent } });
    }
  }
}

async function main() {
  const repoRoot = process.cwd();
  const cmd = process.argv[2] || 'run';

  if (cmd === 'init') {
    await bootstrap(repoRoot);
    console.log('lexbot initialized');
    return;
  }

  if (cmd === 'doctor') {
    const paths = await bootstrap(repoRoot);
    const config = await loadConfig(repoRoot);
    const report = await (await import('./doctor.js')).runDoctor(paths, config);
    console.log(report);
    return;
  }

  const paths = await bootstrap(repoRoot);
  const config = await loadConfig(repoRoot);
  config.availableAgents = availableAgents();
  await assertConfig(paths, config);
  await cleanupStaleLocks(path.join(paths.locksDir, 'task'), config.locks?.ttlSeconds || 3600);
  await cleanupStaleLocks(path.join(paths.locksDir, 'agent'), config.locks?.ttlSeconds || 3600);

  if (cmd === 'tick') {
    await tick(repoRoot, config);
    console.log('tick complete');
    return;
  }

  const interval = config.telegram.pollIntervalMs || 2000;
  console.log(`lexbot running (interval=${interval}ms)`);
  setInterval(() => {
    tick(repoRoot, config).catch(err => {
      logJson(paths.lexbotLog, 'error', 'tick_failed', { message: err.message });
    });
  }, interval);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
