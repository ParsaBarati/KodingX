import fs from 'fs/promises';
import path from 'path';

function buildGoalContent(tasks) {
  const lines = [
    '# GOAL',
    '',
    '## Milestones',
    ''
  ];

  for (const task of tasks) {
    const priority = task.priority || 'P2';
    const title = task.title || task.id || 'Task';
    lines.push(`- [ ] ${priority} ${title}`);
  }

  lines.push('', '## Maintenance', '', '- [ ] P3 Periodic test run', '');
  return lines.join('\n');
}

export async function generateGoalFromTaskBoard(taskBoardPath, goalPath) {
  const raw = await fs.readFile(taskBoardPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const tasks = [];

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 4) continue;
    if (parts[0].toLowerCase() === 'task') continue;
    tasks.push({
      id: parts[0],
      title: parts[1].replace(/"/g, ''),
      priority: parts[2] || 'P2'
    });
  }

  const content = buildGoalContent(tasks);
  await fs.writeFile(goalPath, content, 'utf-8');
  return tasks.length;
}

export async function ensureGoalFromTaskBoard(kodingxDir, taskBoardName = 'TASK_BOARD.md') {
  const taskBoardPath = path.join(kodingxDir, taskBoardName);
  const goalPath = path.join(kodingxDir, 'GOAL.md');

  try {
    await fs.access(taskBoardPath);
  } catch {
    return 0;
  }

  return generateGoalFromTaskBoard(taskBoardPath, goalPath);
}
