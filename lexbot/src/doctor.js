import fs from 'fs/promises';
import { execSync } from 'child_process';
import { validateConfig } from './config_validate.js';

function which(cmd) {
  try {
    const out = execSync(`command -v ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

export async function runDoctor(paths, config) {
  const lines = [];
  lines.push(`node: ${process.version}`);
  lines.push(`node_exec: ${process.execPath}`);

  const tools = ['claude', 'codex', 'gemini'];
  for (const tool of tools) {
    const location = which(tool);
    lines.push(`${tool}: ${location || 'NOT FOUND'}`);
  }

  try {
    await fs.access(paths.kodingxDir);
    lines.push(`kodingx: writable`);
  } catch {
    lines.push(`kodingx: not writable`);
  }

  const issues = validateConfig(config);
  if (issues.length) {
    lines.push('config_issues:');
    for (const issue of issues) {
      lines.push(`- ${issue}`);
    }
  } else {
    lines.push('config_ok: true');
  }

  return lines.join('\n');
}
