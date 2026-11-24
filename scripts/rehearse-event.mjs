// Run after npm run build:review. Both servers and all event data are local.
import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { createServer } from 'vite';
import { createReviewServer } from './review-test-server.mjs';

const engine = process.argv[2] ?? 'chromium';
if (!['chromium', 'webkit'].includes(engine)) throw new Error('Use chromium or webkit.');
const { mf } = await createReviewServer();
let server, browser;
try {
  server = await createServer({
    logLevel: 'error',
    define: { 'import.meta.env.VITE_REVIEW_API_URL': JSON.stringify('/rehearsal-api') },
    server: {
      host: '127.0.0.1', port: 0,
      proxy: { '/rehearsal-api': {
        target: (await mf.ready).origin,
        headers: { origin: 'http://127.0.0.1:4176' },
        rewrite: path => path.slice('/rehearsal-api'.length),
      } },
    },
  });
  await server.listen();
  browser = await (engine === 'webkit' ? webkit : chromium).launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  const result = await page.evaluate(async () => {
    const { createReview, joinReview, uploadReviewPhoto, fetchReview, fetchReviewPhoto, deleteReview } = await import('/src/lib/sharedReview.ts');
    const { getPackById } = await import('/src/data/packs/index.ts');
    const { processPhoto } = await import('/src/lib/processPhoto.ts');
    const pack = getPackById('scavenger');
    const source = await (await fetch('/tests/fixtures/apollo-surface.jpg')).blob();
    const photoFile = new File([source], 'lunar-surface.jpg', { type: 'image/jpeg' });
    const leader = await createReview('Local capacity rehearsal', pack.id);
    const invite = { eventId: leader.access.eventId, token: leader.snapshot.joinToken, role: 'join' };
    let originalBytes = 0, previewBytes = 0;
    try {
      for (let i = 0; i < 7; i++) {
        const name = 'Rehearsal team ' + (i + 1);
        const team = await joinReview(invite, name, undefined, 'custom');
        const pathId = team.snapshot.team.pathId;
        for (const category of pack.categories) {
          for (const clue of category.challenges) {
            const imageData = await processPhoto(photoFile, clue, category, pathId, name);
            await uploadReviewPhoto(team.access, {
              id: crypto.randomUUID(), packId: pack.id, challengeId: clue.id, imageData, teamName: name,
              pathId, timestamp: Date.now(),
            });
          }
        }
      }
      const state = await fetchReview(leader.access);
      for (const photo of state.photos) {
        const original = await fetchReviewPhoto(leader.access, photo.id);
        const preview = await fetchReviewPhoto(leader.access, photo.id, true);
        if (preview.size >= original.size || original.size !== photo.bytes) throw new Error('Unexpected download size');
        originalBytes += original.size;
        previewBytes += preview.size;
      }
      return { teams: state.teams.length, photos: state.photos.length, sourceBytes: source.size, originalBytes, previewBytes, ...state.capacity };
    } finally {
      await deleteReview(leader.access);
    }
  });
  assert.equal(result.teams, 7);
  assert.equal(result.photos, 105);
  assert.equal(result.usedPhotos, 105);
  assert.equal(result.usedBytes, result.originalBytes + result.previewBytes);
  assert.equal((await (await mf.getR2Bucket('PHOTOS')).list()).objects.length, 0);
  console.log(JSON.stringify({ engine, ...result }, null, 2));
} finally {
  await browser?.close();
  await server?.close();
  await mf.dispose();
}
