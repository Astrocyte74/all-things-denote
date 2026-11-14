import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function createReviewServer(port = 0) {
  const mf = new Miniflare(convertV4MiniflareOptions({
    host: '127.0.0.1', port,
    workers: [{
    name: 'review-test',
    modules: true,
    scriptPath: fileURLToPath(new URL('../.wrangler/review-build/index.js', import.meta.url)),
    compatibilityDate: '2026-11-13',
    d1Databases: { DB: 'review-tests' },
    r2Buckets: { PHOTOS: 'review-test-photos' },
    bindings: { ALLOWED_ORIGINS: 'http://127.0.0.1:4176,http://localhost:4175,https://astrocyte74.github.io' },
    }],
  }));
  try {
    await mf.ready;
    const db = await mf.getD1Database('DB');
    const sql = await readFile(new URL('../worker/migrations/0001_shared_review.sql', import.meta.url), 'utf8');
    // D1.exec treats newlines as statement separators; keep trigger bodies intact.
    for (const statement of sql.split(/\n(?=CREATE|PRAGMA)/)) await db.prepare(statement.trim()).run();
    return { mf, db };
  } catch (error) { await mf.dispose(); throw error; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { mf } = await createReviewServer(8788);
  console.log(`Shared review test API ready at ${await mf.ready}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await mf.dispose(); process.exit(0); });
}
