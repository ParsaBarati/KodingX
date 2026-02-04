import { readJson, writeJsonAtomic, fileExists } from './io.js';
import { getPaths } from './paths.js';

export function defaultConfig() {
  return {
    globalMaxConcurrency: 4,
    perAgentMaxConcurrency: {
      codex: 2,
      'claude-code': 1,
      gemini: 2
    },
    mode: 'safe',
    selector: {
      enabled: true,
      apiKey: '',
      baseUrl: 'https://api.groq.com',
      maxCallsPerMinute: 30,
      maxAttempts: 5,
      cooldownSeconds: 60,
      logEnabled: true,
      tierA_models: [],
      tierB_models: [],
      modelPreferences: {
        SIMPLE_FILTER: ['qwen/qwen3-32b', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
        PROPOSAL: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'groq/compound'],
        MULTI_STEP_PLANNING: ['groq/compound', 'groq/compound-mini', 'llama-3.3-70b-versatile'],
        AGENT_DECISION: ['meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'llama-3.1-8b-instant']
      },
      fallbackModels: ['qwen/qwen3-32b', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
      rateLimits: {
        default: {
          rpm: 30,
          rpd: null,
          tpm: null,
          tpd: null
        },
        perModel: {}
      },
      cacheTtlSeconds: 600
    },
    selfTask: {
      enabled: true,
      minIdleMinutes: 10,
      maxPerDay: 5,
      allowPipelines: ['safe_read_analysis', 'code_execute_verify'],
      maintenance: {
        enabled: true,
        tasks: ['run_tests', 'run_lint']
      },
      useSelectorRanking: false
    },
    approval: {
      requiredRiskClasses: ['risky_write', 'destructive']
    },
    locks: {
      ttlSeconds: 3600
    },
    safeRead: {
      allowPaths: ['.kodingx/outbox/', '.kodingx/logs/', 'coverage/', 'dist/', 'build/']
    },
    runner: {
      commandPaths: {
        'claude-code': 'claude',
        'codex': 'codex',
        'gemini': 'gemini'
      },
      env: {},
      path: ''
    },
    timeouts: {
      defaultMinutes: 45,
      byType: {
        code: 45,
        verify: 30,
        docs: 20,
        infra: 45,
        data: 30,
        ops: 30
      }
    },
    telegram: {
      token: '',
      baseUrl: 'https://api.telegram.org',
      pollIntervalMs: 2000,
      adminChatIds: []
    },
    notifications: {
      enabled: true,
      maxLen: 3000
    }
  };
}

export async function loadConfig(repoRoot) {
  const paths = getPaths(repoRoot);
  const exists = await fileExists(paths.configJson);
  if (!exists) {
    const cfg = defaultConfig();
    await writeJsonAtomic(paths.configJson, cfg);
    return cfg;
  }
  const cfg = await readJson(paths.configJson, defaultConfig());
  return cfg;
}

export async function updateConfig(repoRoot, updater) {
  const paths = getPaths(repoRoot);
  const current = await readJson(paths.configJson, defaultConfig());
  const next = await updater({ ...current });
  await writeJsonAtomic(paths.configJson, next);
  return next;
}
