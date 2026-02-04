import { writeJsonAtomic } from './io.js';

export async function writeHeartbeat(heartbeatPath, payload) {
  const data = {
    ts: new Date().toISOString(),
    ...payload
  };
  await writeJsonAtomic(heartbeatPath, data);
  return data;
}
