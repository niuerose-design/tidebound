import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const config = 'dist/server/wrangler.json';
if (!existsSync(config)) throw new Error('Run pnpm build before pnpm db:local.');
for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
  const result = spawnSync(process.execPath, [
    '--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
    'd1', 'execute', 'DB', '--local', '--config', config,
    '--persist-to', '.wrangler/state', '--file', `drizzle/${file}`,
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
