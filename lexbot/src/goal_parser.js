import fs from 'fs/promises';

function parsePriority(text) {
  const match = text.match(/\bP([0-3])\b/);
  if (match) return `P${match[1]}`;
  return 'P2';
}

export async function loadGoalCandidates(goalPath) {
  try {
    const raw = await fs.readFile(goalPath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    const candidates = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- [ ]')) continue;
      const text = trimmed.replace('- [ ]', '').trim();
      if (!text) continue;
      const priority = parsePriority(text);
      candidates.push({
        title: text,
        description: text,
        priority,
        source: 'self',
        origin: 'goal'
      });
    }

    return candidates;
  } catch {
    return [];
  }
}
