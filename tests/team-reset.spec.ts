import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { christmasPack } from '../src/data/packs/christmasPack';
import type { StoredPhoto } from '../src/lib/photoStorage';

const image = (width = 640, height = 480) => ({ name: 'team.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="gold"/></svg>`) });
async function photos(page: Page): Promise<StoredPhoto[]> {
  return page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('ScavengerHuntPhotos', 3);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('photos');
      tx.objectStore('photos').getAll().onsuccess = event => resolve((event.target as IDBRequest).result);
      tx.oncomplete = () => db.close();
    };
  }));
}
async function start(page: Page, name = 'The Lost Sheep') {
  await page.goto('./');
  await page.getByRole('button', { name: 'Christmas', exact: true }).click();
  await page.getByRole('button', { name: 'Start the hunt', exact: true }).click();
  await page.getByRole('textbox', { name: /Team name/ }).fill(name);
  await page.getByRole('button', { name: /Path B/ }).first().click();
  await page.getByRole('button', { name: "Let's go on Path B" }).click();
  await page.getByRole('button', { name: 'Start the hunt on Path B' }).click();
}
async function home(page: Page) {
  await page.getByRole('button', { name: 'Back to all tasks overview' }).click();
  await page.getByRole('button', { name: 'More hunt options' }).click();
  await page.getByRole('menuitem', { name: 'Back to home' }).click();
}
async function capture(page: Page, width = 640, height = 480) {
  const count = (await photos(page)).length;
  await page.locator('input[type=file]').setInputFiles(image(width, height));
  await expect.poll(async () => (await photos(page)).length).toBe(count + 1);
}

