// Convert sticker masters to the WebP files the app ships.
//
//   art-src/<name>.png       masters, 1024 px; kept out of public/ and never downloaded
//   public/art/<name>.webp   512 px, loaded by StickerArt and the game-library pack art
//
// Needs libwebp's cwebp (brew install webp). From app/:
//
//   node scripts/optimize-art.mjs                  # masters with no WebP, or a newer master
//   node scripts/optimize-art.mjs trophy c-light   # named masters
//   node scripts/optimize-art.mjs --all            # rebuild every WebP
import { execFile } from 'node:child_process';
import { readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const ART_SRC = path.join(ROOT, 'art-src');
export const PUBLIC_ART = path.join(ROOT, 'public', 'art');
const SIZE = 512; // The largest sticker is 160 CSS px, so 512 stays crisp on 3x screens.
const QUALITY = 80; // Flat, cel-shaded art shows no loss against the master at 3x zoom.
const run = promisify(execFile);

function pngSize(buffer) {
  return buffer.length >= 24 && buffer.toString('latin1', 1, 4) === 'PNG'
    ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    : null;
}

export async function optimizeArt(names) {
  let before = 0, after = 0;
  for (const name of names) {
    const master = path.join(ART_SRC, `${name}.png`);
    const output = path.join(PUBLIC_ART, `${name}.webp`);
    const temporary = `${output}.${randomUUID()}.tmp`;
    const input = await readFile(master);
    const size = pngSize(input);
    if (!size) throw new Error(`${name}.png is not a PNG.`);
    // Keep the aspect ratio and never enlarge a smaller master.
    const resize = Math.max(size.width, size.height) <= SIZE ? []
      : size.width >= size.height ? ['-resize', String(SIZE), '0'] : ['-resize', '0', String(SIZE)];
    try {
      await run('cwebp', ['-quiet', '-mt', '-m', '6', '-sharp_yuv', '-q', String(QUALITY), ...resize, master, '-o', temporary]);
      await rename(temporary, output);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('cwebp was not found. Install libwebp (brew install webp) and retry.');
      throw error;
    } finally {
      await rm(temporary, { force: true });
    }
    const bytes = (await stat(output)).size;
    before += input.length;
    after += bytes;
    console.log(`${name}: ${Math.round(input.length / 1024)} KB PNG ${size.width}x${size.height} -> ${Math.round(bytes / 1024)} KB WebP`);
  }
  console.log(`${names.length} stickers: ${Math.round(before / 1024)} KB PNG -> ${Math.round(after / 1024)} KB WebP`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const requested = args.filter(arg => !arg.startsWith('--'));
  try {
    const masters = (await readdir(ART_SRC)).filter(file => file.endsWith('.png')).map(file => file.slice(0, -4)).sort();
    const unknown = requested.filter(name => !masters.includes(name));
    if (unknown.length) throw new Error(`No master in art-src/ for: ${unknown.join(', ')}`);
    const chosen = [];
    for (const name of masters) {
      if (requested.includes(name) || args.includes('--all')) { chosen.push(name); continue; }
      if (requested.length) continue;
      const output = await stat(path.join(PUBLIC_ART, `${name}.webp`)).catch(() => null);
      if (!output || output.mtimeMs < (await stat(path.join(ART_SRC, `${name}.png`))).mtimeMs) chosen.push(name);
    }
    if (!chosen.length) console.log('Every master already has an up-to-date WebP in public/art/. Use --all to rebuild.');
    else await optimizeArt(chosen);
    // StickerArt only reads .webp, so a PNG here would be downloaded without ever being shown.
    const stray = (await readdir(PUBLIC_ART)).filter(file => file.endsWith('.png'));
    if (stray.length) console.warn(`public/art/ has PNGs the app does not load: ${stray.join(', ')}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
