import path from 'path';

export function getPaths(repoRoot) {
  const kodingxDir = path.join(repoRoot, '.kodingx');
  const stateDir = path.join(kodingxDir, 'state');
  const queueDir = path.join(kodingxDir, 'queue');
  const inboxDir = path.join(kodingxDir, 'inbox');
  const outboxDir = path.join(kodingxDir, 'outbox');
  const approvalDir = path.join(kodingxDir, 'approval');
  const locksDir = path.join(kodingxDir, 'locks');
  const logsDir = path.join(kodingxDir, 'logs');
  const lexbotDir = path.join(kodingxDir, 'lexbot');
  const journalDir = path.join(kodingxDir, 'journal');

  return {
    repoRoot,
    kodingxDir,
    stateDir,
    queueDir,
    inboxDir,
    outboxDir,
    approvalDir,
    locksDir,
    logsDir,
    lexbotDir,
    journalDir,
    stateJson: path.join(stateDir, 'STATE.json'),
    stateMd: path.join(stateDir, 'STATE.md'),
    taskBoardMd: path.join(stateDir, 'TASK_BOARD.md'),
    indexJson: path.join(stateDir, 'INDEX.json'),
    heartbeatJson: path.join(lexbotDir, 'heartbeat.json'),
    configJson: path.join(lexbotDir, 'config.json'),
    countersJson: path.join(lexbotDir, 'counters.json'),
    selectorCacheJson: path.join(lexbotDir, 'selector_cache.json'),
    selectorRateJson: path.join(lexbotDir, 'selector_rate.json'),
    statusJson: path.join(lexbotDir, 'status.json'),
    scorecardJson: path.join(lexbotDir, 'agent_scorecard.json'),
    dedupeJson: path.join(lexbotDir, 'dedupe.json'),
    healthTxt: path.join(lexbotDir, 'health.txt'),
    eventsNdjson: path.join(journalDir, 'events.ndjson'),
    lexbotLog: path.join(logsDir, 'lexbot', 'lexbot.log'),
    telegramLog: path.join(logsDir, 'lexbot', 'telegram.log'),
    groqLog: path.join(logsDir, 'lexbot', 'groq.log')
  };
}

export function inboxTaskDir(inboxDir, agent, taskId) {
  return path.join(inboxDir, agent, taskId);
}

export function outboxTaskDir(outboxDir, taskId) {
  return path.join(outboxDir, taskId);
}
