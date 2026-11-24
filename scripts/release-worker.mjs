import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const command = process.argv[2];
if (!['deploy', 'verify', 'publish'].includes(command)) throw Error('Expected deploy, verify or publish');
const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--',
  'worker/*.ts', 'worker/*.jsonc', 'worker/migrations/*.sql', 'src/data/**/*.ts', 'src/data/*.ts',
  'src/lib/teamNaming.ts', 'src/types/index.ts', 'package-lock.json',
], { encoding: 'utf8' }).split('\0').filter(Boolean);
const hash = createHash('sha256');
for (const path of [...new Set(paths)].sort()) hash.update(path).update('\0').update(await readFile(path)).update('\0');
const build = hash.digest('hex');
if (command === 'publish') {
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw Error('Commit your release changes first.');
  // A dry run also catches a non-fast-forward before changing the Worker.
  execFileSync('git', ['push', '--dry-run', 'all-things-denote', 'HEAD:main'], { stdio: 'inherit' });
}
async function health() {
  const response = await fetch(new URL('/health', process.env.VITE_REVIEW_API_URL), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Health returned ' + response.status);
  return response.json();
}
if (command === 'deploy' || (command === 'publish' && (await health()).workerBuild !== build)) {
  const wrangler = fileURLToPath(new URL('../node_modules/.bin/wrangler', import.meta.url));
  const run = args => execFileSync(wrangler, args, { cwd: new URL('../worker/', import.meta.url), stdio: 'inherit' });
  run(['d1', 'migrations', 'apply', 'scavenger-review', '--remote']);
  run(['deploy', '--var', 'WORKER_BUILD:' + build]);
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { PACKS } = await vite.ssrLoadModule('/src/data/packs/index.ts');
  const packs = Object.fromEntries(PACKS.map(pack => [pack.id, pack.categories.flatMap(group => group.challenges.map(clue => clue.id))]));
  for (let attempt = 1; ; attempt++) {
    try {
      const live = await health();
      if (!live.ok || live.photoProtocol !== 2 || live.workerBuild !== build || JSON.stringify(live.packs) !== JSON.stringify(packs)) {
        throw Error('Production Worker does not match this release. Run npm run release:worker before publishing Pages.');
      }
      console.log('Verified production Worker and all ' + PACKS.length + ' game packs.');
      break;
    } catch (error) {
      if (attempt === 6) throw error;
      await delay(3000);
    }
  }
} finally {
  await vite.close();
}

if (command === 'publish') execFileSync('git', ['push', 'all-things-denote', 'HEAD:main'], { stdio: 'inherit' });
