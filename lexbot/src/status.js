import { readJson, writeJsonAtomic } from './io.js';

export async function loadStatus(paths) {
  return readJson(paths.statusJson, { paused: false });
}

export async function setPaused(paths, paused) {
  const status = { paused: Boolean(paused), updated_at: new Date().toISOString() };
  await writeJsonAtomic(paths.statusJson, status);
  return status;
}
