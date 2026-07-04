// Generate sticker-style art for the Sticker Quest redesign via OpenAI image API.
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('/Users/markdarby/projects/youth/scavenger/.env', 'utf8');
const m = env.match(/OPEN_AI_API_KEY\s*=\s*["']?([^\s"']+)/);
if (!m) { console.error('No OPEN_AI_API_KEY found in .env'); process.exit(1); }
const KEY = m[1];

const OUT = '/Users/markdarby/projects/youth/scavenger/app/public/art';
fs.mkdirSync(OUT, { recursive: true });

const STYLE = `Die-cut sticker illustration, playful flat vector cartoon style, thick white die-cut sticker border around the subject, bold dark indigo (#2E2459) outlines, warm candy colors (amber yellow, coral red, leaf green, sky blue, violet), soft simple cel shading, clean shapes, subtle sparkle accents. Single centered subject, fully transparent background. Absolutely no text, letters, numbers or words.`;

const JOBS = [
  ['mascot',        'A joyful cartoon shopping cart character with big friendly eyes and a huge smile, gleefully holding up a retro instant camera as if taking a photo, tiny sparkle stars around it', 'high'],
  ['trophy',        'A shining golden trophy cup with a small camera emblem on the front, confetti pieces and stars bursting out of the top', 'high'],
  ['camera',        'A cute retro instant camera with a friendly face, a freshly printed photo sliding out of the front slot showing a tiny heart', 'medium'],
  ['cat-faith',     'A glowing vintage lantern with warm amber light rays radiating outward', 'medium'],
  ['cat-choices',   'A brass compass in front of a small wooden signpost with two arrows pointing opposite directions', 'medium'],
  ['cat-love',      'Two gentle open hands holding up a big glowing warm heart', 'medium'],
  ['cat-scriptures','An open book with a small green sprout with leaves growing up out of its pages, tiny sparkles', 'medium'],
  ['cat-plan',      'A winding golden path through rolling green hills leading toward a big radiant rising sun', 'medium'],
  ['bonus-drop',    'A single shiny happy blue water droplet with a soft highlight', 'medium'],
  ['bonus-dove',    'A graceful white dove in flight carrying a tiny olive branch', 'medium'],
  ['bonus-heart',   'A classic glossy red heart with a warm glow and tiny sparkles', 'medium'],
  ['bonus-ring',    'A golden infinity symbol made of flowing ribbon with small sparkles', 'medium'],
];

let model = 'gpt-image-2';

async function gen([name, subject, quality]) {
  const file = path.join(OUT, `${name}.png`);
  if (fs.existsSync(file)) { console.log(`skip ${name} (exists)`); return; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, prompt: `${subject}. ${STYLE}`,
          size: '1024x1024', quality, background: 'transparent', output_format: 'png',
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        // Fall back if the requested model isn't available on this account
        if (model === 'gpt-image-2' && /model|not.?found|does not exist|invalid/i.test(body) && res.status < 500) {
          console.log(`model gpt-image-2 rejected (${res.status}), falling back to gpt-image-1: ${body.slice(0, 200)}`);
          model = 'gpt-image-1';
          attempt--; continue;
        }
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const json = await res.json();
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('no b64_json in response');
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      console.log(`done ${name} (${model}, ${quality})`);
      return;
    } catch (e) {
      console.log(`retry ${name} attempt ${attempt}: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  console.error(`FAILED ${name}`);
}

// Run with limited concurrency
const queue = [...JOBS];
async function worker() { while (queue.length) await gen(queue.shift()); }
await Promise.all([worker(), worker(), worker()]);
console.log('ALL DONE');
