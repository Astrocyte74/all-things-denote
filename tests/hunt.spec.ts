import { openChecklist, openMoreOptions } from './hunt-controls';
import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { scavengerPack } from '../src/data/packs/scavengerPack';
import { creationPack } from '../src/data/packs/creationPack';

const image = { name: 'discovery.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="gold"/></svg>') };
const ids = scavengerPack.categories.flatMap(category => category.challenges.map(challenge => challenge.id));

async function start(page: Page, completed: string[] = []) {
  await page.goto('./');
  await expect(page.getByText('Ready for offline hunting', { exact: false })).toBeVisible();
  await page.evaluate(({ completed }) => {
    localStorage.setItem('pathByPack', JSON.stringify({ scavenger: 'A' }));
    localStorage.setItem('startedByPack', JSON.stringify({ scavenger: true }));
    localStorage.setItem('huntScreen', JSON.stringify('hunt'));
    localStorage.setItem('completedChallenges:scavenger', JSON.stringify(completed));
  }, { completed });
  await page.reload();
}

async function photoCount(page: Page, packId = 'scavenger') {
  return page.evaluate(pack => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('ScavengerHuntPhotos');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('photos');
      const count = tx.objectStore('photos').index('packId').count(pack);
      count.onsuccess = () => resolve(count.result);
      tx.oncomplete = () => db.close();
    };
  }), packId);
}

test('refresh and Continue restore the viewed challenge and saved progress', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await page.getByRole('button', { name: 'Next clue', exact: true }).last().click();
  const title = await page.locator('h3').first().textContent();
  await page.reload();
  await expect(page.locator('h3').first()).toHaveText(title!);
  await expect(page.getByRole('status', { name: '1 of 15 clues done' })).toBeAttached();
  // Checklist and Home are explicit menu destinations.
  await openChecklist(page);
  await openMoreOptions(page);
  await page.getByRole('menuitem', { name: 'Back to home' }).click();await page.getByRole('button',{name:'Go to home',exact:true}).click();
  await page.getByRole('button', { name: 'Continue Scavenger Hunt' }).click();
  await expect(page.locator('h3').first()).toHaveText(title!);
  await page.getByRole('button', { name: 'Next clue', exact: true }).last().click();
  const current = await page.locator('h3').first().textContent();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Back to current clue', exact: true }).click();
  await page.reload();
  await expect(page.locator('h3').first()).toHaveText(current!);
});

