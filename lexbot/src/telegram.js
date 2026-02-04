import fs from 'fs/promises';
import path from 'path';
import { getUpdates, sendMessage } from './telegram_client.js';
import { enqueueIncoming } from './queue.js';
import { nextTaskId } from './ids.js';
import { logJson } from './logger.js';
import { updateCounters, loadCounters } from './counters.js';
import { setPaused } from './status.js';
import { updateConfig } from './config.js';
import { markApproved } from './approval.js';
import { listTaskDirs } from './queue.js';
import { findTaskAgent, updateTaskStatus } from './task_store.js';
import { moveTask } from './queue.js';
import { isDuplicate } from './dedupe.js';
import { runDoctor } from './doctor.js';
import { addGoal, listGoals, markGoalDone } from './goal.js';

function isAdmin(config, chatId) {
  return (config.telegram.adminChatIds || []).map(String).includes(String(chatId));
}

function stripCommand(text, cmd) {
  const prefix = `/${cmd}`;
  if (!text.startsWith(prefix)) return text;
  return text.slice(prefix.length).trim();
}

function parseTaskBody(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let title = '';
  const descriptionLines = [];
  const acceptance = [];
  let inAcceptance = false;
  const pathHints = [];
  let riskHint = '';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('title:')) {
      title = line.slice(6).trim();
      inAcceptance = false;
      continue;
    }
    if (lower.startsWith('acceptance')) {
      inAcceptance = true;
      const rest = line.split(':').slice(1).join(':').trim();
      if (rest) acceptance.push(rest);
      continue;
    }
    if (lower.startsWith('repo') || lower.startsWith('path')) {
      const rest = line.split(':').slice(1).join(':').trim();
      if (rest) pathHints.push(rest);
      continue;
    }
    if (lower.startsWith('risk')) {
      riskHint = line.split(':').slice(1).join(':').trim();
      continue;
    }
    if (inAcceptance) {
      const cleaned = line.replace(/^[-*\[]\s*/g, '').replace(/^\s*\[.?\]\s*/, '').trim();
      if (cleaned) acceptance.push(cleaned);
      continue;
    }
    if (!title) {
      title = line;
    } else {
      descriptionLines.push(line);
    }
  }

  if (!title) title = lines[0] || 'Task';
  const description = descriptionLines.join(' ');

  return { title, description: description || title, acceptance, pathHints, riskHint };
}

async function queueSummary(paths) {
  const buckets = ['incoming', 'ready', 'running', 'blocked', 'done'];
  const lines = [];
  for (const bucket of buckets) {
    const tasks = await listTaskDirs(paths.queueDir, bucket);
    lines.push(`${bucket}: ${tasks.length}`);
  }
  const running = await listTaskDirs(paths.queueDir, 'running');
  if (running.length) {
    lines.push(`running_tasks: ${running.slice(0, 10).join(', ')}`);
  }
  const blocked = await listTaskDirs(paths.queueDir, 'blocked');
  if (blocked.length) {
    lines.push(`blocked_tasks: ${blocked.slice(0, 10).join(', ')}`);
  }
  return lines.join('\n');
}

