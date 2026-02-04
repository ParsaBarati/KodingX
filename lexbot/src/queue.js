import fs from 'fs/promises';
import path from 'path';
import { ensureDir, writeJsonAtomic, readJson } from './io.js';

export async function enqueueIncoming(queueDir, taskId, draft) {
  const taskDir = path.join(queueDir, 'incoming', taskId);
  await ensureDir(taskDir);
  await writeJsonAtomic(path.join(taskDir, 'draft.json'), draft);
  await fs.writeFile(path.join(taskDir, 'draft.txt'), draft.raw_text || '', 'utf-8');
  return taskDir;
}

export async function moveTask(queueDir, taskId, from, to) {
  const fromPath = path.join(queueDir, from, taskId);
  const toPath = path.join(queueDir, to, taskId);
  await ensureDir(path.join(queueDir, to));
  await fs.rename(fromPath, toPath);
  return toPath;
}

export async function listTaskDirs(queueDir, bucket) {
  const bucketDir = path.join(queueDir, bucket);
  try {
    const items = await fs.readdir(bucketDir, { withFileTypes: true });
    return items.filter(d => d.isDirectory()).map(d => d.name);
  } catch {
    return [];
  }
}

export async function readDraft(queueDir, taskId) {
  const draftPath = path.join(queueDir, 'incoming', taskId, 'draft.json');
  return readJson(draftPath, null);
}

export async function createQueueEntry(queueDir, bucket, taskId, meta = {}) {
  const taskDir = path.join(queueDir, bucket, taskId);
  await ensureDir(taskDir);
  await writeJsonAtomic(path.join(taskDir, 'meta.json'), {
    task_id: taskId,
    created_at: new Date().toISOString(),
    ...meta
  });
  return taskDir;
}