test('first-time setup and pre-existing hunts both support Continue', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Play on this device/ }).click();
  await page.getByRole('button', { name: 'Scavenger Hunt', exact: true }).click();
  await page.getByRole('button', { name: 'Start the hunt', exact: true }).click();
  await page.getByRole('button', { name: /Path A/ }).first().click();
  await page.getByRole('button', { name: /Let's go on Path A/ }).click();
  await page.getByRole('button', { name: 'Start the hunt on Path A' }).click();
  await expect(page.getByRole('button', { name: 'Take photo for this clue' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Take photo for this clue' })).toBeVisible();
  // Simulate storage from the previous app version, which had no session keys.
  await page.evaluate(firstId => {
    localStorage.removeItem('huntScreen');
    localStorage.removeItem('startedByPack');
    localStorage.setItem('completedChallenges:scavenger', JSON.stringify([firstId]));
  }, ids[0]);
  await page.reload();
  await page.getByRole('button', { name: 'Continue Scavenger Hunt' }).click();
  await expect(page.getByRole('status', { name: '1 of 15 clues done' })).toBeAttached();
});

test('invalid photos offer recovery without completing a challenge', async ({ page }) => {
  await start(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('Photo not saved');
  await page.locator('input[type=file]').setInputFiles(image);
  await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
  expect(await photoCount(page)).toBe(1);
});

test('retaking and deleting a gallery photo updates the current clue without navigating', async ({ page }) => {
  await start(page);
  await page.getByLabel('Take photo', { exact: true }).setInputFiles(image);
  const shot = page.getByTitle('View photo 1', { exact: true });
  await expect(shot.locator('img')).toHaveAttribute('src', /^data:image/);
  const original = await shot.locator('img').getAttribute('src');
  await shot.click();
  await page.getByRole('button', { name: /View photo for .* full screen/ }).click();
  await page.getByRole('button', { name: 'Retake photo', exact: true }).click();
  await page.getByLabel('Retake photo file', { exact: true }).setInputFiles({
    ...image, buffer: Buffer.from(image.buffer.toString().replace('gold', 'blue')),
  });
  await expect(page.getByText('Photo replaced on this device.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Close photo gallery' }).click();
  await expect(shot.locator('img')).toHaveAttribute('src', /^data:image/);
  await expect(shot.locator('img')).not.toHaveAttribute('src', original!);
  await shot.click();
  await page.getByRole('button', { name: 'Delete photo #1', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^📸 Photo Gallery/ })).toHaveCount(0);
  await expect(shot).toHaveCount(0);
  await expect(page.getByText('Your shots', { exact: true })).toHaveCount(0);
});

test('upgrading saved photos keeps games and teams separate and reads originals only for visible clues', async ({ page }) => {
  await page.goto('./manifest.json');
  await page.evaluate(({ ids }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('ScavengerHuntPhotos', 2);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('photos', { keyPath: 'id' });
      for (const key of ['challengeId', 'timestamp']) store.createIndex(key, key);
      const row = { challengeId: ids[0], timestamp: 0, imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=' };
      store.put({ ...row, id: 'my-first' });
      store.put({ ...row, id: 'other-team', huntId: 'event:one:team' });
      store.put({ ...row, id: 'other-game', packId: 'creation' });
      for (let n = 0; n < 80; n++) store.put({ ...row, id: 'later-' + n, challengeId: ids[1] });
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  }), { ids });
  await page.addInitScript(() => {
    const keys: unknown[] = [];
    Object.assign(window, { originalPhotoReads: keys });
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'photos') keys.push(key);
      return get.call(this, key);
    };
    for (const source of [IDBObjectStore.prototype, IDBIndex.prototype]) {
      const all = source.getAll;
      source.getAll = function (...args: Parameters<IDBObjectStore['getAll']>) {
        if (('objectStore' in this ? this.objectStore.name : this.name) === 'photos') keys.push('bulk');
        return all.apply(this, args);
      };
    }
  });
  await start(page);
  await expect(page.getByTitle('View photo 1', { exact: true }).locator('img')).toHaveAttribute('src', /^data:image/);
  await expect(page.getByTitle('View photo 2', { exact: true })).toHaveCount(0);
  const reads = () => page.evaluate(() => (window as unknown as { originalPhotoReads: string[] }).originalPhotoReads);
  expect(Array.from(new Set(await reads()))).toEqual(['my-first']);
  await page.getByRole('button', { name: 'Next clue', exact: true }).click();
  await expect(page.getByRole('button', { name: '+76', exact: true })).toBeVisible();
  await page.getByTitle('View photo 4', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByTitle('View photo 4', { exact: true }).locator('img')).toHaveAttribute('src', /^data:image/);
  expect(new Set(await reads()).size).toBeLessThanOrEqual(5);
  expect(await reads()).not.toContain('bulk');
});

test('a transaction abort never marks a challenge complete; retry saves once', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = original.apply(this, args);
      IDBObjectStore.prototype.put = original;
      // Abort after request success, before the transaction commits.
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
  });
  await page.locator('input[type=file]').setInputFiles(image);
  await expect(page.getByRole('alert')).toContainText('Photo not saved');
  expect(await photoCount(page)).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('completedChallenges:scavenger')!))).toEqual([]);
  await page.getByRole('button', { name: 'Retry saving photo' }).click();
  await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
  expect(await photoCount(page)).toBe(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('finish screen exports every photo for this pack, with unique labeled JPEGs', async ({ page }, testInfo) => {
  await start(page, ids.slice(0, -1));
  await page.locator('input[type=file]').setInputFiles(image);
  await expect(page.getByRole('heading', { name: 'Hunt complete!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your team’s photos (1)' })).toBeVisible();
  // Seed an additional keepsake of the same clue and a separate game.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('ScavengerHuntPhotos');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['photos', 'photoSummaries'], 'readwrite');
      for (const name of ['photos', 'photoSummaries']) {
        const store = tx.objectStore(name);
        const rows = store.getAll();
        rows.onsuccess = () => {
          const photo = rows.result[0];
          store.put({ ...photo, id: 'duplicate', timestamp: photo.timestamp + 1 });
          store.put({ ...photo, id: 'other-pack', packId: 'creation' });
        };
      }
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your team’s photos (2)' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save all photos', exact: true }).click();
  const download = await downloadPromise;
  const files = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(files)).toHaveLength(2);
  for (const [name, bytes] of Object.entries(files)) {
    expect(name).toMatch(/^15-.*\.jpg$/);
    expect([...bytes.slice(0, 2)]).toEqual([255, 216]);
  }
  await page.getByRole('button', { name: /^View photo for/ }).first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('img[loading=lazy]').evaluateAll(images => images.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('finish-photos-mobile.png'), animations: 'disabled' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('finish-mobile.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Review clues & connections' }).click();
  await expect(page.getByRole('heading', { name: 'Hunt checklist' })).toBeVisible();
  await page.getByRole('button', { name: 'See hunt celebration & photos' }).click();
  await expect(page.getByRole('heading', { name: 'Hunt complete!' })).toBeVisible();
});

