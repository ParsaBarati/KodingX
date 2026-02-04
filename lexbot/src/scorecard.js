import { readJson, writeJsonAtomic } from './io.js';
import { deriveDomain } from './domain.js';

function emptyAgentStats() {
  return {
    total: 0,
    success: 0,
    fail: 0,
    avg_runtime_ms: null,
    by_task_type: {},
    by_domain: {}
  };
}

function updateAvg(current, nextValue) {
  if (current === null || current === undefined) return nextValue;
  return Math.round((current * 0.8) + (nextValue * 0.2));
}

export async function loadScorecard(paths) {
  return readJson(paths.scorecardJson, { agents: {}, updated_at: new Date().toISOString() });
}

export async function saveScorecard(paths, scorecard) {
  scorecard.updated_at = new Date().toISOString();
  await writeJsonAtomic(paths.scorecardJson, scorecard);
}

export async function recordOutcome(paths, task, report) {
  const scorecard = await loadScorecard(paths);
  const agent = report.agent;
  const entry = scorecard.agents[agent] || emptyAgentStats();
  const success = report.status === 'success';
  const duration = report.started_at && report.ended_at
    ? Math.max(0, new Date(report.ended_at).getTime() - new Date(report.started_at).getTime())
    : null;

  entry.total += 1;
  if (success) entry.success += 1;
  else entry.fail += 1;

  if (duration !== null) {
    entry.avg_runtime_ms = updateAvg(entry.avg_runtime_ms, duration);
  }

  const taskType = task?.task_type || 'unknown';
  entry.by_task_type[taskType] = entry.by_task_type[taskType] || { total: 0, success: 0 };
  entry.by_task_type[taskType].total += 1;
  if (success) entry.by_task_type[taskType].success += 1;

  const domain = deriveDomain(task?.inputs?.paths_hint || [], task?.inputs?.keywords || []);
  entry.by_domain[domain] = entry.by_domain[domain] || { total: 0, success: 0 };
  entry.by_domain[domain].total += 1;
  if (success) entry.by_domain[domain].success += 1;

  scorecard.agents[agent] = entry;
  await saveScorecard(paths, scorecard);
  return scorecard;
}

function successRate(stats) {
  if (!stats || !stats.total) return 0;
  return stats.success / stats.total;
}

export function pickBestAgent(scorecard, candidates, taskType, domain) {
  let best = null;
  let bestScore = -1;

  for (const agent of candidates) {
    const stats = scorecard.agents?.[agent];
    if (!stats) {
      if (bestScore < 0) {
        best = agent;
        bestScore = 0;
      }
      continue;
    }

    const byType = stats.by_task_type?.[taskType];
    const byDomain = stats.by_domain?.[domain];

    const score = 0.5 * successRate(byType) + 0.5 * successRate(byDomain);
    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }

  return best || candidates[0] || null;
}
