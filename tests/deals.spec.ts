import { expect, test } from './workspace-fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function become(page: Page, person: RegExp, owner?: 'Urban Reach Media' | 'Vista Outdoor') {
  await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Switch workspace role' });
  await dialog.getByRole('button', { name: person }).click();
  await expect(dialog).toBeHidden();
  if (!owner) return;
  await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
  await dialog.getByLabel('Media owner workspace').selectOption(owner);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}
async function noOverflow(page: Page) {
  const size = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
}

test('an agency swaps, counters and books a direct deal once every owner answers', async ({ page }) => {
  await page.goto('/#/deals?deal=AU-1005');
  await expect(page.getByRole('heading', { name: 'Direct deals', level: 1 })).toBeVisible();
  await expect(page.locator('#deal-title')).toHaveText('Your next chapter');
  const proposal = page.getByRole('article', { name: 'Urban Reach Media proposal' });
  await expect(proposal.getByText('Northstar 2026 annual rates · 8%')).toBeVisible();
  const swaps = proposal.getByRole('button', { name: /^Swap / });
  await expect(swaps).toHaveCount(2);
  await swaps.first().click();
  await expect(swaps).toHaveCount(1);
  await proposal.getByRole('button', { name: 'Counter at 11%' }).click();
  await expect(proposal.locator('.offer-head')).toContainText('Countered');
  await expect(proposal.getByText('You asked for 11% off.')).toBeVisible();

  await become(page, /Daniel/);
  await page.goto('/#/deals?deal=AU-1005');
  await expect(page.getByRole('complementary', { name: 'Buyer requests' })).toBeVisible();
  const request = page.getByRole('article', { name: 'Urban Reach Media request' });
  await request.getByRole('button', { name: 'Meet halfway at 9.5%' }).click();
  await expect(request.locator('.offer-head')).toContainText('Proposed');

  const banner = page.locator('.next-action-banner button');
  for (let i = 0; i < 12 && !(await page.locator('.deal-booked').isVisible()); i++) await banner.click();
  await expect(page.locator('.deal-booked')).toContainText('Insertion orders are signed');
  await expect(page.locator('.deal-hero-meta')).toContainText('Booked');
});

test('a brand accepts an owner’s halfway answer and insertion orders are generated', async ({ page }) => {
  await page.goto('/');
  await become(page, /Daniel/, 'Vista Outdoor');
  await page.goto('/#/deals?deal=AU-1009');
  const request = page.getByRole('article', { name: 'Vista Outdoor request' });
  await expect(request.getByText('Nord Collective asks for 10% off')).toBeVisible();
  await request.getByRole('button', { name: 'Meet halfway at 8%' }).click();
  await expect(request.locator('.offer-head')).toContainText('Proposed');

  await become(page, /Aiko/);
  await page.goto('/#/deals?deal=AU-1009');
  await expect(page.locator('.deal-hero')).toContainText('BRAND DIRECT');
  const proposal = page.getByRole('article', { name: 'Vista Outdoor proposal' });
  await proposal.getByRole('button', { name: 'Accept 8% off' }).click();
  await expect(proposal.locator('.offer-head')).toContainText('Accepted');
  await expect(page.locator('.deal-hero-meta')).toContainText('Ready to sign');
  await expect(page.locator('.deal-summary')).toContainText('You save');
});

test('starting a deal is three taps and routes large budgets through approval', async ({ page }) => {
  await page.goto('/#/deals');
  await page.getByRole('button', { name: 'Start a direct deal' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Start a direct deal' });
  await expect(dialog.getByText('Northstar 2026 annual rates, 8% off')).toBeVisible();
  await dialog.getByRole('button', { name: /80/ }).click();
  await expect(dialog.getByRole('button', { name: /Send for approval/ })).toBeVisible();
  await dialog.getByRole('button', { name: /45/ }).click();
  await dialog.getByRole('button', { name: 'Bring people in' }).click();
  await axe(page);
  await dialog.getByRole('button', { name: /^Send to \d owners?/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#deal-title')).toHaveText('Bring people in in Copenhagen');
  await expect(page.locator('.deal-hero-meta')).toContainText('Awaiting offers');
  await expect(page.locator('.offer-card').first().locator('.offer-head')).toContainText('Pending');
});

test('approvers can follow deals but cannot negotiate them', async ({ page }) => {
  await page.goto('/');
  await become(page, /Helena/);
  await page.goto('/#/deals?deal=AU-1005');
  await expect(page.locator('#deal-title')).toHaveText('Your next chapter');
  await expect(page.getByRole('button', { name: 'Start a direct deal' })).toHaveCount(0);
  await expect(page.locator('.offer-actions button')).toHaveCount(0);
});

test('campaign plans link to the deal desk and recommend a buying route per place', async ({ page }) => {
  await page.goto('/#/campaigns/AU-1005?tab=plan');
  await expect(page.getByRole('columnheader', { name: 'Best route' })).toBeVisible();
  await page.getByRole('link', { name: /Negotiate in Direct deals/ }).click();
  await expect(page).toHaveURL(/#\/deals\?deal=AU-1005$/);
  await expect(page.locator('#deal-title')).toHaveText('Your next chapter');
});

for (const width of [375, 320]) {
  test(`deal desk and owner inbox fit a ${width}px phone and pass WCAG AA`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/deals?deal=AU-1005');
    await expect(page.locator('#deal-title')).toBeVisible();
    await noOverflow(page);
    await axe(page);
    await page.setViewportSize({ width: 1440, height: 800 });
    await become(page, /Daniel/);
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/deals?deal=AU-1005');
    await expect(page.getByRole('article', { name: 'Urban Reach Media request' })).toBeVisible();
    await noOverflow(page);
    await axe(page);
  });
}