test('complete hunt without photos still offers review and discussion', async ({ page }) => {
  await start(page, ids);
  await expect(page.getByRole('heading', { name: 'Hunt complete!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save all photos', exact: true })).toBeDisabled();
  await expect(page.getByText('You completed the hunt without photos.', { exact: false })).toBeVisible();
});

test('unvisited pack works offline, including photos, fonts, and artwork', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByText('Ready for offline hunting', { exact: false })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => {
    localStorage.setItem('activePackId', JSON.stringify('creation'));
    localStorage.setItem('pathByPack', JSON.stringify({ creation: 'A' }));
    localStorage.setItem('huntScreen', JSON.stringify('hunt'));
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Take photo for this clue' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(image);
  await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
  expect(await photoCount(page, 'creation')).toBe(1);
  await page.getByTitle('View photo 1', { exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Lilita One"'))).toBe(true);
});

test('reset keeps photos; start fresh deletes only the active pack', async ({ page }) => {
  await start(page, ids.slice(0, -1));
  await page.locator('input[type=file]').setInputFiles(image);
  await expect(page.getByRole('heading', { name: 'Hunt complete!' })).toBeVisible();
  await openMoreOptions(page);
  await page.getByRole('menuitem', { name: 'Start over' }).click();
  await page.getByRole('button', { name: /^Reset progress/ }).click();
  expect(await photoCount(page)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:scavenger'))).toBeNull();
  await page.getByRole('button', { name: /Let's go on Path A/ }).click();
  await page.getByRole('button', { name: 'Start the hunt on Path A' }).click();
  await expect(page.getByRole('button', { name: 'Take photo for this clue' })).toBeVisible();
  await openChecklist(page);
  await page.evaluate(({ other }) => new Promise<void>(resolve => {
    const request = indexedDB.open('ScavengerHuntPhotos');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ id: 'keep-other', challengeId: other, packId: 'creation', imageData: '', timestamp: 0 });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), { other: creationPack.categories[0].challenges[0].id });
  await openMoreOptions(page);
  await page.getByRole('menuitem', { name: 'Start over' }).click();
  await page.getByRole('button', { name: /^Start fresh/ }).click();
  await page.getByRole('button', { name: 'Delete & start fresh', exact: true }).click();
  await expect.poll(() => photoCount(page)).toBe(0);
  expect(await photoCount(page, 'creation')).toBe(1);
});

test('new worker waits for approval and updating preserves the current challenge', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Next clue', exact: true }).last().click();
  const title = await page.locator('h3').first().textContent();
  const original = await readFile('dist/sw.js', 'utf8');
  try {
    await writeFile('dist/sw.js', original.replace(/const VERSION = "([^"]+)"/, `const VERSION = "$1-test-${Date.now()}"`));
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    await expect(page.getByRole('button', { name: 'Update now' })).toBeVisible();
    await expect(page.locator('h3').first()).toHaveText(title!);
    await page.getByRole('button', { name: 'Later', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Update now' })).toBeVisible();
    await page.getByRole('button', { name: 'Update now' }).click();
    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(0);
    await expect(page.locator('h3').first()).toHaveText(title!);
  } finally {
    await writeFile('dist/sw.js', original);
  }
});
