import fs from 'fs/promises';
import path from 'path';

export async function listOutboxTasks(outboxDir) {
  try {
    const items = await fs.readdir(outboxDir, { withFileTypes: true });
    return items.filter(d => d.isDirectory()).map(d => d.name);
  } catch {
    return [];
  }
}

export async function findReportJson(outboxDir, taskId) {
  const reportPath = path.join(outboxDir, taskId, 'report.json');
  try {
    await fs.access(reportPath);
    return reportPath;
  } catch {
    return null;
  }
}
