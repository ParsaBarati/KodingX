import path from 'path';
import fs from 'fs/promises';
import { ensureDir, writeJsonAtomic } from './io.js';
import { inboxTaskDir } from './paths.js';
import { createQueueEntry } from './queue.js';

function verifyTaskId(parentId) {
  return `${parentId}-V`;
}

function healTaskId(parentId, attempt = 1) {
  return `${parentId}-H${attempt}`;
}

function isVerifyTask(taskId) {
  return taskId.endsWith('-V');
}

function isHealTask(taskId) {
  return /-H\d+$/.test(taskId);
}

function parentIdFromSubtask(taskId) {
  if (isVerifyTask(taskId)) return taskId.slice(0, -2);
  if (isHealTask(taskId)) return taskId.replace(/-H\d+$/, '');
  return null;
}

async function createSubtask(paths, parentTask, agent, id, taskType, titleSuffix, riskClassOverride = null) {
  const taskDir = inboxTaskDir(paths.inboxDir, agent, id);
  await ensureDir(taskDir);

  const task = {
    ...parentTask,
    task_id: id,
    parent_task_id: parentTask.task_id,
    task_type: taskType,
    risk_class: riskClassOverride || parentTask.risk_class,
    title: `${parentTask.title} (${titleSuffix})`,
    status: {
      state: 'queued',
      attempt: 0,
      last_error_signature: null,
      pipeline: {
        stage: taskType === 'verify' ? 'verify' : 'heal',
        verify_task_id: taskType === 'verify' ? id : null,
        heal_task_id: taskType === 'heal' ? id : null,
        parent_task_id: parentTask.task_id
      }
    },
    dispatch: {
      ...parentTask.dispatch,
      primary_agent: agent
    }
  };

  await writeJsonAtomic(path.join(taskDir, 'task.json'), task);
  await fs.writeFile(path.join(taskDir, 'task.md'), `# ${task.title}\n\nVerify task for ${parentTask.task_id}.\n`, 'utf-8');
  await createQueueEntry(paths.queueDir, 'ready', id, { agent });
  return task;
}

export async function handlePipelineSuccess(paths, task, report, config) {
  const pipeline = task.pipeline_id || 'code_execute_verify';

  if (isVerifyTask(task.task_id)) {
    return { action: 'verify_complete', parentId: parentIdFromSubtask(task.task_id) };
  }

  if (isHealTask(task.task_id)) {
    const parentId = parentIdFromSubtask(task.task_id);
    if (!parentId) return { action: 'done' };
    if (pipeline === 'code_execute_verify') {
      const verifyAgent = task.dispatch?.verify_agent || 'gemini';
      const verifyId = verifyTaskId(parentId);
      await createSubtask(paths, task, verifyAgent, verifyId, 'verify', 'verify', 'safe_read');
      return { action: 'spawn_verify', verifyId, parentId };
    }
    return { action: 'parent_done', parentId };
  }

  if (pipeline === 'code_execute_verify') {
    const verifyAgent = task.dispatch?.verify_agent || 'gemini';
    const verifyId = verifyTaskId(task.task_id);
    await createSubtask(paths, task, verifyAgent, verifyId, 'verify', 'verify', 'safe_read');
    return { action: 'spawn_verify', verifyId };
  }

  if (pipeline === 'code_execute_only_fast') {
    return { action: 'done' };
  }

  if (pipeline === 'safe_read_analysis') {
    return { action: 'done' };
  }

  return { action: 'done' };
}

export async function handlePipelineFail(paths, task, report, config) {
  if (isVerifyTask(task.task_id)) {
    return { action: 'verify_failed', parentId: parentIdFromSubtask(task.task_id) };
  }

  if (isHealTask(task.task_id)) {
    return { action: 'heal_failed', parentId: parentIdFromSubtask(task.task_id) };
  }

  const healAgent = task.dispatch?.heal_agent || task.dispatch?.primary_agent || 'codex';
  const nextAttempt = (task.status?.attempt || 0) + 1;
  const healId = healTaskId(task.task_id, nextAttempt);
  await createSubtask(paths, task, healAgent, healId, 'code', 'heal', task.risk_class);
  return { action: 'spawn_heal', healId };
}

export function isSubtask(taskId) {
  return isVerifyTask(taskId) || isHealTask(taskId);
}

export function parentTaskId(taskId) {
  return parentIdFromSubtask(taskId);
}
