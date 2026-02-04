import fs from 'fs/promises';
import path from 'path';
import { readJson, writeJsonAtomic } from './io.js';
import { inboxTaskDir } from './paths.js';

export async function findTaskAgent(paths, taskId) {
  try {
    const agents = await fs.readdir(paths.inboxDir, { withFileTypes: true });
    for (const agent of agents) {
      if (!agent.isDirectory()) continue;
      const candidate = path.join(paths.inboxDir, agent.name, taskId, 'task.json');
      try {
        await fs.access(candidate);
        return agent.name;
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function readTask(paths, agent, taskId) {
  const taskPath = path.join(inboxTaskDir(paths.inboxDir, agent, taskId), 'task.json');
  return readJson(taskPath, null);
}

export async function writeTask(paths, agent, taskId, task) {
  const taskPath = path.join(inboxTaskDir(paths.inboxDir, agent, taskId), 'task.json');
  await writeJsonAtomic(taskPath, task);
}

export async function updateTaskStatus(paths, agent, taskId, state, errorSignature = null) {
  const task = await readTask(paths, agent, taskId);
  if (!task) return null;
  task.status = task.status || {};
  task.status.state = state;
  if (state === 'running') {
    task.status.attempt = (task.status.attempt || 0) + 1;
  }
  if (errorSignature !== null) {
    task.status.last_error_signature = errorSignature;
  }
  await writeTask(paths, agent, taskId, task);
  return task;
}

export async function updatePipelineState(paths, agent, taskId, pipelinePatch) {
  const task = await readTask(paths, agent, taskId);
  if (!task) return null;
  task.status = task.status || {};
  task.status.pipeline = { ...(task.status.pipeline || {}), ...pipelinePatch };
  await writeTask(paths, agent, taskId, task);
  return task;
}
