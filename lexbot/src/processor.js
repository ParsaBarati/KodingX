import path from 'path';
import fs from 'fs/promises';
import { listTaskDirs, readDraft, moveTask } from './queue.js';
import { normalizeDraft } from './normalizer.js';
import { ensureApprovalRequest, isApproved } from './approval.js';
import { appendEvent } from './journal.js';
import { logJson } from './logger.js';
import { writeJsonAtomic } from './io.js';
import { notifyAdmins } from './notifier.js';

export async function processIncoming(paths, config) {
  const incoming = await listTaskDirs(paths.queueDir, 'incoming');
  for (const taskId of incoming) {
    const draft = await readDraft(paths.queueDir, taskId);
    if (!draft) continue;

    const { task, agent } = await normalizeDraft(draft, config, paths);
    const readyDir = await moveTask(paths.queueDir, taskId, 'incoming', 'ready');

    if (task.raw_text_ref) {
      task.raw_text_ref = path.join(readyDir, 'raw.txt');
      const taskJsonPath = path.join(paths.inboxDir, agent, task.task_id, 'task.json');
      await writeJsonAtomic(taskJsonPath, task);
    }

    await fs.writeFile(path.join(readyDir, 'meta.json'), JSON.stringify({
      task_id: task.task_id,
      agent,
      created_at: task.created_at
    }, null, 2));

    await appendEvent(paths.eventsNdjson, {
      type: 'task_normalized',
      task_id: task.task_id,
      data: { agent, risk_class: task.risk_class }
    });
  }
}

export async function applyApproval(paths, config) {
  const ready = await listTaskDirs(paths.queueDir, 'ready');
  for (const taskId of ready) {
    const taskJsonPath = await findTaskJson(paths, taskId);
    if (!taskJsonPath) continue;

    const task = JSON.parse(await fs.readFile(taskJsonPath, 'utf-8'));
    const needsApproval = (config.approval?.requiredRiskClasses || []).includes(task.risk_class);
    if (!needsApproval) continue;

    const approved = await isApproved(paths, taskId);
    if (approved) continue;

    await ensureApprovalRequest(paths, task, `risk_class=${task.risk_class}`);
    await moveTask(paths.queueDir, taskId, 'ready', 'blocked');
    await logJson(paths.lexbotLog, 'info', 'task_needs_approval', { taskId });
    await appendEvent(paths.eventsNdjson, { type: 'task_needs_approval', task_id: taskId });
    await notifyAdmins(config, `⚠️ Needs approval: ${taskId} (${task.risk_class})`);
  }

  const blocked = await listTaskDirs(paths.queueDir, 'blocked');
  for (const taskId of blocked) {
    const approved = await isApproved(paths, taskId);
    if (!approved) continue;
    try {
      await moveTask(paths.queueDir, taskId, 'blocked', 'ready');
      await appendEvent(paths.eventsNdjson, { type: 'task_approved', task_id: taskId });
      await notifyAdmins(config, `✅ Approved: ${taskId}`);
    } catch (err) {
      await logJson(paths.lexbotLog, 'warn', 'approval_move_failed', { taskId, error: err.message });
    }
  }
}

async function findTaskJson(paths, taskId) {
  try {
    const agents = await fs.readdir(paths.inboxDir, { withFileTypes: true });
    for (const agent of agents) {
      if (!agent.isDirectory()) continue;
      const candidate = path.join(paths.inboxDir, agent.name, taskId, 'task.json');
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}
