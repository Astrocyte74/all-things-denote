import { test, expect } from '@playwright/test';
import { openChecklist, openGallery, openHuntMenu, openMoreOptions } from './hunt-controls';

test('new players have one menu, explicit detours, and protected exits that preserve their current clue', async ({ page }, info) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('activePackId', JSON.stringify('scripture-detectives'));
    localStorage.setItem('pathByPack', JSON.stringify({ 'scripture-detectives': 'A' }));
    localStorage.setItem('startedByPack', JSON.stringify({ 'scripture-detectives': true }));
    localStorage.setItem('huntScreen', JSON.stringify('hunt'));
  });
  await page.reload(); await page.setViewportSize({ width: 375, height: 620 });
  await page.getByRole('button', { name: 'Next challenge', exact: true }).click();
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