async function cancelTask(paths, taskId) {
  const buckets = ['incoming', 'ready', 'running', 'blocked'];
  for (const bucket of buckets) {
    const tasks = await listTaskDirs(paths.queueDir, bucket);
    if (tasks.includes(taskId)) {
      try {
        await moveTask(paths.queueDir, taskId, bucket, 'done');
        const agent = await findTaskAgent(paths, taskId);
        if (agent) {
          await updateTaskStatus(paths, agent, taskId, 'failed', 'canceled_by_user');
        }
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

async function tailFile(filePath, maxLines) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.slice(-maxLines).join('\n');
  } catch {
    return null;
  }
}

async function createDraftFromMessage(paths, config, message) {
  const chatId = message.chat?.id;
  const username = message.from?.username || null;
  const text = message.text || '';

  const isCommand = text.startsWith('/');
  const command = isCommand ? text.split(/\s+/)[0].slice(1) : null;

  if (isCommand && !['task', 'status', 'queue', 'pause', 'resume', 'approve', 'cancel', 'logs', 'set', 'doctor', 'goal'].includes(command)) {
    return { action: 'ignore' };
  }

  if (command === 'status') return { action: 'status' };
  if (command === 'queue') return { action: 'queue' };
  if (command === 'pause') return { action: 'pause' };
  if (command === 'resume') return { action: 'resume' };
  if (command === 'approve') {
    const parts = text.split(/\s+/);
    return { action: 'approve', reqId: parts[1], code: parts[2] || '' };
  }
  if (command === 'cancel') {
    const parts = text.split(/\s+/);
    return { action: 'cancel', taskId: parts[1] };
  }
  if (command === 'logs') {
    const parts = text.split(/\s+/);
    return { action: 'logs', taskId: parts[1], lines: Number(parts[2] || 200) };
  }
  if (command === 'set') {
    const parts = text.split(/\s+/);
    return { action: 'set', key: parts[1], value: parts[2] };
  }
  if (command === 'doctor') {
    return { action: 'doctor' };
  }
  if (command === 'goal') {
    const parts = text.split(/\s+/);
    const sub = parts[1] || '';
    if (sub === 'add') {
      const priority = parts[2] && parts[2].match(/^P[0-3]$/) ? parts[2] : 'P2';
      const idx = parts[2] && parts[2].match(/^P[0-3]$/) ? 3 : 2;
      const body = parts.slice(idx).join(' ').trim();
      return { action: 'goal_add', text: body, priority };
    }
    if (sub === 'list') {
      return { action: 'goal_list' };
    }
    if (sub === 'done') {
      const idx = Number(parts[2] || 0);
      return { action: 'goal_done', index: idx };
    }
    return { action: 'ignore' };
  }

  const body = command === 'task' ? stripCommand(text, 'task') : text;
  const parsed = parseTaskBody(body);

  const taskId = await nextTaskId(paths);
  const rawTextPath = path.join(paths.queueDir, 'incoming', taskId, 'raw.txt');

  return {
    action: 'task',
    draft: {
      task_id: taskId,
      created_at: new Date().toISOString(),
      source: 'telegram',
      requestor: { chat_id: chatId, username },
      title: parsed.title,
      description: parsed.description,
      raw_text: body,
      raw_text_ref: rawTextPath,
      repo_root: '.',
      keywords: [],
      paths_hint: parsed.pathHints,
      risk_signals: parsed.riskHint ? [parsed.riskHint] : [],
      acceptance: parsed.acceptance
    }
  };
}

export async function pollTelegram(paths, config) {
  if (!config.telegram?.token) return { updates: [] };

  const token = config.telegram.token;
  const baseUrl = config.telegram.baseUrl || 'https://api.telegram.org';

  const counters = await loadCounters(paths);
  const offset = counters.telegram_offset || 0;
  const updates = await getUpdates(baseUrl, token, offset, 5, 50);

  return { updates, baseUrl, token };
}

export async function handleUpdates(paths, config, updates, send = true) {
  const baseUrl = config.telegram.baseUrl || 'https://api.telegram.org';
  const token = config.telegram.token;

  for (const update of updates) {
    const message = update.message || update.edited_message;
    if (!message || !message.text) continue;

    const chatId = message.chat?.id;
    if (!isAdmin(config, chatId)) {
      await logJson(paths.telegramLog, 'warn', 'unauthorized_chat', { chatId });
      continue;
    }

    const duplicate = await isDuplicate(paths, chatId, message.message_id, message.text, 600);
    if (duplicate) continue;

    const parsed = await createDraftFromMessage(paths, config, message);
    if (parsed.action === 'ignore') continue;

    if (parsed.action === 'status') {
      const summary = await queueSummary(paths);
      if (send) await sendMessage(baseUrl, token, chatId, `lexbot status:\n${summary}`);
      continue;
    }

    if (parsed.action === 'queue') {
      const summary = await queueSummary(paths);
      if (send) await sendMessage(baseUrl, token, chatId, `lexbot queue:\n${summary}`);
      continue;
    }

    if (parsed.action === 'pause') {
      await setPaused(paths, true);
      if (send) await sendMessage(baseUrl, token, chatId, 'lexbot paused');
      continue;
    }

    if (parsed.action === 'resume') {
      await setPaused(paths, false);
      if (send) await sendMessage(baseUrl, token, chatId, 'lexbot resumed');
      continue;
    }

    if (parsed.action === 'set') {
      if (parsed.key === 'concurrency') {
        const value = Number(parsed.value || 0);
        if (Number.isNaN(value) || value <= 0) {
          if (send) await sendMessage(baseUrl, token, chatId, 'invalid concurrency value');
          continue;
        }
        await updateConfig(paths.repoRoot, (cfg) => {
          cfg.globalMaxConcurrency = value;
          return cfg;
        });
        config.globalMaxConcurrency = value;
        if (send) await sendMessage(baseUrl, token, chatId, `concurrency set to ${value}`);
      }
      if (parsed.key === 'mode') {
        const mode = parsed.value === 'fast' ? 'fast' : 'safe';
        await updateConfig(paths.repoRoot, (cfg) => {
          cfg.mode = mode;
          return cfg;
        });
        config.mode = mode;
        if (send) await sendMessage(baseUrl, token, chatId, `mode set to ${mode}`);
      }
      continue;
    }

    if (parsed.action === 'approve') {
      if (!parsed.reqId) {
        if (send) await sendMessage(baseUrl, token, chatId, 'usage: /approve REQ-xxxx CODE');
        continue;
      }
      await markApproved(paths, parsed.reqId, chatId, parsed.code || '');
      if (send) await sendMessage(baseUrl, token, chatId, `approved ${parsed.reqId}`);
      continue;
    }

    if (parsed.action === 'cancel') {
      const ok = await cancelTask(paths, parsed.taskId);
      if (send) await sendMessage(baseUrl, token, chatId, ok ? `canceled ${parsed.taskId}` : `task not found: ${parsed.taskId}`);
      continue;
    }

    if (parsed.action === 'logs') {
      const agent = await findTaskAgent(paths, parsed.taskId);
      if (!agent) {
        if (send) await sendMessage(baseUrl, token, chatId, `no agent found for ${parsed.taskId}`);
        continue;
      }
      const logPath = path.join(paths.logsDir, 'agents', agent, `${parsed.taskId}.stdout.log`);
      const content = await tailFile(logPath, Math.min(parsed.lines || 200, 400));
      if (!content) {
        if (send) await sendMessage(baseUrl, token, chatId, `no logs for ${parsed.taskId}`);
        continue;
      }
      if (send) await sendMessage(baseUrl, token, chatId, content.slice(0, 3500));
      continue;
    }

    if (parsed.action === 'doctor') {
      const report = await runDoctor(paths, config);
      if (send) await sendMessage(baseUrl, token, chatId, report.slice(0, 3500));
      continue;
    }

    if (parsed.action === 'goal_list') {
      const goals = await listGoals(path.join(paths.kodingxDir, 'GOAL.md'));
      const message = goals.length ? goals.join('\n') : 'No goals found.';
      if (send) await sendMessage(baseUrl, token, chatId, message.slice(0, 3500));
      continue;
    }

    if (parsed.action === 'goal_add') {
      if (!parsed.text) {
        if (send) await sendMessage(baseUrl, token, chatId, 'usage: /goal add [P0..P3] <text>');
        continue;
      }
      const line = await addGoal(path.join(paths.kodingxDir, 'GOAL.md'), parsed.text, parsed.priority);
      if (send) await sendMessage(baseUrl, token, chatId, `added: ${line}`.slice(0, 3500));
      continue;
    }

    if (parsed.action === 'goal_done') {
      if (!parsed.index || Number.isNaN(parsed.index)) {
        if (send) await sendMessage(baseUrl, token, chatId, 'usage: /goal done <index>');
        continue;
      }
      const done = await markGoalDone(path.join(paths.kodingxDir, 'GOAL.md'), parsed.index);
      if (!done) {
        if (send) await sendMessage(baseUrl, token, chatId, `goal not found: ${parsed.index}`);
        continue;
      }
      if (send) await sendMessage(baseUrl, token, chatId, `done: ${done}`.slice(0, 3500));
      continue;
    }

    if (parsed.action === 'task') {
      const draft = parsed.draft;
      await enqueueIncoming(paths.queueDir, draft.task_id, draft);
      if (draft.raw_text_ref) {
        await fs.writeFile(draft.raw_text_ref, draft.raw_text, 'utf-8');
      }
      if (send) await sendMessage(baseUrl, token, chatId, `✅ Task created: ${draft.task_id}`);
    }
  }
}

export async function ackTelegramUpdates(paths, updates) {
  if (!updates || updates.length === 0) return;
  await updateCounters(paths, async (counters) => {
    let maxId = counters.telegram_offset || 0;
    for (const update of updates) {
      if (update.update_id >= maxId) maxId = update.update_id + 1;
    }
    return {
      ...counters,
      telegram_offset: maxId,
      last_telegram_poll_ok: new Date().toISOString()
    };
  });
}