test('names persist, label new JPEGs and exports, and never relabel older photos', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as unknown as { labels: string[] }).labels = [];
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<CanvasRenderingContext2D['fillText']>) {
      (window as unknown as { labels: string[] }).labels.push(args[0]);
      return original.apply(this, args);
    };
  });
  await start(page, '  The Lost Sheep  ');
  await capture(page);
  const first = (await photos(page))[0];
  expect(first.teamName).toBe('The Lost Sheep');
  expect(first.pathId).toBe('B');
  const labels = await page.evaluate(() => (window as unknown as { labels: string[] }).labels.join(' '));
  expect(labels).toContain('The Lost Sheep');
  expect(labels).toMatch(/Path B/i);
  await page.getByRole('button', { name: 'Back to all tasks overview' }).click();
  await page.getByRole('button', { name: /Edit team and path/ }).click();
  await page.getByRole('textbox', { name: /Team name/ }).fill('New Shepherds');
  await page.getByRole('button', { name: "Let's go on Path B" }).click();
  await page.getByRole('button', { name: 'Resume hunt', exact: true }).click();
  await capture(page, 480, 640);
  expect((await photos(page)).find(photo => photo.id === first.id)?.imageData).toBe(first.imageData);
  expect((await photos(page)).map(photo => photo.teamName).sort()).toEqual(['New Shepherds', 'The Lost Sheep']);
  await home(page);
  await page.reload();
  await expect(page.locator('.gl-card').filter({ has: page.getByRole('heading', { name: 'Christmas', exact: true }) })).toContainText('New Shepherds');
  await page.screenshot({ path: info.outputPath('team-library.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Continue Christmas', exact: true }).click();
  // Wait for the asynchronous count: until it loads, the underlying navigation
  // and the visible full-screen challenge briefly share the same gallery label.
  await expect(page.getByRole('navigation', { name: 'Hunt controls' }).getByRole('button', { name: 'Open photo gallery (2 photos)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open photo gallery', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save all photos', exact: true }).click();
  const files = unzipSync(await readFile((await (await downloadPromise).path())!));
  expect(Object.keys(files).some(name => name.includes('the-lost-sheep-path-b'))).toBe(true);
  expect(Object.keys(files).some(name => name.includes('new-shepherds-path-b'))).toBe(true);
});

test('library reset keeps photos and team; confirmed clear removes only the chosen game', async ({ page }, info) => {
  await start(page);
  await capture(page);
  await home(page);
  await page.evaluate(() => new Promise<void>(resolve => {
    localStorage.setItem('pathByPack', JSON.stringify({ christmas: 'B', creation: 'C' }));
    localStorage.setItem('teamNameByPack', JSON.stringify({ christmas: 'The Lost Sheep', creation: 'The Explorers' }));
    localStorage.setItem('startedByPack', JSON.stringify({ christmas: true, creation: true }));
    localStorage.setItem('completedChallenges:creation', JSON.stringify(['c-1']));
    const request = indexedDB.open('ScavengerHuntPhotos', 3);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ id: 'other-team-photo', packId: 'creation', challengeId: 'c-1', imageData: '', timestamp: 0 });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await page.reload();
  await page.getByRole('button', { name: 'Reset Christmas', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Christmas');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await photos(page)).toHaveLength(2);
  await page.getByRole('button', { name: 'Reset Christmas', exact: true }).click();
  await page.screenshot({ path: info.outputPath('reset-dialog.png'), animations: 'disabled' });
  await page.getByRole('button', { name: /^Reset progress/ }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await photos(page)).toHaveLength(2);
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:christmas'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teamNameByPack')!).christmas)).toBe('The Lost Sheep');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pathByPack')!).christmas)).toBe('B');
  await expect(page.getByRole('heading', { name: 'Choose your adventure' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Christmas', exact: true }).click();
  await page.getByRole('button', { name: /^Start fresh/ }).click();
  expect(await photos(page)).toHaveLength(2);
  await page.getByRole('button', { name: 'Delete & start fresh', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await photos(page)).map(photo => photo.id)).toEqual(['other-team-photo']);
  expect(await page.evaluate(() => ({ teams: JSON.parse(localStorage.getItem('teamNameByPack')!), paths: JSON.parse(localStorage.getItem('pathByPack')!), other: JSON.parse(localStorage.getItem('completedChallenges:creation')!) }))).toEqual({ teams: { creation: 'The Explorers' }, paths: { creation: 'C' }, other: ['c-1'] });
  await expect(page.getByRole('button', { name: 'Reset Christmas', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue Creation Quest', exact: true })).toBeVisible();
});

test('failed clear leaves photos and progress intact and offers retry', async ({ page }) => {
  await start(page);
  await capture(page);
  await home(page);
  await page.getByRole('button', { name: 'Reset Christmas', exact: true }).click();
  await page.getByRole('button', { name: /^Start fresh/ }).click();
  await page.evaluate(() => {
    const original = IDBCursor.prototype.delete;
    IDBCursor.prototype.delete = function () {
      const result = original.call(this);
      IDBCursor.prototype.delete = original;
      result.addEventListener('success', () => result.transaction!.abort());
      return result;
    };
  });
  await page.getByRole('button', { name: 'Delete & start fresh', exact: true }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toBeVisible();
  expect(await photos(page)).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('completedChallenges:christmas')!))).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teamNameByPack')!).christmas)).toBe('The Lost Sheep');
  await page.getByRole('button', { name: 'Delete & start fresh', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await photos(page)).toHaveLength(0);
});

test('long team names fit photo captions and the finish screen offers reset', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as unknown as { bounds: boolean[] }).bounds = [];
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<CanvasRenderingContext2D['fillText']>) {
      (window as unknown as { bounds: boolean[] }).bounds.push(this.measureText(args[0]).width <= this.canvas.width && args[2] + parseFloat(this.font.match(/[\d.]+px/)![0]) <= this.canvas.height);
      return original.apply(this, args);
    };
  });
  await start(page, 'W'.repeat(40));
  await page.evaluate(ids => localStorage.setItem('completedChallenges:christmas', JSON.stringify(ids)), christmasPack.categories.flatMap(category => category.challenges.map(challenge => challenge.id)).slice(0, -1));
  await page.reload();
  await capture(page, 100, 180);
  await expect(page.getByRole('heading', { name: 'Hunt complete!' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { bounds: boolean[] }).bounds.every(Boolean))).toBe(true);
  const photo = (await photos(page))[0];
  await page.evaluate(data => { document.body.innerHTML = ''; const img = document.createElement('img'); img.src = data; document.body.append(img); }, photo.imageData);
  await page.locator('img').screenshot({ path: info.outputPath('long-team-caption.png') });
  await page.reload();
  await page.getByRole('button', { name: 'Start over Christmas', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Christmas');
  await page.getByRole('button', { name: /^Reset progress/ }).click();
  await expect(page.getByRole('textbox', { name: /Team name/ })).toHaveValue('W'.repeat(40));
  await expect(page.getByRole('button', { name: /Path B/ }).first()).toHaveAttribute('aria-pressed', 'true');
});

test('photo viewer keeps the card clear of controls and supports save, share, navigation and delete', async ({ page }, info) => {
  await start(page);
  await capture(page, 480, 640);
  await page.getByRole('button', { name: 'Next challenge', exact: true }).last().click();
  await capture(page, 960, 540);
  await page.getByRole('button', { name: 'Open photo gallery', exact: true }).click();
  await page.getByRole('button', { name: /View photo for .* full screen/ }).first().click();
  let viewer = page.getByRole('dialog', { name: /^Photo / });
  await expect(viewer).toBeVisible();
  const imageBox = await viewer.getByRole('img').boundingBox();
  const saveBox = await viewer.getByRole('button', { name: 'Save', exact: true }).boundingBox();
  expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(saveBox!.y);
  await page.screenshot({ path: info.outputPath('photo-viewer-phone.png'), animations: 'disabled' });
  const download = page.waitForEvent('download');
  await viewer.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('the-lost-sheep-path-b');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => {
      (window as unknown as { sharedFilename: string }).sharedFilename = data.files![0].name;
    } });
  });
  await viewer.getByRole('button', { name: 'Share', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { sharedFilename: string }).sharedFilename)).toContain('the-lost-sheep-path-b');
  await viewer.getByRole('button', { name: 'Next photo', exact: true }).last().click();
  await expect(page.getByRole('dialog', { name: /^Photo 2 of 2/ })).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  viewer = page.getByRole('dialog', { name: /^Photo / });
  await page.screenshot({ path: info.outputPath('photo-viewer-landscape.png'), animations: 'disabled' });
  const landscapeImage = await viewer.getByRole('img').boundingBox();
  const landscapeSave = await viewer.getByRole('button', { name: 'Save', exact: true }).boundingBox();
  expect(landscapeImage!.y + landscapeImage!.height).toBeLessThanOrEqual(landscapeSave!.y);
  await viewer.getByRole('button', { name: 'Delete photo', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(async () => (await photos(page)).length).toBe(1);
  await page.getByRole('button', { name: 'Close photo viewer', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /^Photo / })).toHaveCount(0);
});
