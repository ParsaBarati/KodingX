import crypto from 'crypto';
import { readJson, writeJsonAtomic } from './io.js';

const MAX_ENTRIES = 500;

function hashMessage(chatId, messageId, text) {
  const payload = `${chatId}:${messageId}:${text || ''}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function isDuplicate(paths, chatId, messageId, text, ttlSeconds = 600) {
  const dedupe = await readJson(paths.dedupeJson, { entries: [] });
  const now = Date.now();
  const hash = hashMessage(chatId, messageId, text);

  const recent = dedupe.entries.filter(e => now - e.ts < ttlSeconds * 1000);
  const exists = recent.some(e => e.hash === hash);

  if (!exists) {
    recent.push({ hash, ts: now });
  }

  while (recent.length > MAX_ENTRIES) {
    recent.shift();
  }

  await writeJsonAtomic(paths.dedupeJson, { entries: recent });
  return exists;
}
