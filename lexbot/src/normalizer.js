import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { heuristicRoute, shouldUseSelector } from './selector.js';
import { createSelectors } from './selector_client.js';
import { ensureDir, writeJsonAtomic } from './io.js';
import { inboxTaskDir } from './paths.js';
import { loadScorecard, pickBestAgent } from './scorecard.js';
import { deriveDomain } from './domain.js';

function extractPaths(text) {
  if (!text) return [];
  const pathRegex = /\b[\w./-]+\.(js|ts|py|go|rs|md|json|yaml|yml|toml|sql)\b/g;
  const matches = text.match(pathRegex) || [];
  const unique = [...new Set(matches.map(m => m.trim()))];
  return unique.slice(0, 10);
}

function extractKeywords(text) {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4);
  const unique = [...new Set(tokens)];
  return unique.slice(0, 20);
}

function extractRiskSignals(text) {
  const signals = [];
  const lowered = (text || '').toLowerCase();
  const riskMap = ['auth', 'billing', 'payment', 'invoice', 'migration', 'delete', 'drop', 'prod', 'security'];
  for (const risk of riskMap) {
    if (lowered.includes(risk)) signals.push(risk);
  }
  return signals;
}

function deriveConcurrencyGroup(pathsHint, riskSignals) {
  if (riskSignals.includes('auth')) return 'auth';
  if (riskSignals.includes('billing') || riskSignals.includes('payment')) return 'billing';
  if (riskSignals.includes('migration')) return 'migration';
  const path = pathsHint[0] || '';
  if (path.startsWith('src/')) return 'src';
  return 'default';
}

function buildTaskMd(task) {
  const acceptance = task.acceptance || [];
  return [
    '# Task',
    '',
    '## Context',
    task.description || '',
    '',
    '## Objective',
    task.title || '',
    '',
    '## Scope',
    (task.inputs.paths_hint || []).map(p => `- ${p}`).join('\n') || '- TBD',
    '',
    '## Non-goals',
    '- TBD',
    '',
    '## Acceptance Criteria',
    acceptance.length ? acceptance.map(a => `- [ ] ${a}`).join('\n') : '- [ ] TBD',
    '',
    '## Pipeline',
    `- ${task.pipeline_id || 'code_execute_verify'}`,
    '',
    '## Read-only Policy',
    task.pipeline_id === 'safe_read_analysis' ? '- No code changes. Read-only analysis only.' : '- Normal changes allowed.',
    '',
    '## Output Requirements',
    '- Write report.json and report.md to outbox',
    ''
  ].join('\n');
}

export async function normalizeDraft(draft, config, paths) {
  const text = draft.raw_text || '';
  const pathsHint = draft.paths_hint?.length ? draft.paths_hint : extractPaths(text);
  const keywords = draft.keywords?.length ? draft.keywords : extractKeywords(text);
  const riskSignals = draft.risk_signals?.length ? draft.risk_signals : extractRiskSignals(text);
  const domain = deriveDomain(pathsHint, keywords);
  const scorecard = await loadScorecard(paths);

  const heuristics = heuristicRoute({
    keywords,
    primary_agent: draft.primary_agent
  }, config);

  let route = heuristics;
  let selectorMeta = { used: false };

  if (shouldUseSelector(heuristics.confidence, config, riskSignals)) {
    const selectors = await createSelectors(paths, config);
    const input = selectors.buildInput({
      task_id: draft.task_id,
      title: draft.title,
      text_hint: text,
      keywords,
      paths_hint: pathsHint,
      risk_signals: riskSignals,
      available_agents: config.availableAgents || [],
      mode: config.mode,
      policy_flags: {
        no_destructive_without_approval: true
      }
    });

    const selection = await selectors.callSelector(input);
    if (selection) {
      route = {
        ...heuristics,
        ...selection,
        used_selector: true
      };
      selectorMeta = { used: true, model: selection.model_used || null };
    }
  }

  if (draft.task_type) route.task_type = draft.task_type;
  if (draft.pipeline_id) route.pipeline_id = draft.pipeline_id;
  if (draft.risk_class) route.risk_class = draft.risk_class;

  const candidates = (config.availableAgents || []).filter(a => a !== 'gemini');
  const selectedAgent = draft.primary_agent || pickBestAgent(scorecard, candidates, route.task_type, domain) || 'codex';

  const task = {
    task_id: draft.task_id,
    parent_task_id: draft.parent_task_id || null,
    created_at: new Date().toISOString(),
    source: draft.source || 'telegram',
    requestor: draft.requestor,
    title: draft.title,
    description: draft.description,
    raw_text_ref: draft.raw_text_ref || null,
    repo_root: draft.repo_root || '.',
    task_type: route.task_type,
    risk_class: route.risk_class,
    pipeline_id: route.pipeline_id,
    priority: draft.priority || 'P1',
    constraints: {
      no_destructive_without_approval: true,
      max_time_minutes: config.timeouts?.byType?.[route.task_type] || config.timeouts?.defaultMinutes || 45,
      max_retries: 2
    },
    inputs: {
      paths_hint: pathsHint,
      keywords,
      refs: (pathsHint || []).map(p => ({ kind: 'path', path: p }))
    },
    dispatch: {
      primary_agent: route.primary_agent || selectedAgent,
      verify_agent: route.verify_agent || 'gemini',
      heal_agent: route.heal_agent || 'codex',
      concurrency_group: deriveConcurrencyGroup(pathsHint, riskSignals)
    },
    status: {
      state: 'queued',
      attempt: 0,
      last_error_signature: null,
      pipeline: {
        stage: 'execute',
        verify_task_id: null,
        heal_task_id: null,
        parent_task_id: draft.parent_task_id || null
      }
    },
    acceptance: draft.acceptance || [],
    selector_meta: selectorMeta
  };

  const agent = task.dispatch.primary_agent;
  const taskDir = inboxTaskDir(paths.inboxDir, agent, task.task_id);
  await ensureDir(taskDir);

  await writeJsonAtomic(path.join(taskDir, 'task.json'), task);
  await fs.writeFile(path.join(taskDir, 'task.md'), buildTaskMd(task), 'utf-8');
  await writeJsonAtomic(path.join(taskDir, 'context.refs.json'), { refs: task.inputs.refs });

  return { task, agent };
}

export function hashSelectorInput(input) {
  const payload = JSON.stringify(input);
  return crypto.createHash('sha256').update(payload).digest('hex');
}
