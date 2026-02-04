import path from 'path';
import { readJson } from './io.js';
import { createValidators } from './schema.js';
import { listTaskDirs, moveTask } from './queue.js';
import { logJson } from './logger.js';
import { appendEvent } from './journal.js';
import { findTaskAgent, updateTaskStatus, updatePipelineState, readTask } from './task_store.js';
import { releaseLock } from './locks.js';
import { recordOutcome } from './scorecard.js';
import { handlePipelineSuccess, handlePipelineFail } from './pipelines.js';
import { notifyAdmins } from './notifier.js';

export async function processOutbox(paths, config) {
  const runningTasks = await listTaskDirs(paths.queueDir, 'running');
  if (runningTasks.length === 0) return;

  const validators = createValidators();

  for (const taskId of runningTasks) {
    const reportPath = path.join(paths.outboxDir, taskId, 'report.json');
    const report = await readJson(reportPath, null);
    if (!report) continue;

    const valid = validators.validateReport(report);
    if (!valid) {
      await logJson(paths.lexbotLog, 'error', 'report_invalid', {
        taskId,
        errors: validators.validateReport.errors
      });
      continue;
    }

    const agent = await findTaskAgent(paths, taskId);
    const task = agent ? await readTask(paths, agent, taskId) : null;
    if (task) {
      await recordOutcome(paths, task, report);
    }

    const filesChanged = Array.isArray(report.files_changed) ? report.files_changed : [];
    const safeRead = task?.pipeline_id === 'safe_read_analysis' || task?.task_type === 'verify';
    if (safeRead && filesChanged.length > 0) {
      const allowPaths = config.safeRead?.allowPaths || ['.kodingx/outbox/', '.kodingx/logs/'];
      const violation = filesChanged.find((filePath) => {
        if (!filePath || typeof filePath !== 'string') return false;
        return !allowPaths.some(prefix => filePath.startsWith(prefix));
      });
      if (violation) {
        await moveTask(paths.queueDir, taskId, 'running', 'blocked');
        if (agent) await updateTaskStatus(paths, agent, taskId, 'blocked', 'safe_read_violation');
        await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
        if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
        await appendEvent(paths.eventsNdjson, { type: 'task_blocked', task_id: taskId, data: { reason: 'safe_read_violation' } });
        await notifyAdmins(config, `⚠️ Blocked (safe_read_violation): ${taskId}`);
        continue;
      }
    }

    if (report.status === 'success') {
      if (task) {
        const pipelineResult = await handlePipelineSuccess(paths, task, report, config);
        if (pipelineResult.action === 'spawn_verify') {
          await moveTask(paths.queueDir, taskId, 'running', 'blocked');
          if (agent) await updateTaskStatus(paths, agent, taskId, 'blocked', 'await_verify');
          if (agent) await updatePipelineState(paths, agent, taskId, { stage: 'verify', verify_task_id: pipelineResult.verifyId });
          if (pipelineResult.parentId) {
            const parentAgent = await findTaskAgent(paths, pipelineResult.parentId);
            if (parentAgent) {
              await updatePipelineState(paths, parentAgent, pipelineResult.parentId, { stage: 'verify', verify_task_id: pipelineResult.verifyId });
            }
          }
          await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
          if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
          await appendEvent(paths.eventsNdjson, { type: 'task_verify_spawned', task_id: taskId });
          await notifyAdmins(config, `🔎 Verify queued: ${pipelineResult.verifyId} for ${taskId}`);
          continue;
        }
        if (pipelineResult.action === 'verify_complete') {
          const parentId = pipelineResult.parentId;
          if (parentId) {
            await moveTask(paths.queueDir, parentId, 'blocked', 'done');
            const parentAgent = await findTaskAgent(paths, parentId);
            if (parentAgent) {
              await updateTaskStatus(paths, parentAgent, parentId, 'done');
              await updatePipelineState(paths, parentAgent, parentId, { stage: 'done' });
            }
            await notifyAdmins(config, `✅ Done: ${parentId}`);
          }
        }
        if (pipelineResult.action === 'parent_done') {
          const parentId = pipelineResult.parentId;
          if (parentId) {
            await moveTask(paths.queueDir, parentId, 'blocked', 'done');
            const parentAgent = await findTaskAgent(paths, parentId);
            if (parentAgent) {
              await updateTaskStatus(paths, parentAgent, parentId, 'done');
              await updatePipelineState(paths, parentAgent, parentId, { stage: 'done' });
            }
            await notifyAdmins(config, `✅ Done: ${parentId}`);
          }
        }
      }

      await moveTask(paths.queueDir, taskId, 'running', 'done');
      if (agent) await updateTaskStatus(paths, agent, taskId, 'done');
      await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
      if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
      await appendEvent(paths.eventsNdjson, { type: 'task_done', task_id: taskId });
      await notifyAdmins(config, `✅ Done: ${taskId}`);
      continue;
    }

    if (report.status === 'blocked' || report.status === 'needs_approval') {
      await moveTask(paths.queueDir, taskId, 'running', 'blocked');
      if (agent) await updateTaskStatus(paths, agent, taskId, 'blocked', report.error_signature || null);
      await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
      if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
      await appendEvent(paths.eventsNdjson, { type: 'task_blocked', task_id: taskId });
      await notifyAdmins(config, `⚠️ Blocked: ${taskId}`);
      continue;
    }

    if (report.status === 'fail') {
      if (task) {
        const pipelineResult = await handlePipelineFail(paths, task, report, config);
        if (pipelineResult.action === 'spawn_heal') {
          await moveTask(paths.queueDir, taskId, 'running', 'blocked');
          if (agent) await updateTaskStatus(paths, agent, taskId, 'blocked', report.error_signature || null);
          if (agent) await updatePipelineState(paths, agent, taskId, { stage: 'heal', heal_task_id: pipelineResult.healId });
          await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
          if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
          await appendEvent(paths.eventsNdjson, { type: 'task_heal_spawned', task_id: taskId });
          await notifyAdmins(config, `🛠️ Heal queued: ${pipelineResult.healId} for ${taskId}`);
          continue;
        }
        if (pipelineResult.action === 'verify_failed') {
          const parentId = pipelineResult.parentId;
          if (parentId) {
            const parentAgent = await findTaskAgent(paths, parentId);
            const parentTask = parentAgent ? await readTask(paths, parentAgent, parentId) : null;
            if (parentTask) {
              const healResult = await handlePipelineFail(paths, parentTask, report, config);
              if (healResult.action === 'spawn_heal') {
                if (parentAgent) await updatePipelineState(paths, parentAgent, parentId, { stage: 'heal', heal_task_id: healResult.healId });
                await notifyAdmins(config, `🛠️ Heal queued: ${healResult.healId} for ${parentId}`);
              }
            }
          }
        }
      }

      await moveTask(paths.queueDir, taskId, 'running', 'blocked');
      if (agent) await updateTaskStatus(paths, agent, taskId, 'failed', report.error_signature || null);
      await releaseLock(path.join(paths.locksDir, 'task', `${taskId}.lock`));
      if (agent) await releaseLock(path.join(paths.locksDir, 'agent', `${agent}.lock`));
      await appendEvent(paths.eventsNdjson, { type: 'task_failed', task_id: taskId });
      await notifyAdmins(config, `❌ Failed: ${taskId}`);
    }
  }
}
