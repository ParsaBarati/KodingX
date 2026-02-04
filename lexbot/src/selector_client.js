import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { readJson, writeJsonAtomic, fileExists } from './io.js';
import { withLock } from './locks.js';

function sanitizeText(text, maxLen = 900) {
  const redacted = (text || '').replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '$1:[REDACTED]');
  return redacted.slice(0, maxLen);
}

function hashInput(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

async function logSelector(paths, config, message) {
  if (config.selector?.logEnabled === false) return;
  const line = `${new Date().toISOString()} ${message}\n`;
  try {
    await fs.appendFile(paths.groqLog, line, 'utf-8');
  } catch {
    // best-effort logging
  }
}

const DEFAULT_MODEL_PREFERENCES = {
  SIMPLE_FILTER: ['qwen/qwen3-32b', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
  PROPOSAL: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'groq/compound'],
  MULTI_STEP_PLANNING: ['groq/compound', 'groq/compound-mini', 'llama-3.3-70b-versatile'],
  AGENT_DECISION: ['meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'llama-3.1-8b-instant']
};

const DEFAULT_FALLBACK_MODELS = ['qwen/qwen3-32b', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'];

async function loadCache(cachePath) {
  if (!(await fileExists(cachePath))) {
    await writeJsonAtomic(cachePath, { entries: {} });
    return { entries: {} };
  }
  return readJson(cachePath, { entries: {} });
}

async function saveCache(cachePath, cache) {
  await writeJsonAtomic(cachePath, cache);
}

function normalizeModelList(list) {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function getModelPreferences(config) {
  const selector = config.selector || {};
  if (selector.modelPreferences && Object.keys(selector.modelPreferences).length) {
    return selector.modelPreferences;
  }

  const tierA = normalizeModelList(selector.tierA_models);
  if (tierA.length) {
    return {
      SIMPLE_FILTER: tierA,
      PROPOSAL: tierA,
      MULTI_STEP_PLANNING: tierA,
      AGENT_DECISION: tierA
    };
  }

  return DEFAULT_MODEL_PREFERENCES;
}

function getFallbackModels(config) {
  const selector = config.selector || {};
  if (selector.fallbackModels && selector.fallbackModels.length) {
    return normalizeModelList(selector.fallbackModels);
  }
  const tierB = normalizeModelList(selector.tierB_models);
  if (tierB.length) return tierB;
  return DEFAULT_FALLBACK_MODELS;
}

function estimateTokensFromMessages(messages) {
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content || '').length, 0);
  return Math.max(1, Math.ceil(totalChars / 4));
}

function getRateLimitConfig(config, model) {
  const selector = config.selector || {};
  const rateLimits = selector.rateLimits || {};
  const defaults = rateLimits.default || {};
  const perModel = (rateLimits.perModel || {})[model] || {};

  const legacyRpm = selector.maxCallsPerMinute ?? null;
  const rpm = perModel.rpm ?? defaults.rpm ?? legacyRpm ?? null;
  const rpd = perModel.rpd ?? defaults.rpd ?? null;
  const tpm = perModel.tpm ?? defaults.tpm ?? null;
  const tpd = perModel.tpd ?? defaults.tpd ?? null;

  return { rpm, rpd, tpm, tpd };
}

function normalizeModelState(state, model, now) {
  const entry = state.models[model] || {
    minuteStart: now,
    minuteCount: 0,
    minuteTokens: 0,
    dayStart: now,
    dayCount: 0,
    dayTokens: 0,
    cooldownUntil: 0,
    lastRateLimitAt: null
  };

  if (now - entry.minuteStart >= 60_000) {
    entry.minuteStart = now;
    entry.minuteCount = 0;
    entry.minuteTokens = 0;
  }

  if (now - entry.dayStart >= 86_400_000) {
    entry.dayStart = now;
    entry.dayCount = 0;
    entry.dayTokens = 0;
  }

  return entry;
}

function canUseModel(entry, limits, tokens, now) {
  if (entry.cooldownUntil && entry.cooldownUntil > now) return { ok: false, reason: 'cooldown' };
  if (limits.rpm && entry.minuteCount + 1 > limits.rpm) return { ok: false, reason: 'rpm' };
  if (limits.rpd && entry.dayCount + 1 > limits.rpd) return { ok: false, reason: 'rpd' };
  if (limits.tpm && entry.minuteTokens + tokens > limits.tpm) return { ok: false, reason: 'tpm' };
  if (limits.tpd && entry.dayTokens + tokens > limits.tpd) return { ok: false, reason: 'tpd' };
  return { ok: true, reason: null };
}

function reserveModel(entry, tokens) {
  entry.minuteCount += 1;
  entry.dayCount += 1;
  entry.minuteTokens += tokens;
  entry.dayTokens += tokens;
}

async function updateRateState(paths, updater) {
  const lockPath = path.join(paths.locksDir, 'selector_rate.lock');
  const res = await withLock(lockPath, async () => {
    if (!(await fileExists(paths.selectorRateJson))) {
      await writeJsonAtomic(paths.selectorRateJson, { models: {} });
    }
    const state = await readJson(paths.selectorRateJson, { models: {} });
    const { state: nextState, result } = await updater(state);
    await writeJsonAtomic(paths.selectorRateJson, nextState);
    return result;
  }, { scope: 'selector_rate' });
  if (!res.acquired) return null;
  return res.result;
}

async function selectModel(paths, config, taskType, tokenEstimate) {
  const preferences = getModelPreferences(config);
  const fallbackModels = getFallbackModels(config);
  const preferred = normalizeModelList(preferences[taskType] || preferences.DEFAULT || []);
  const fallback = normalizeModelList(fallbackModels);
  const now = Date.now();

  return updateRateState(paths, (state) => {
    const chooseFrom = (list, source) => {
      for (const model of list) {
        const entry = normalizeModelState(state, model, now);
        const limits = getRateLimitConfig(config, model);
        const check = canUseModel(entry, limits, tokenEstimate, now);
        if (!check.ok) {
          state.models[model] = entry;
          continue;
        }
        reserveModel(entry, tokenEstimate);
        state.models[model] = entry;
        return { model, source };
      }
      return null;
    };

    let chosen = chooseFrom(preferred, 'preferred');
    if (!chosen && fallback.length) {
      chosen = chooseFrom(fallback, 'fallback');
    }

    return { state, result: chosen };
  });
}

async function markModelRateLimited(paths, config, model) {
  const cooldownSeconds = config.selector?.cooldownSeconds || 60;
  const now = Date.now();
  return updateRateState(paths, (state) => {
    const entry = normalizeModelState(state, model, now);
    entry.cooldownUntil = Math.max(entry.cooldownUntil || 0, now + cooldownSeconds * 1000);
    entry.lastRateLimitAt = now;
    state.models[model] = entry;
    return { state, result: true };
  });
}

function inferRouterTaskType(payloadSize) {
  if (payloadSize < 800) return 'SIMPLE_FILTER';
  if (payloadSize < 2000) return 'PROPOSAL';
  return 'MULTI_STEP_PLANNING';
}

function buildSelectorBody(model, input) {
  return {
    model,
    temperature: 0.0,
    messages: [
      {
        role: 'system',
        content: 'You are a router. Return ONLY strict JSON with keys: task_type, risk_class, pipeline_id, primary_agent, verify_agent, heal_agent, confidence, needs_clarification, clarification_question.'
      },
      {
        role: 'user',
        content: JSON.stringify(input)
      }
    ]
  };
}

function buildRankingBody(model, payload) {
  return {
    model,
    temperature: 0.0,
    messages: [
      { role: 'system', content: 'Pick the best candidate. Return ONLY strict JSON: {\"best_index\": number}.' },
      { role: 'user', content: JSON.stringify(payload) }
    ]
  };
}

async function callGroqRaw(apiKey, body, baseUrl) {
  const res = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Groq error ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function isRateLimitError(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  const msg = `${err.message || ''} ${err.body || ''}`;
  return /rate[_ -]?limit/i.test(msg);
}

function parseSelectorJson(raw) {
  try {
    const trimmed = raw.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const snippet = trimmed.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(snippet);
  } catch {
    return null;
  }
}

function isValidValue(value, allowed) {
  return allowed.includes(value);
}

function validateSelectorOutput(output, config) {
  if (!output) return false;
  const allowedTaskTypes = ['code', 'verify', 'docs', 'infra', 'data', 'ops'];
  const allowedRisk = ['safe_read', 'safe_write', 'risky_write', 'destructive'];
  const allowedPipelines = ['code_execute_verify', 'code_execute_only_fast', 'safe_read_analysis', 'risky_two_phase'];
  const agents = (config.availableAgents || []).filter(Boolean);

  if (!isValidValue(output.task_type, allowedTaskTypes)) return false;
  if (!isValidValue(output.risk_class, allowedRisk)) return false;
  if (!isValidValue(output.pipeline_id, allowedPipelines)) return false;
  if (output.primary_agent && agents.length && !agents.includes(output.primary_agent)) return false;
  if (output.verify_agent && agents.length && !agents.includes(output.verify_agent)) return false;
  if (output.heal_agent && agents.length && !agents.includes(output.heal_agent)) return false;

  const confidence = Number(output.confidence);
  if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) return false;

  return true;
}

async function runGroqWithRotation({ paths, config, taskType, tokenEstimate, buildBody, parse }) {
  const selector = config.selector || {};
  const maxAttempts = selector.maxAttempts || 5;
  const baseUrl = selector.baseUrl || 'https://api.groq.com';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const selection = await selectModel(paths, config, taskType, tokenEstimate);
    if (!selection || !selection.model) {
      await logSelector(paths, config, `select task=${taskType} result=none attempt=${attempt + 1}`);
      return null;
    }
    const { model, source } = selection;
    await logSelector(paths, config, `select task=${taskType} model=${model} source=${source} attempt=${attempt + 1}`);

    try {
      const body = buildBody(model);
      const raw = await callGroqRaw(selector.apiKey, body, baseUrl);
      return parse(raw, model);
    } catch (err) {
      if (isRateLimitError(err)) {
        await markModelRateLimited(paths, config, model);
        await logSelector(paths, config, `rate_limit task=${taskType} model=${model} attempt=${attempt + 1}`);
        continue;
      }
      await logSelector(paths, config, `error task=${taskType} model=${model} attempt=${attempt + 1} message=${String(err.message || err)}`.slice(0, 400));
      return null;
    }
  }

  return null;
}

export async function createSelectors(paths, config) {
  const cachePath = paths.selectorCacheJson;
  const cache = await loadCache(cachePath);

  return {
    buildInput: ({ task_id, title, text_hint, keywords, paths_hint, risk_signals, available_agents, mode, policy_flags }) => ({
      task_id,
      title,
      text_hint: sanitizeText(text_hint),
      keywords: (keywords || []).slice(0, 20),
      paths_hint: (paths_hint || []).slice(0, 10),
      risk_signals: (risk_signals || []).slice(0, 10),
      available_agents: (available_agents || []).slice(0, 10),
      mode,
      policy_flags
    }),
    callSelector: async (input) => {
      if (!config.selector?.enabled || !config.selector?.apiKey) return null;

      const key = hashInput(input);
      const now = Date.now();
      const ttl = (config.selector.cacheTtlSeconds || 600) * 1000;

      const cached = cache.entries[key];
      if (cached && now - cached.ts < ttl) {
        return cached.value;
      }

      const bodyForEstimate = buildSelectorBody('estimate', input);
      const tokenEstimate = estimateTokensFromMessages(bodyForEstimate.messages);
      const taskType = 'AGENT_DECISION';

      const result = await runGroqWithRotation({
        paths,
        config,
        taskType,
        tokenEstimate,
        buildBody: (model) => buildSelectorBody(model, input),
        parse: (raw, model) => {
          const parsed = parseSelectorJson(raw);
          if (!parsed) return null;
          if (!validateSelectorOutput(parsed, config)) return null;
          return { ...parsed, model_used: model };
        }
      });

      if (!result) return null;
      cache.entries[key] = { ts: now, value: result };
      await saveCache(cachePath, cache);
      return result;
    },
    rankCandidates: async (candidates) => {
      if (!config.selector?.enabled || !config.selector?.apiKey) return null;
      if (!candidates || candidates.length === 0) return null;

      const payload = {
        candidates: candidates.map((c, idx) => ({
          index: idx,
          title: c.title,
          priority: c.priority,
          origin: c.origin
        }))
      };

      const now = Date.now();
      const ttl = (config.selector.cacheTtlSeconds || 600) * 1000;
      const rankKey = hashInput({ kind: 'rank', payload });
      const cached = cache.entries[rankKey];
      if (cached && now - cached.ts < ttl) {
        const bestIndex = cached.value?.best_index;
        if (typeof bestIndex === 'number' && bestIndex >= 0 && bestIndex < candidates.length) {
          return candidates[bestIndex];
        }
      }

      const bodyForEstimate = buildRankingBody('estimate', payload);
      const tokenEstimate = estimateTokensFromMessages(bodyForEstimate.messages);
      const payloadSize = JSON.stringify(payload).length;
      const taskType = inferRouterTaskType(payloadSize);

      const result = await runGroqWithRotation({
        paths,
        config,
        taskType,
        tokenEstimate,
        buildBody: (model) => buildRankingBody(model, payload),
        parse: (raw, model) => {
          const parsed = parseSelectorJson(raw);
          if (!parsed || typeof parsed.best_index !== 'number') return null;
          if (parsed.best_index < 0 || parsed.best_index >= candidates.length) return null;
          return { best_index: parsed.best_index, model_used: model };
        }
      });

      if (!result) return null;
      cache.entries[rankKey] = { ts: now, value: { best_index: result.best_index } };
      await saveCache(cachePath, cache);
      return candidates[result.best_index];
    }
  };
}
