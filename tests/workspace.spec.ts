import { expect, test } from './workspace-fixture';
import type { Page } from '@playwright/test';

async function checkFooter(page: Page, architecture = false) {
  const selector = architecture ? '.arch-footer' : '.app-footer';
  const main = architecture ? '.arch-main' : '.page-content';
  await expect(page.locator(selector)).toBeInViewport();
  const bounds = await page.locator(selector).evaluate(element => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, viewport: innerHeight }));
  expect(Math.abs(bounds.viewport - bounds.bottom)).toBeLessThanOrEqual(1);
  const content = await page.locator(main).boundingBox();
  expect(content!.y + content!.height).toBeLessThanOrEqual(bounds.top + 1);
  await page.locator(main).evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.locator(selector)).toBeInViewport();
}

test('overview shows role-owned work consistently with navigation and My tasks, including market changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Overview');
  await expect(page.getByRole('button', { name: 'New campaign', exact: true })).toBeVisible();
  await expect(page.getByLabel('Start a campaign brief', { exact: true })).toBeVisible();
  await expect(page.locator('.sparkline')).toHaveCount(0);
  await expect(page.getByLabel('Overview period')).toHaveCount(0);
  for (const role of ['TW Tom Inventory & operations', 'BC Ben Creative reviewer', 'JP João Field crew', 'HL Helena Budget approver']) {
    await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
    await page.getByRole('button', { name: role, exact: true }).click();
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Overview');
    await expect(page.getByRole('button', { name: 'New campaign', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View my tasks', exact: true })).toBeVisible();
    for (const market of ['All', 'BR']) {
      await page.getByRole('combobox', { name: 'Market filter', exact: true }).selectOption(market);
      const count = Number(await page.locator('.stat-card').first().locator('.stat-body strong').innerText());
      await expect(page.locator('.overview-task')).toHaveCount(Math.min(count, 4));
      const nav = page.locator('.sidebar').getByRole('link', { name: /^My tasks/ });
      if (count) await expect(nav.locator('.nav-count')).toHaveText(String(count));
      else await expect(nav.locator('.nav-count')).toHaveCount(0);
      await page.getByRole('button', { name: 'View my tasks', exact: true }).click();
      await expect(page.locator('h1')).toHaveText('My tasks');
      await expect(page.locator('.task-list-item')).toHaveCount(count);
      await page.goto('/');
    }
    await page.getByRole('combobox', { name: 'Market filter', exact: true }).selectOption('All');
  }
});

test('workspace and architecture footer remain at the viewport bottom without covering scrollable content', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Overview');
    await checkFooter(page);
    await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Getting started', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.goto('/#/architecture');
    await expect(page.locator('h1')).toBeVisible();
    await checkFooter(page, true);
    await page.getByRole('button', { name: 'Show the whole ecosystem', exact: true }).click();
    await expect(page.locator('.arch-footer')).toBeInViewport();
  }
});

test('additional role tools are discoverable and the app directory explains role changes before opening', async ({ page }) => {
  await page.goto('/');
  const more = page.locator('.sidebar .more-tools');
  await more.locator('summary').click();
  await more.getByRole('link', { name: 'Attribution', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Attribution');
  await expect(more).toHaveAttribute('open', '');
  await page.locator('.sidebar').getByRole('button', { name: 'All apps', exact: false }).click();
  await expect(page.getByRole('dialog', { name: 'All apps', exact: true })).toBeVisible();
  await expect(page.locator('.app-tile')).toHaveCount(17);
  const finance = page.locator('.app-tile').filter({ has: page.getByText('Finance', { exact: true }) });
  await expect(finance.locator('p')).toContainText('delivery evidence');
  await expect(finance.locator('small')).toHaveText('Preview as Ana');
  await expect(page.locator('.topbar-avatar')).toHaveText('SL');
  await finance.click();
  await expect(page.locator('h1')).toHaveText('Finance');
  await expect(page.getByRole('button', { name: 'Switch persona', exact: true })).toHaveText('AC');
});

test('Planner presents a named brief and actual selected locations rather than decorative map pins', async ({ page }) => {
  await page.goto('/#/planner');
  await expect(page.locator('h1')).toHaveText('Planner');
  await expect(page.getByRole('heading', { name: 'Campaign brief', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Campaign brief', exact: true }).fill('Reach commuters in Copenhagen for a store launch.');
  await page.getByRole('button', { name: 'Find my audience', exact: true }).click();
  await expect(page.locator('.plan-locations')).toHaveCount(3);
  await expect(page.locator('.option-map')).toHaveCount(0);
  for (const locations of await page.locator('.plan-locations').allTextContents()) expect(locations.trim().length).toBeGreaterThan(10);
  await checkFooter(page);
});
