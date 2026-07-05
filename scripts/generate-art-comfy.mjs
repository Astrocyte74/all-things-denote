// Generate sticker-style art for Sticker Quest via the local ComfyUI service
// (pc-comfy-gen) instead of the OpenAI image API.
//
// This is an ALTERNATE to generate-art.mjs — that script (OpenAI) is untouched
// and remains the original path. Use whichever is available:
//
//   node scripts/generate-art.mjs        # OpenAI (gpt-image), needs OPEN_AI_API_KEY
//   node scripts/generate-art-comfy.mjs  # local ComfyUI, needs COMFY_GEN_API_TOKEN
//
// Contract (from services.json -> pc-comfy-gen):
//   POST /jobs        { source, prompt, width, height, img_only }  -> { job_id, status }
//   GET  /jobs/{id}   poll until status === "done"                 -> { result: { rows:[{url}] } }
//   GET  {url}        (relative; prepend host + bearer auth)       -> PNG bytes
//
// Endpoint + auth live in services.json / SERVICES.md. The token is read from
// the same .env files the OpenAI script checks, and from the environment.

import fs from 'node:fs';
import path from 'node:path';

// ── Config ──────────────────────────────────────────────────────────────────
const HOST = process.env.COMFY_GEN_HOST ?? 'http://100.127.43.102:8001';
const SOURCE = process.env.COMFY_GEN_SOURCE ?? 'zimage'; // zimage (fast) | krea2 | sdxl | boogu
const SIZE = 1024;
const OUT = '/Users/markdarby/projects/youth/scavenger/app/public/art';

const ENV_PATHS = [
  '/Users/markdarby/projects/youth/scavenger/.env',
  '/Users/markdarby/projects/GLM/.env',
];

