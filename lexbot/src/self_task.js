import path from 'path';
import { loadGoalCandidates } from './goal_parser.js';
import { createSelectors } from './selector_client.js';
import { enqueueIncoming } from './queue.js';
import { nextTaskId } from './ids.js';
import { updateCounters } from './counters.js';

function scoreCandidate(candidate) {
  let score = candidate.origin === 'goal' ? 100 : 50;
  const priorityMap = { P0: 40, P1: 30, P2: 20, P3: 10 };
  score += priorityMap[candidate.priority] || 0;
  return score;
}

function toDraft(candidate, taskId, repoRoot) {
  return {
    task_id: taskId,
    created_at: new Date().toISOString(),
    source: 'self',
    requestor: { chat_id: 'self', username: 'lexbot' },
    title: candidate.title,
    description: candidate.description || candidate.title,
    raw_text: candidate.description || candidate.title,
    raw_text_ref: null,
    repo_root: repoRoot,
    keywords: candidate.keywords || [],
    paths_hint: candidate.paths_hint || [],
    risk_signals: candidate.risk_signals || [],
    acceptance: candidate.acceptance || [],
    priority: candidate.priority || 'P2',
    pipeline_id: candidate.pipeline_id || null,
    task_type: candidate.task_type || null,
    risk_class: candidate.risk_class || null
  };
}

function maintenanceCandidates(config) {
  const list = [];
  if (!config.selfTask?.maintenance?.enabled) return list;
  const tasks = config.selfTask.maintenance.tasks || [];
  if (tasks.includes('run_tests')) {
    list.push({
      title: 'Run test suite (maintenance)',
      description: 'Run tests and report failures.',
      origin: 'maintenance',
      priority: 'P2',
      task_type: 'verify',
      pipeline_id: 'safe_read_analysis',
      risk_class: 'safe_read'
    });
  }
  if (tasks.includes('run_lint')) {
    list.push({
      title: 'Run lint (maintenance)',
      description: 'Run lint checks and report issues.',
      origin: 'maintenance',
      priority: 'P2',
      task_type: 'verify',
      pipeline_id: 'safe_read_analysis',
      risk_class: 'safe_read'
    });
  }
  return list;
}

async function rankCandidatesWithSelector(paths, config, candidates) {
  const selectors = await createSelectors(paths, config);
  if (!selectors || candidates.length === 0) return null;
  return selectors.rankCandidates(candidates);
}

export async function maybeCreateSelfTask(paths, config, queueCounts) {
  if (!config.selfTask?.enabled) return null;

  const idleMinutes = config.selfTask.minIdleMinutes || 10;
  const maxPerDay = config.selfTask.maxPerDay || 5;

  const counts = await updateCounters(paths, async (counters) => counters);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const lastSelf = counts.result.last_self_task_at ? new Date(counts.result.last_self_task_at) : null;
  const minutesSinceLast = lastSelf ? (now - lastSelf) / 60000 : Infinity;

  if (minutesSinceLast < idleMinutes) return null;

  if (counts.result.self_task_day !== today) {
    await updateCounters(paths, async (counters) => ({
      ...counters,
      self_task_day: today,
      self_task_count_day: 0
    }));
  }

  const refreshed = await updateCounters(paths, async (counters) => counters);
  if (refreshed.result.self_task_count_day >= maxPerDay) return null;

  const totalQueued = queueCounts.incoming + queueCounts.ready + queueCounts.running + queueCounts.blocked;
  if (totalQueued > 0) return null;

  const goalPath = path.join(paths.kodingxDir, 'GOAL.md');
  const goalCandidates = await loadGoalCandidates(goalPath);
  const maintCandidates = maintenanceCandidates(config);

  let candidates = [...goalCandidates, ...maintCandidates];
  const allowedPipelines = config.selfTask?.allowPipelines || [];
  if (allowedPipelines.length > 0) {
    candidates = candidates.filter(c => !c.pipeline_id || allowedPipelines.includes(c.pipeline_id));
  }
  if (candidates.length === 0) return null;

  candidates = candidates.map(c => ({
    ...c,
    score: scoreCandidate(c)
  }));

  candidates.sort((a, b) => b.score - a.score);

  let chosen = candidates[0];
  if (config.selfTask.useSelectorRanking && candidates.length > 1) {
    const ranked = await rankCandidatesWithSelector(paths, config, candidates.slice(0, 10));
    if (ranked) chosen = ranked;
  }

  if (!chosen) return null;

  const taskId = await nextTaskId(paths);
  const draft = toDraft(chosen, taskId, paths.repoRoot);
  await enqueueIncoming(paths.queueDir, taskId, draft);

  await updateCounters(paths, async (counters) => ({
    ...counters,
    last_self_task_at: new Date().toISOString(),
    self_task_count_day: (counters.self_task_count_day || 0) + 1,
    self_task_day: today
  }));

  return draft;
}
