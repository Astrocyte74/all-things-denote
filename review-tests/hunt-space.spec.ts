import { leaveHunt, openHuntMenu, openSharingMenu } from '../tests/hunt-controls';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
const API = 'http://127.0.0.1:8788';
type Access = { eventId: string; token: string };
let created: Access[];
test.beforeEach(() => { created = []; });
test.afterEach(async ({ request }) => { for (const a of created) await request.delete(`${API}/events/${a.eventId}`, { headers: { Authorization: `Bearer ${a.token}` } }); });
const auth = (a: Access) => ({ Authorization: `Bearer ${a.token}` });
async function make(request: APIRequestContext, baseURL: string) {
  const r = await request.post(`${API}/events`, { headers: { 'CF-Connecting-IP': crypto.randomUUID() }, data: { title: 'Room for discoveries', packId: 'scripture-detectives', autoUploadDefault: true } });
  expect(r.status()).toBe(201); const e = await r.json(); created.push(e.access);
  return { ...e, invite: `${baseURL}#event=${e.access.eventId}&join=${e.snapshot.joinToken}`, leader: `${baseURL}#event=${e.access.eventId}&leader=${e.access.token}` };
}
async function state(request: APIRequestContext, a: Access) { return (await request.get(`${API}/events/${a.eventId}`, { headers: auth(a) })).json(); }
async function join(page: Page, invite: string) {
  await page.goto(invite); await page.getByRole('button', { name: 'Use my own name', exact: true }).click(); await page.getByRole('textbox', { name: /Your own name/ }).fill('Lantern team');
  await page.getByRole('button', { name: 'Join & start hunt', exact: true }).click(); await page.getByRole('button', { name: 'Start the hunt on Path A', exact: true }).click();
}
const image = { name: 'lamp.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="gold"/></svg>') };
const sharing = (page: Page) => page.getByRole('button', { name: 'Hunt menu', exact: true });
const closeSharing = (page: Page) => page.getByRole('button', { name: 'Close photo sharing', exact: true }).click();

test('small phone devotes most space to the clue with one navigation dock and accessible sharing sheet', async ({ page, request, baseURL }, info) => {
  const e = await make(request, baseURL!); await page.setViewportSize({ width: 375, height: 620 }); await join(page, e.invite);
  await expect(page.getByRole('heading', { name: 'Psalm 119:105', exact: true })).toBeVisible();
  const viewport = page.viewportSize()!, clue = await page.getByTestId('clue-scroll').boundingBox();
  expect(clue!.height).toBeGreaterThan(viewport.height * .68);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Next clue', exact: true })).toHaveCount(1);
  await expect(page.getByRole('switch', { name: 'Send photos as we go', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Event & photos/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('clue-phone-375x620.png') });
  await expect(page.locator('[data-testid=clue-scroll]').locator('..').locator('header button')).toHaveCount(1);
  await openHuntMenu(page); await page.screenshot({ path: info.outputPath('hunt-menu-phone.png') }); await page.keyboard.press('Escape');
  await openSharingMenu(page); const dialog = page.getByRole('dialog', { name: 'Photo sharing', exact: true }); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('switch')).toBeChecked(); await expect(dialog.getByRole('button', { name: /Event & photos/ })).toBeVisible();
  // Focus trapping/restoration and swipe isolation: the underlying clue never changes.
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(sharing(page)).toBeFocused();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click(); await expect(page.getByRole('button', { name: 'Next clue', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Next clue', exact: true }).click(); expect(await page.getByTestId('clue-scroll').evaluate(el => el.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 320, height: 568 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Take photo for this clue', exact: true })).toBeVisible();
  const current = await page.locator('h3').textContent();
  await leaveHunt(page);
  // Returning Home must expose Continue without hunting through a collapsed section.
  await expect(page.getByRole('button', { name: 'Continue Lantern team', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue Lantern team', exact: true }).click();
  await expect(page.locator('h3')).toHaveText(current!);
});

test('leader sees reported queue/errors, retry clears it, and an offline opt-out catches up after reload', async ({ page, browser, request, baseURL }, info) => {
  const e = await make(request, baseURL!), ctx = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } }), leader = await ctx.newPage();
  try {
    await join(page, e.invite);
    await expect.poll(async () => (await state(request, e.access)).teams[0].photoStatus?.autoSend).toBe(true);
    await expect(sharing(page)).not.toHaveAttribute('aria-describedby');
    await openHuntMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Photo sharing', exact: true })).toContainText('Send photos to your leader');
    await expect(page.getByRole('menuitem', { name: 'Photo sharing', exact: true })).toContainText('On · all caught up');
    await page.keyboard.press('Escape');
    await request.patch(`${API}/events/${e.access.eventId}`, { headers: auth(e.access), data: { closed: true } });
    await page.getByLabel('Take photo', { exact: true }).setInputFiles(image);
    await expect.poll(async () => (await state(request, e.access)).teams[0].photoStatus?.hasError).toBe(true);
    expect((await state(request, e.access)).teams[0].photoStatus.queuedUploads).toBe(1);
    await expect(sharing(page)).toHaveAccessibleDescription('Photo sharing needs attention');
    await expect(page.getByText('Photo saved on this device', { exact: true })).toHaveCount(0);
    await openHuntMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Photo sharing', exact: true })).toContainText('Needs attention');
    await page.screenshot({ path: info.outputPath('sharing-error-menu.png') });
    await page.keyboard.press('Escape');
    await leader.goto(e.leader); const teams = leader.getByRole('list', { name: 'Teams', exact: true });
    await expect(teams).toContainText('Auto-send on'); await expect(teams).toContainText('1 photo waiting'); await expect(teams).toContainText('reported just now');
    await leader.screenshot({ path: info.outputPath('leader-queue-desktop.png'), fullPage: true });
    await leader.setViewportSize({ width: 375, height: 700 }); expect(await leader.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await leader.screenshot({ path: info.outputPath('leader-queue-phone.png'), fullPage: true });
    await request.patch(`${API}/events/${e.access.eventId}`, { headers: auth(e.access), data: { closed: false } });
    await openSharingMenu(page); await page.getByRole('button', { name: 'Retry', exact: true }).click(); await closeSharing(page);
    await expect.poll(async () => (await state(request, e.access)).photos.length).toBe(1);
    await expect.poll(async () => (await state(request, e.access)).teams[0].photoStatus?.queuedUploads).toBe(0);
    await expect(sharing(page)).not.toHaveAttribute('aria-describedby');
    await page.evaluate(() => navigator.serviceWorker.ready); await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Next clue', exact: true }).click();
    await page.getByLabel('Take photo', { exact: true }).setInputFiles(image);
    await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
    await openHuntMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Photo sharing', exact: true })).toContainText('Offline · 1 photo update waiting');
    await page.screenshot({ path: info.outputPath('sharing-offline-menu.png') });
    await page.keyboard.press('Escape');
    await expect(sharing(page)).not.toHaveAttribute('aria-describedby');
    await openSharingMenu(page); await page.getByRole('switch', { name: 'Send photos as we go', exact: true }).click(); await closeSharing(page); await page.reload();
    expect((await state(request, e.access)).teams[0].photoStatus.autoSend).toBe(true); // Last known status, not a guessed offline value.
    await page.context().setOffline(false); await expect.poll(async () => (await state(request, e.access)).teams[0].photoStatus?.autoSend).toBe(false);
    await leader.reload(); await expect(leader.getByRole('list', { name: 'Teams', exact: true })).toContainText('Auto-send off');
  } finally { await page.context().setOffline(false); await ctx.close(); }
});
