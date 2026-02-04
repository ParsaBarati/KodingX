import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultConfig } from '../src/config.js';
import { validateConfig } from '../src/config_validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2] || path.join(process.cwd(), '.kodingx', 'lexbot', 'config.json');

async function main() {
  let config = defaultConfig();
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read config: ${configPath}`);
    process.exit(1);
  }

  const issues = validateConfig(config);
  if (issues.length) {
    console.error(`Config invalid:\n- ${issues.join('\n- ')}`);
    process.exit(1);
  }

  console.log('Config OK');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
