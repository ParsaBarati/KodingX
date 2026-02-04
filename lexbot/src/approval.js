import fs from 'fs/promises';
import path from 'path';
import { ensureDir, readJson, writeJsonAtomic, fileExists } from './io.js';

function reqIdForTask(taskId) {
  return `REQ-${taskId}`;
}

export async function ensureApprovalRequest(paths, task, reason) {
  await ensureDir(paths.approvalDir);
  const reqId = reqIdForTask(task.task_id);
  const reqPath = path.join(paths.approvalDir, `${reqId}.json`);

  if (await fileExists(reqPath)) {
    return { reqId, path: reqPath };
  }

  const payload = {
    req_id: reqId,
    task_id: task.task_id,
    risk_class: task.risk_class,
    reason,
    diff_summary_ref: task.raw_text_ref || null,
    requested_at: new Date().toISOString(),
    requested_by: 'lexbot',
    approve_instructions: `reply /approve ${reqId} ####`,
    approved_at: null,
    approved_by: null
  };

  await writeJsonAtomic(reqPath, payload);
  return { reqId, path: reqPath };
}

export async function markApproved(paths, reqId, approvedBy, code) {
  const reqPath = path.join(paths.approvalDir, `${reqId}.json`);
  const sigPath = path.join(paths.approvalDir, `${reqId}.sig`);

  const request = await readJson(reqPath, null);
  if (!request) return null;

  request.approved_at = new Date().toISOString();
  request.approved_by = approvedBy;

  await writeJsonAtomic(reqPath, request);
  await fs.writeFile(sigPath, `${approvedBy}:${code}`, 'utf-8');

  return request;
}

export async function isApproved(paths, taskId) {
  const reqId = reqIdForTask(taskId);
  const sigPath = path.join(paths.approvalDir, `${reqId}.sig`);
  return fileExists(sigPath);
}
