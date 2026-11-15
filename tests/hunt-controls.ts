import type { Page } from '@playwright/test';
export async function openHuntMenu(page: Page) {
  if (!await page.getByRole('menu', { name: 'Hunt menu', exact: true }).isVisible()) await page.getByRole('button', { name: 'Hunt menu', exact: true }).click();
}
export async function openChecklist(page: Page) { await openHuntMenu(page); await page.getByRole('menuitem', { name: 'Hunt checklist', exact: true }).click(); }
export async function openGallery(page: Page) { await openHuntMenu(page); await page.getByRole('menuitem', { name: 'Photo gallery', exact: true }).click(); }
export async function openSharingMenu(page: Page) { await openHuntMenu(page); await page.getByRole('menuitem', { name: 'Photo sharing', exact: true }).click(); }
export async function openMoreOptions(page: Page) { await openHuntMenu(page); await page.getByRole('menuitem', { name: 'More options', exact: true }).click(); }
export async function leaveHunt(page: Page) { await openMoreOptions(page); await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click(); await page.getByRole('button', { name: 'Go to home', exact: true }).click(); }
