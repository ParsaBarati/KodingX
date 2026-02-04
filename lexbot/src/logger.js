import fs from 'fs/promises';

export async function logJson(logPath, level, message, data = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    message,
    data
  };
  await fs.appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf-8');
}
