import path from 'path';
import { listTaskDirs } from './queue.js';
import { findTaskAgent, readTask } from './task_store.js';

export async function collectRunningByAgent(paths) {
  const running = await listTaskDirs(paths.queueDir, 'running');
  const counts = {};
  for (const taskId of running) {
    const agent = await findTaskAgent(paths, taskId);
    if (!agent) continue;
    counts[agent] = (counts[agent] || 0) + 1;
  }
  return counts;
}

export async function selectRunnable(paths, config, maxCount) {
  const ready = await listTaskDirs(paths.queueDir, 'ready');
  const runningCounts = await collectRunningByAgent(paths);
  const runningGroups = new Set();
  const runningTasks = await listTaskDirs(paths.queueDir, 'running');
  for (const taskId of runningTasks) {
    const agent = await findTaskAgent(paths, taskId);
    if (!agent) continue;
    const task = await readTask(paths, agent, taskId);
    if (task?.dispatch?.concurrency_group) {
      runningGroups.add(task.dispatch.concurrency_group);
    }
  }
  const selected = [];

  for (const taskId of ready) {
    if (selected.length >= maxCount) break;
    const agent = await findTaskAgent(paths, taskId);
    if (!agent) continue;
    const task = await readTask(paths, agent, taskId);
    if (!task) continue;

    const agentLimit = config.perAgentMaxConcurrency?.[agent] ?? 1;
    const current = runningCounts[agent] || 0;
    if (current >= agentLimit) continue;

    const group = task.dispatch?.concurrency_group || 'default';
    if (runningGroups.has(group)) continue;

    runningCounts[agent] = current + 1;
    runningGroups.add(group);
    selected.push({ taskId, agent, task });
  }

  return selected;
}
