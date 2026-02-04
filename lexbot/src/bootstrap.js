import fs from 'fs/promises';
import path from 'path';
import { ensureDir, fileExists, writeJsonAtomic } from './io.js';
import { getPaths } from './paths.js';
import { initStateFiles } from './state.js';

export async function bootstrap(repoRoot) {
  const paths = getPaths(repoRoot);

  await ensureDir(paths.kodingxDir);
  await ensureDir(paths.stateDir);
  await ensureDir(paths.queueDir);
  await ensureDir(paths.inboxDir);
  await ensureDir(paths.outboxDir);
  await ensureDir(paths.approvalDir);
  await ensureDir(paths.locksDir);
  await ensureDir(paths.logsDir);
  await ensureDir(paths.lexbotDir);
  await ensureDir(paths.journalDir);
  await ensureDir(path.join(paths.kodingxDir, 'agents'));

  const queueSubdirs = ['incoming', 'ready', 'running', 'blocked', 'done'];
  for (const sub of queueSubdirs) {
    await ensureDir(path.join(paths.queueDir, sub));
  }

  await ensureDir(path.join(paths.locksDir, 'task'));
  await ensureDir(path.join(paths.locksDir, 'agent'));

  await ensureDir(path.join(paths.logsDir, 'lexbot'));
  await ensureDir(path.join(paths.logsDir, 'agents'));

  await initStateFiles(paths);

  if (!(await fileExists(paths.eventsNdjson))) {
    await fs.writeFile(paths.eventsNdjson, '', 'utf-8');
  }

  if (!(await fileExists(paths.countersJson))) {
    await writeJsonAtomic(paths.countersJson, { started_at: new Date().toISOString() });
  }

  if (!(await fileExists(paths.selectorCacheJson))) {
    await writeJsonAtomic(paths.selectorCacheJson, { entries: {} });
  }

  if (!(await fileExists(paths.selectorRateJson))) {
    await writeJsonAtomic(paths.selectorRateJson, { models: {} });
  }

  if (!(await fileExists(paths.statusJson))) {
    await writeJsonAtomic(paths.statusJson, { paused: false });
  }

  if (!(await fileExists(paths.scorecardJson))) {
    await writeJsonAtomic(paths.scorecardJson, { agents: {}, updated_at: new Date().toISOString() });
  }

  if (!(await fileExists(paths.dedupeJson))) {
    await writeJsonAtomic(paths.dedupeJson, { entries: [] });
  }

  const goalPath = path.join(paths.kodingxDir, 'GOAL.md');
  if (!(await fileExists(goalPath))) {
    const template = [
      '# GOAL',
      '',
      '## Milestones',
      '',
      '- [ ] P2 Define initial backlog',
      '- [ ] P2 Add CI checks',
      '',
      '## Maintenance',
      '',
      '- [ ] P3 Periodic test run',
      ''
    ].join('\\n');
    await fs.writeFile(goalPath, template, 'utf-8');
  }

  return paths;
}