function readToken() {
  if (process.env.COMFY_GEN_API_TOKEN) return process.env.COMFY_GEN_API_TOKEN;
  for (const p of ENV_PATHS) {
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/COMFY_GEN_API_TOKEN\s*=\s*["']?([^\s"']+)/);
    if (m) { console.log(`using COMFY_GEN_API_TOKEN from ${p}`); return m[1]; }
  }
  console.error('No COMFY_GEN_API_TOKEN found in env or .env files.');
  console.error('See SERVICES.md -> pc-comfy-gen. The token is bearer auth on the PC endpoint.');
  process.exit(1);
}

const TOKEN = readToken();
fs.mkdirSync(OUT, { recursive: true });

// ── Shared style + jobs (kept in sync with generate-art.mjs) ─────────────────
const STYLE = `Die-cut sticker illustration, playful flat vector cartoon style, thick white die-cut sticker border around the subject, bold dark indigo (#2E2459) outlines, warm candy colors (amber yellow, coral red, leaf green, sky blue, violet), soft simple cel shading, clean shapes, subtle sparkle accents. Single centered subject, fully transparent background. Absolutely no text, letters, numbers or words.`;

// [name, subject] — quality knob doesn't apply to ComfyUI, so it's dropped.
// Includes the original 12 Scavenger Hunt pieces PLUS the Creation Quest set
// (prefixed c-) so a single run can top up both packs. StickerArt falls back
// to emoji for any name with no PNG, so generating is optional.
const JOBS = [
  // ── Scavenger Hunt (mirrors generate-art.mjs) ──
  ['mascot',        'A joyful cartoon shopping cart character with big friendly eyes and a huge smile, gleefully holding up a retro instant camera as if taking a photo, tiny sparkle stars around it'],
  ['trophy',        'A shining golden trophy cup with a small camera emblem on the front, confetti pieces and stars bursting out of the top'],
  ['camera',        'A cute retro instant camera with a friendly face, a freshly printed photo sliding out of the front slot showing a tiny heart'],
  ['cat-faith',     'A glowing vintage lantern with warm amber light rays radiating outward'],
  ['cat-choices',   'A brass compass in front of a small wooden signpost with two arrows pointing opposite directions'],
  ['cat-love',      'Two gentle open hands holding up a big glowing warm heart'],
  ['cat-scriptures','An open book with a small green sprout with leaves growing up out of its pages, tiny sparkles'],
  ['cat-plan',      'A winding golden path through rolling green hills leading toward a big radiant rising sun'],
  ['bonus-drop',    'A single shiny happy blue water droplet with a soft highlight'],
  ['bonus-dove',    'A graceful white dove in flight carrying a tiny olive branch'],
  ['bonus-heart',   'A classic glossy red heart with a warm glow and tiny sparkles'],
  ['bonus-ring',    'A golden infinity symbol made of flowing ribbon with small sparkles'],
  // ── Creation Quest (nature) ──
  ['c-mascot',      'A cheerful cartoon magnifying glass character with a happy face, examining a tiny bright green sprout growing from a small mound of soil, sparkle stars'],
  ['c-light',       'A beaming golden cartoon sun with friendly eyes and warm radiating light rays, small fluffy cloud beside it'],
  ['c-water',       'A happy shiny blue water droplet character with a friendly face, gentle ripples around its base'],
  ['c-growth',      'A cute green plant sprout with two leaves and a curly shoot growing from a small mound of soil, tiny sparkle'],
  ['c-earth',       'A friendly cartoon mountain peak with a tiny snow cap, small pine tree at its base, warm sunrise behind'],
  ['c-creatures',   'A cute cartoon songbird in flight with a friendly face, a small leafy twig in its beak, tiny sparkles'],
  ['c-trophy',      'A wreath of green leaves and small flowers arranged in a circle with a radiant golden sunburst at its center'],
];

// ── ComfyUI async job runner ────────────────────────────────────────────────
async function authedFetch(urlPath, init = {}) {
  const res = await fetch(urlPath.startsWith('http') ? urlPath : `${HOST}${urlPath}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });
  return res;
}

async function submitJob(prompt) {
  const res = await authedFetch('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: SOURCE,
      prompt,
      width: SIZE,
      height: SIZE,
      img_only: true,
    }),
  });
  if (!res.ok) throw new Error(`submit HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (!json.job_id) throw new Error('no job_id in submit response');
  return json.job_id;
}

async function waitForJob(jobId, { timeoutMs = 180_000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await authedFetch(`/jobs/${jobId}`);
    if (!res.ok) throw new Error(`poll HTTP ${res.status}`);
    const j = await res.json();
    if (j.status === 'done') return j;
    if (j.status === 'error' || j.status === 'failed') {
      throw new Error(`job ${j.status}: ${JSON.stringify(j.error ?? j).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('timed out waiting for job');
}

function firstResultUrl(jobResult) {
  const url = jobResult?.result?.rows?.find((r) => r.url)?.url;
  if (!url) throw new Error('no result row with a url');
  return url; // relative ("/output/..."); fetch via authedFetch
}

async function gen([name, subject]) {
  const file = path.join(OUT, `${name}.png`);
  if (fs.existsSync(file)) { console.log(`skip ${name} (exists)`); return; }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const prompt = `${subject}. ${STYLE}`;
      const jobId = await submitJob(prompt);
      const done = await waitForJob(jobId);
      const imgUrl = firstResultUrl(done);
      const imgRes = await authedFetch(imgUrl);
      if (!imgRes.ok) throw new Error(`image fetch HTTP ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(file, buf);
      console.log(`done ${name} (${SOURCE}, ${(buf.length / 1024).toFixed(0)}KB)`);
      return;
    } catch (e) {
      console.log(`retry ${name} attempt ${attempt}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  console.error(`FAILED ${name}`);
}

// Limited concurrency — ComfyUI queues jobs server-side; 3 in flight is gentle.
const queue = [...JOBS];
async function worker() { while (queue.length) await gen(queue.shift()); }
await Promise.all([worker(), worker(), worker()]);
console.log('ALL DONE');
console.log(`\nNote: ComfyUI does not produce a transparent background. To remove the`);
console.log(`background from these PNGs, see StickerArt's emoji fallback or run a`);
console.log(`matting pass (e.g. rembg). The app works fully without it — StickerArt`);
console.log(`shows the PNG if present, else the emoji.`);
