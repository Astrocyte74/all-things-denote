import { test, expect } from '@playwright/test';
import { openChecklist, openGallery, openHuntMenu, openMoreOptions } from './hunt-controls';
import { scriptureDetectivesPack } from '../src/data/packs/scriptureDetectivesPack';

test('new players have one menu, explicit detours, and protected exits that preserve their current clue', async ({ page }, info) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('activePackId', JSON.stringify('scripture-detectives'));
    localStorage.setItem('pathByPack', JSON.stringify({ 'scripture-detectives': 'A' }));
    localStorage.setItem('startedByPack', JSON.stringify({ 'scripture-detectives': true }));
    localStorage.setItem('huntScreen', JSON.stringify('hunt'));
  });
  await page.reload(); await page.setViewportSize({ width: 375, height: 620 });
  await page.getByRole('button', { name: 'Next clue', exact: true }).click();
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  const current = await page.locator('h3').textContent();
  const before = await page.evaluate(() => localStorage.getItem('completedChallenges:scripture-detectives'));
  await expect(page.locator('header button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Hunt menu', exact: true })).toContainText('Menu');
  await openHuntMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Start over', exact: true })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Back to home', exact: true })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Photo sharing', exact: true })).toHaveCount(0); // Solo hunt.
  await page.screenshot({ path: info.outputPath('menu-phone.png') });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Hunt menu', exact: true })).toBeFocused();
  await expect(page.locator('h3')).toHaveText(current!);

  await openGallery(page); await expect(page.getByRole('dialog', { name: 'Photo gallery', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close photo gallery', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Close photo gallery', exact: true })).toHaveText('Back to current clue');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Photo gallery', exact: true })).toHaveCount(0);
  await expect(page.locator('h3')).toHaveText(current!); await expect(page.getByRole('button', { name: 'Hunt menu', exact: true })).toBeFocused();

  await openChecklist(page); await expect(page.getByRole('heading', { name: 'Hunt checklist', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('checklist-return-phone.png') });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('button', { name: 'Back to current clue', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Back to current clue', exact: true }).click(); await expect(page.locator('h3')).toHaveText(current!);
  await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible(); // Returns to the completed current clue, not first unfinished.

  await openMoreOptions(page); await page.getByRole('menuitem', { name: 'Back to hunt menu', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Photo gallery', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'More options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Leave this hunt?', exact: true })).toContainText('progress and photos stay saved');
  await expect(page.getByRole('button', { name: 'Stay in hunt', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Stay in hunt', exact: true }).click(); await expect(page.locator('h3')).toHaveText(current!);
  await openMoreOptions(page); await page.getByRole('menuitem', { name: 'Start over', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Start over Scripture Detectives?');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Hunt menu', exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:scripture-detectives'))).toBe(before);
  await openMoreOptions(page); await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click(); await page.getByRole('button', { name: 'Go to home', exact: true }).click();
  await page.getByRole('button', { name: 'Continue Scripture Detectives', exact: true }).click(); await expect(page.locator('h3')).toHaveText(current!);
  await page.reload(); await expect(page.locator('h3')).toHaveText(current!);
  expect(await page.evaluate(() => localStorage.getItem('completedChallenges:scripture-detectives'))).toBe(before);
  await page.screenshot({ path: info.outputPath('quiet-clue-phone.png') });
});

for (const pathId of ['A', 'B', 'D']) {
  test(`last stop finds skipped clues in Path ${pathId} order and captures keep the dock clear`, async ({ page }, info) => {
    const clues = scriptureDetectivesPack.categories.flatMap(category => category.challenges);
    const route = scriptureDetectivesPack.paths.find(path => path.id === pathId)!.order.map(number => clues[number - 1]);
    const last = route.at(-1)!, skipped = route[1], otherSkipped = route[6];
    await page.goto('./');
    await page.evaluate(({ pathId, lastId, completed }) => {
      localStorage.setItem('activePackId', JSON.stringify('scripture-detectives'));
      localStorage.setItem('pathByPack', JSON.stringify({ 'scripture-detectives': pathId }));
      localStorage.setItem('startedByPack', JSON.stringify({ 'scripture-detectives': true }));
      localStorage.setItem('huntScreen', JSON.stringify('hunt'));
      localStorage.setItem('lastChallenge:scripture-detectives', JSON.stringify({ [pathId]: lastId }));
      localStorage.setItem('completedChallenges:scripture-detectives', JSON.stringify(completed));
    }, { pathId, lastId: last.id, completed: route.filter(clue => clue.id !== skipped.id && clue.id !== otherSkipped.id && clue.id !== last.id).map(clue => clue.id) });
    await page.reload(); await page.setViewportSize({ width: 320, height: 568 });
    await expect(page.getByLabel(`Clue #${last.number}`, { exact: true })).toHaveText(`#${last.number}`);
    await expect(page.getByText('Step 12 of 12', { exact: true })).toBeVisible();
    await page.getByLabel('Take photo', { exact: true }).setInputFiles({ name: 'clue.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="gold"/></svg>') });
    await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Photo 1', exact: true })).toBeAttached();
    await expect(page.getByText('Photo saved on this device', { exact: true })).toHaveCount(0);
    const next = page.getByRole('button', { name: `Next unfinished clue, #${skipped.number}`, exact: true });
    await expect(next).toBeEnabled(); await expect(next).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of [page.getByRole('button', { name: 'Previous clue', exact: true }), page.getByRole('button', { name: 'Take photo for this clue', exact: true }), next]) {
      await expect(control).toBeInViewport({ ratio: 1 });
      expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: info.outputPath(`last-stop-${pathId}.png`) });
    if (pathId === 'D') {
      const target = await page.getByTestId('clue-scroll').elementHandle();
      await page.getByTestId('clue-scroll').dispatchEvent('touchstart', { touches: [{ identifier: 1, target, clientX: 270, clientY: 300 }] });
      await page.getByTestId('clue-scroll').dispatchEvent('touchend', { changedTouches: [{ identifier: 1, target, clientX: 80, clientY: 300 }] });
    } else await next.click();
    await expect(page.getByLabel(`Clue #${skipped.number}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Step 2 of 12', { exact: true })).toBeVisible();
    await page.reload(); await expect(page.locator('h3')).toHaveText(skipped.title);
    await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
    const nextSkipped = page.getByRole('button', { name: `Next unfinished clue, #${otherSkipped.number}`, exact: true });
    await expect(nextSkipped).toContainText('Next unfinished');
    await nextSkipped.click();
    await expect(page.locator('h3')).toHaveText(otherSkipped.title);
    await expect(page.getByRole('button', { name: 'Next clue', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
    await expect(page.getByText('You finished all 12 clues.', { exact: false })).toBeVisible();
  });
}
