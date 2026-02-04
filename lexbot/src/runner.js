import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ensureDir, writeJsonAtomic } from './io.js';

const COMMAND_TEMPLATES = {
  'claude-code': (taskPath, guidePath, cmdOverride) => ({
    cmd: cmdOverride || 'claude',
    args: ['-p', `Read ${guidePath} then execute task at ${taskPath}`]
  }),
  codex: (taskPath, guidePath, cmdOverride) => ({
    cmd: cmdOverride || 'codex',
    args: ['-q', `Read ${guidePath} then execute task at ${taskPath}`]
  }),
  gemini: (taskPath, guidePath, cmdOverride) => ({
    cmd: cmdOverride || 'gemini',
    args: ['-p', `Read ${guidePath} then execute task at ${taskPath}`]
  })
};

export function availableAgents() {
  return Object.keys(COMMAND_TEMPLATES);
}

export function buildCommand(agent, taskPath, guidePath, config = {}) {
  const fn = COMMAND_TEMPLATES[agent];
  if (!fn) return null;
  const cmdOverride = config.runner?.commandPaths?.[agent];
  const payload = fn(taskPath, guidePath, cmdOverride);
  return {
    ...payload,
    display: [payload.cmd, ...payload.args].join(' ')
  };
}

export async function spawnAgent(paths, taskId, agent, taskPath, guidePath, timeoutMinutes, config = {}) {
  const spec = buildCommand(agent, taskPath, guidePath, config);
  const agentDir = path.join(paths.logsDir, 'agents', agent);
  await ensureDir(agentDir);

  const metaPath = path.join(agentDir, `${taskId}.meta.json`);
  const stdoutPath = path.join(agentDir, `${taskId}.stdout.log`);
  const stderrPath = path.join(agentDir, `${taskId}.stderr.log`);

  const meta = {
    task_id: taskId,
    agent,
    command: spec ? spec.display : null,
    started_at: new Date().toISOString(),
    status: spec ? 'running' : 'missing_template',
    exit_code: null,
    signal: null,
    ended_at: null
  };

  await writeJsonAtomic(metaPath, meta);

  if (!spec) {
    return { spawned: false, metaPath };
  }

  const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' });
  const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' });

  const env = { ...process.env, ...(config.runner?.env || {}) };
  if (config.runner?.path) {
    env.PATH = config.runner.path;
  }

  const child = spawn(spec.cmd, spec.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: paths.repoRoot,
    env
  });

  child.stdout.pipe(stdoutStream);
  child.stderr.pipe(stderrStream);

  const timeoutMs = Math.max(1, timeoutMinutes || 45) * 60 * 1000;
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  }, timeoutMs);

  child.on('close', async (code, signal) => {
    clearTimeout(timer);
    meta.exit_code = code;
    meta.signal = signal;
    meta.ended_at = new Date().toISOString();
    meta.status = code === 0 ? 'exited' : 'failed';
    await writeJsonAtomic(metaPath, meta);
    stdoutStream.end();
    stderrStream.end();
  });

  child.on('error', async (err) => {
    clearTimeout(timer);
    meta.exit_code = null;
    meta.signal = 'spawn_error';
    meta.ended_at = new Date().toISOString();
    meta.status = 'spawn_error';
    meta.error = err.message;
    await writeJsonAtomic(metaPath, meta);
    stdoutStream.end();
    stderrStream.end();
  });

  return { spawned: true, pid: child.pid, metaPath };
}
