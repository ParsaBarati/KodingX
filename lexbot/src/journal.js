import fs from 'fs/promises';

let seq = 0;

function nextEventId() {
  seq += 1;
  const ts = Date.now();
  return `${ts}-${seq}`;
}

export async function appendEvent(eventsPath, event) {
  const record = {
    id: event.id || nextEventId(),
    ts: event.ts || new Date().toISOString(),
    type: event.type || 'event',
    task_id: event.task_id || null,
    data: event.data || {}
  };
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(eventsPath, line, 'utf-8');
  return record;
}
