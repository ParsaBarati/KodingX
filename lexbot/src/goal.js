import fs from 'fs/promises';

function parseGoalLines(content) {
  const lines = content.split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('- [ ]')) {
      items.push({
        index: items.length + 1,
        line,
        lineNumber: i
      });
    }
  }
  return { lines, items };
}

export async function listGoals(goalPath) {
  try {
    const raw = await fs.readFile(goalPath, 'utf-8');
    const { items } = parseGoalLines(raw);
    return items.map(item => item.line.trim());
  } catch {
    return [];
  }
}

export async function addGoal(goalPath, text, priority = 'P2') {
  const line = `- [ ] ${priority} ${text}`;
  let content = '';
  try {
    content = await fs.readFile(goalPath, 'utf-8');
  } catch {
    content = '# GOAL\n\n## Milestones\n\n';
  }

  if (!content.includes('## Milestones')) {
    content = `# GOAL\n\n## Milestones\n\n${content}`;
  }

  const parts = content.split(/## Maintenance/);
  if (parts.length === 1) {
    content = `${content.trim()}\n${line}\n`;
  } else {
    content = `${parts[0].trim()}\n${line}\n\n## Maintenance${parts[1]}`;
  }

  await fs.writeFile(goalPath, content, 'utf-8');
  return line;
}

export async function markGoalDone(goalPath, index) {
  const content = await fs.readFile(goalPath, 'utf-8');
  const { lines, items } = parseGoalLines(content);
  const item = items.find(i => i.index === index);
  if (!item) return null;
  lines[item.lineNumber] = lines[item.lineNumber].replace('- [ ]', '- [x]');
  await fs.writeFile(goalPath, lines.join('\n'), 'utf-8');
  return lines[item.lineNumber].trim();
}
