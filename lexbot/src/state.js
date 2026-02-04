import path from 'path';
import { ensureDir, fileExists, readJson, writeJsonAtomic, writeTextAtomic } from './io.js';
import { withLock } from './locks.js';

export function defaultState() {
  return {
    version: 'lexbot/1',
    updated_at: new Date().toISOString(),
    queue: {
      incoming: 0,
      ready: 0,
      running: 0,
      blocked: 0,
      done: 0
    },
    running: [],
    blocked: [],
    done_recent: [],
    last_error: null
  };
}

export function defaultIndex() {
  return {
    updated_at: new Date().toISOString(),
    tasks: {}
  };
}

export async function initStateFiles(paths) {
  await ensureDir(paths.stateDir);

  if (!(await fileExists(paths.stateJson))) {
    await writeJsonAtomic(paths.stateJson, defaultState());
  }
  if (!(await fileExists(paths.indexJson))) {
    await writeJsonAtomic(paths.indexJson, defaultIndex());
  }
  if (!(await fileExists(paths.stateMd))) {
    const content = [
      '# STATE',
      '',
      'This file mirrors STATE.json for humans.',
      ''
    ].join('\n');
    await writeTextAtomic(paths.stateMd, content);
  }
  if (!(await fileExists(paths.taskBoardMd))) {
    const content = [
      '# Task Board',
      '',
      'This board is derived from STATE.json and queue folders.',
      ''
    ].join('\n');
    await writeTextAtomic(paths.taskBoardMd, content);
  }
}

export async function loadState(paths) {
  return readJson(paths.stateJson, defaultState());
}

export async function saveState(paths, state) {
  const lockPath = path.join(paths.locksDir, 'state.lock');
  const result = await withLock(lockPath, async () => {
    state.updated_at = new Date().toISOString();
    await writeJsonAtomic(paths.stateJson, state);
  }, { scope: 'state' });
  return result.acquired;
}

export async function loadIndex(paths) {
  return readJson(paths.indexJson, defaultIndex());
}

export async function saveIndex(paths, index) {
  const lockPath = path.join(paths.locksDir, 'state.lock');
  const result = await withLock(lockPath, async () => {
    index.updated_at = new Date().toISOString();
    await writeJsonAtomic(paths.indexJson, index);
  }, { scope: 'index' });
  return result.acquired;
}
