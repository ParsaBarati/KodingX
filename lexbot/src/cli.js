import { bootstrap } from './bootstrap.js';
import { loadConfig } from './config.js';
import { runDoctor } from './doctor.js';
import { readJson, writeJsonAtomic } from './io.js';

async function main() {
  const cmd = process.argv[2] || 'doctor';
  const repoRoot = process.cwd();
  const paths = await bootstrap(repoRoot);
  const config = await loadConfig(repoRoot);

  if (cmd === 'doctor') {
    const report = await runDoctor(paths, config);
    console.log(report);
    return;
  }

  if (cmd === 'selector-rate') {
    const action = process.argv[3] || 'show';
    if (action === 'reset') {
      await writeJsonAtomic(paths.selectorRateJson, { models: {} });
      console.log('selector rate state reset');
      return;
    }
    if (action === 'show') {
      const state = await readJson(paths.selectorRateJson, { models: {} });
      console.log(JSON.stringify(state, null, 2));
      return;
    }
    console.log('Usage: node lexbot/src/cli.js selector-rate [show|reset]');
    return;
  }

  console.log('Usage: node lexbot/src/cli.js doctor | selector-rate [show|reset]');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
