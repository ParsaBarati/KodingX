import fs from 'fs/promises';
import { validateConfig } from './config_validate.js';

export async function assertConfig(paths, config) {
  const issues = validateConfig(config);
  if (issues.length) {
    await fs.writeFile(paths.healthTxt, `CONFIG_INVALID\n${issues.join('\n')}\n`, 'utf-8');
    throw new Error(`Config invalid: ${issues.join(', ')}`);
  }
}
