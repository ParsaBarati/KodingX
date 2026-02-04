import fs from 'fs/promises';

async function readLock(lockPath) {
  try {
    const raw = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isStale(lockData, ttlSeconds) {
  if (!lockData || !lockData.ts) return false;
  const ageMs = Date.now() - new Date(lockData.ts).getTime();
  return ageMs > ttlSeconds * 1000;
}

export async function acquireLock(lockPath, meta = {}, ttlSeconds = 3600) {
  try {
    const handle = await fs.open(lockPath, 'wx');
    const payload = JSON.stringify({
      ts: new Date().toISOString(),
      pid: process.pid,
      ...meta
    });
    await handle.writeFile(payload, 'utf-8');
    await handle.close();
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const existing = await readLock(lockPath);
    if (existing && isStale(existing, ttlSeconds)) {
      await fs.unlink(lockPath);
      return acquireLock(lockPath, meta, ttlSeconds);
    }
    return false;
  }
}

export async function releaseLock(lockPath) {
  try {
    await fs.unlink(lockPath);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
}

export async function withLock(lockPath, fn, meta = {}) {
  const acquired = await acquireLock(lockPath, meta);
  if (!acquired) return { acquired: false };
  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    await releaseLock(lockPath);
  }
}

export async function cleanupStaleLocks(lockDir, ttlSeconds = 3600) {
  let entries = [];
  try {
    entries = await fs.readdir(lockDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const lockPath = `${lockDir}/${entry.name}`;
    const data = await readLock(lockPath);
    if (data && isStale(data, ttlSeconds)) {
      await fs.unlink(lockPath);
    }
  }
}
