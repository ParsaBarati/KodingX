import { updateCounters } from './counters.js';

export async function nextTaskId(paths) {
  const result = await updateCounters(paths, async (counters) => {
    const next = { ...counters };
    next.task_seq = (next.task_seq || 0) + 1;
    return next;
  });

  if (!result.acquired) {
    throw new Error('Failed to acquire counter lock');
  }

  const seq = result.result.task_seq;
  return `T${String(seq).padStart(4, '0')}`;
}
