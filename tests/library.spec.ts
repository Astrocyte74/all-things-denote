import { test, expect, type Page } from '@playwright/test';
import { PACKS } from '../src/data/packs';
import { scriptureDetectivesPack } from '../src/data/packs/scriptureDetectivesPack';
import { createPaths, validatePacks } from '../src/data/packs/defineThemePack';

async function play(page: Page, title: string, path = 'A') {
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Start the hunt', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`Path ${path}`) }).first().click();
  await page.getByRole('button', { name: `Let's go on Path ${path}` }).click();
  await page.getByRole('button', { name: `Start the hunt on Path ${path}` }).click();
}

async function library(page: Page) {
  await page.getByRole('button', { name: 'Back to all tasks overview' }).click();
  await page.getByRole('button', { name: 'More hunt options' }).click();
  await page.getByRole('menuitem', { name: 'Back to home' }).click();
}

test('library presents four games and opens every detail page on phone and desktop', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Choose your adventure' })).toBeVisible();
  await expect(page.locator('.gl-card')).toHaveCount(4);
  for (const pack of PACKS) {
    await page.getByRole('button', { name: pack.title, exact: true }).click();
    await expect(page.getByText(pack.blurb, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'All games', exact: true }).click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('chooser-phone.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect.poll(() => page.locator('.gl-card').evaluateAll(cards => cards[0].getBoundingClientRect().top === cards[1].getBoundingClientRect().top)).toBe(true);
  await page.screenshot({ path: info.outputPath('chooser-desktop.png'), fullPage: true, animations: 'disabled' });
  expect(await page.locator('button button').count()).toBe(0);
});

test('switching games preserves independent progress, paths, and the viewed clue', async ({ page }) => {
  await page.goto('./');
  await play(page, 'Christmas', 'B');
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await library(page);
  await expect(page.getByRole('progressbar', { name: 'Christmas progress' })).toHaveAttribute('aria-valuenow', '1');
  await play(page, 'Scripture Detectives', 'D');
  await page.getByRole('button', { name: 'Mark as done', exact: true }).click();
  await page.getByRole('button', { name: 'Next challenge', exact: true }).last().click();
  await library(page);
  await page.getByRole('button', { name: 'Continue Christmas', exact: true }).click();
  await expect(page.getByLabel('Challenge 12', { exact: true })).toBeVisible();
  await expect(page.getByText('Nailed it!', { exact: true })).toBeVisible();
  await library(page);
  await page.getByRole('button', { name: 'Continue Scripture Detectives', exact: true }).click();
  await expect(page.getByLabel('Challenge 3', { exact: true })).toBeVisible();
  await expect(page.getByText('Nailed it!', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Challenge 3', { exact: true })).toBeVisible();
});

test('scripture clues work offline before completion, then reveal discussion; route crosses categories', async ({ page, context }, info) => {
  await page.goto('./');
  await expect(page.getByText('Ready for offline hunting', { exact: false })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await play(page, 'Scripture Detectives', 'D');
  const first = scriptureDetectivesPack.categories[0].challenges[0];
  await expect(page.getByRole('region', { name: `Scripture clue: ${first.title}` })).toContainText(first.scriptureClue!.excerpt);
  await expect(page.getByRole('link', { name: /Read the full passage/ })).toHaveAttribute('href', first.scriptureClue!.url);
  await expect(page.getByText(first.gospelConnection, { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('scripture-phone.png'), animations: 'disabled' });
  await page.locator('input[type=file]').setInputFiles({ name: 'clue.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="gold"/></svg>') });
  await expect(page.getByText(first.gospelConnection, { exact: true })).toBeVisible();
  for (const number of [3, 5, 7, 9, 11, 2]) {
    await page.getByRole('button', { name: 'Next challenge', exact: true }).last().click();
    await expect(page.getByLabel(`Challenge ${number}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByLabel('Challenge 2', { exact: true })).toBeVisible();
});

test('12 challenge games show correct results, bonus totals, and library results action', async ({ page }) => {
  await page.goto('./');
  const pack = scriptureDetectivesPack;
  await page.evaluate(({ id, ids }) => {
    localStorage.setItem('activePackId', JSON.stringify(id));
    localStorage.setItem('pathByPack', JSON.stringify({ [id]: 'A' }));
    localStorage.setItem('startedByPack', JSON.stringify({ [id]: true }));
    localStorage.setItem('completedChallenges:' + id, JSON.stringify(ids));
  }, { id: pack.id, ids: pack.categories.flatMap(category => category.challenges.map(challenge => challenge.id)) });
  await page.reload();
  await page.getByRole('button', { name: 'View Scripture Detectives results', exact: true }).click();
  await expect(page.getByText('You finished all 12 challenges.', { exact: false })).toBeVisible();
  await expect(page.getByText(pack.discussionPrompt!, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You Did All 12!' })).toBeAttached();
  await expect(page.getByText('3 more discoveries for your team.', { exact: false })).toBeAttached();
  await expect(page.getByText('All 15!', { exact: false })).toHaveCount(0);
});

test('pack registry rejects unsafe identities and routes; future counts generate complete routes', () => {
  expect(() => validatePacks(PACKS)).not.toThrow();
  for (const count of [1, 7, 12, 15, 20]) {
    for (const path of createPaths(count)) expect([...path.order].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
  }
  const badRoute = structuredClone(scriptureDetectivesPack);
  badRoute.paths[0].order[1] = badRoute.paths[0].order[0];
  expect(() => validatePacks([badRoute])).toThrow(/exactly once/);
  const badId = structuredClone(scriptureDetectivesPack);
  badId.categories[0].challenges[1].id = badId.categories[0].challenges[0].id;
  expect(() => validatePacks([badId])).toThrow(/Duplicate challenge/);
  const clues = scriptureDetectivesPack.categories.flatMap(category => category.challenges);
  expect(clues.filter(clue => clue.scriptureClue?.collection === 'Bible')).toHaveLength(6);
  expect(clues.filter(clue => clue.scriptureClue?.collection === 'Book of Mormon')).toHaveLength(6);
});
