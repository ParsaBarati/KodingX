function normalizeList(list = []) {
  return list.map(item => String(item).toLowerCase());
}

function inferTaskType(keywords) {
  if (keywords.some(k => k.includes('doc'))) return 'docs';
  if (keywords.some(k => k.includes('verify') || k.includes('test'))) return 'verify';
  if (keywords.some(k => k.includes('infra') || k.includes('deploy'))) return 'infra';
  if (keywords.some(k => k.includes('data'))) return 'data';
  if (keywords.some(k => k.includes('ops'))) return 'ops';
  return 'code';
}

function inferRiskClass(keywords) {
  if (keywords.some(k => k.includes('doc'))) return 'safe_write';
  if (keywords.some(k => k.includes('delete') || k.includes('drop'))) return 'destructive';
  if (keywords.some(k => k.includes('auth') || k.includes('billing') || k.includes('migration'))) return 'risky_write';
  if (keywords.some(k => k.includes('read') || k.includes('analyze'))) return 'safe_read';
  return 'safe_write';
}

export function heuristicRoute(taskDraft, config) {
  const keywords = normalizeList(taskDraft.keywords || []);
  const task_type = inferTaskType(keywords);
  const risk_class = inferRiskClass(keywords);

  let pipeline_id = 'code_execute_verify';
  if (task_type === 'docs' || task_type === 'verify') pipeline_id = 'safe_read_analysis';

  const primary_agent = taskDraft.primary_agent || 'codex';

  return {
    task_type,
    risk_class,
    pipeline_id,
    primary_agent,
    verify_agent: 'gemini',
    heal_agent: 'codex',
    confidence: 0.9,
    needs_clarification: false,
    clarification_question: null,
    used_selector: false
  };
}

export function shouldUseSelector(heuristicsConfidence, config, riskSignals = []) {
  if (!config.selector?.enabled) return false;
  if (config.mode === 'safe') return true;
  if (heuristicsConfidence < 0.85) return true;
  if (riskSignals.length > 0) return true;
  return false;
}
