import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Include every emitted chunk and public asset, even screens/art not yet visited.
const directory = path.resolve('dist');
async function list(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? list(path.join(dir, entry.name)) : path.join(dir, entry.name)));
  return nested.flat();
}
const files = (await list(directory)).filter(file => !file.endsWith('/sw.js')).sort();
const template = await readFile('scripts/service-worker.js', 'utf8');
const digests = {};
for (const file of files) {
  const name = path.relative(directory, file).split(path.sep).join('/');
  digests[name] = createHash('sha256').update(await readFile(file)).digest('hex');
}
const manifest = JSON.stringify(digests);
const version = createHash('sha256').update(template).update(manifest).digest('hex').slice(0, 16);
const source = `const VERSION = ${JSON.stringify(version)};\nconst DIGESTS = ${manifest};\n${template}`;
await writeFile(path.join(directory, 'sw.js'), source);
console.log(`Offline cache includes ${files.length} app files.`);
