import path from 'path';
import { readJson, writeJsonAtomic, fileExists } from './io.js';
import { withLock } from './locks.js';

export function defaultCounters() {
  return {
    started_at: new Date().toISOString(),
    task_seq: 0,
    telegram_offset: 0,
    last_telegram_poll_ok: null,
    last_selector_ok: null,
    last_outbox_seen_ts: null,
    selector_model_index: 0,
    last_self_task_at: null,
    self_task_count_day: 0,
    self_task_day: null
  };
}

export async function loadCounters(paths) {
  const exists = await fileExists(paths.countersJson);
  if (!exists) {
    await writeJsonAtomic(paths.countersJson, defaultCounters());
    return defaultCounters();
  }
  return readJson(paths.countersJson, defaultCounters());
}

export async function saveCounters(paths, counters) {
  const lockPath = path.join(paths.locksDir, 'state.lock');
  await withLock(lockPath, async () => {
    await writeJsonAtomic(paths.countersJson, counters);
  }, { scope: 'counters' });
}

export async function updateCounters(paths, updater) {
  const lockPath = path.join(paths.locksDir, 'state.lock');
  return withLock(lockPath, async () => {
    const current = await readJson(paths.countersJson, defaultCounters());
    const next = await updater(current);
    await writeJsonAtomic(paths.countersJson, next);
    return next;
  }, { scope: 'counters' });
}
