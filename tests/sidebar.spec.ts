import { expect, test } from './workspace-fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function checkWorkspaceLayout(page: Page, sidebarWidth: number) {
  const layout = await page.locator('.app-main').evaluate(element => {
    const main = element.querySelector('main')!;
    const footer = element.querySelector('footer')!;
    return {
      left: element.getBoundingClientRect().left,
      width: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      footerBottom: footer.getBoundingClientRect().bottom,
      footerTop: footer.getBoundingClientRect().top,
      mainBottom: main.getBoundingClientRect().bottom,
      contentWidth: main.clientWidth,
      contentScrollWidth: main.scrollWidth,
    };
  });
  expect(layout.left).toBe(sidebarWidth);
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.contentScrollWidth).toBeLessThanOrEqual(layout.contentWidth + 1);
  expect(Math.abs(layout.footerBottom - layout.viewportHeight)).toBeLessThanOrEqual(1);
  expect(layout.mainBottom).toBeLessThanOrEqual(layout.footerTop + 1);
}

test('sidebar collapses to labelled icons, preserves navigation and expands without a selected stroke', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.getByRole('complementary', { name: 'Workspace sidebar', exact: true });
  const collapse = sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar.getByRole('link', { name: 'Overview', exact: true })).toHaveCSS('box-shadow', 'none');
  await collapse.focus();
  await page.keyboard.press('Enter');
  const expand = sidebar.getByRole('button', { name: 'Expand sidebar', exact: true });
  await expect(expand).toBeFocused();
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar).toHaveCSS('width', '76px');
  await expect(sidebar.locator('.brand')).toHaveText('allunite one');
  for (const link of await sidebar.locator('.primary-nav > a').all()) {
    await expect(link).toHaveAccessibleName(/\S/);
    await expect(link).toHaveAttribute('title', /\S/);
    await expect(link.locator('svg')).toBeVisible();
    await expect(link.locator('span').first()).toBeHidden();
  }
  await sidebar.getByRole('link', { name: 'Planner', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Planner');
  await expect(sidebar.getByRole('link', { name: 'Planner', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Planner', exact: true })).toHaveCSS('box-shadow', 'none');
  await expect(sidebar.getByRole('link', { name: 'Planner', exact: true })).toHaveCSS('border-left-width', '0px');
  await checkWorkspaceLayout(page, 76);
  await sidebar.locator('.more-tools summary').click();
  await sidebar.getByRole('link', { name: 'Attribution', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Attribution');
  await expect(sidebar).toHaveCSS('width', '76px');
  await sidebar.getByRole('button', { name: 'All apps', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'All apps', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await sidebar.getByRole('button', { name: 'Switch workspace role: Sofia, Agency planner', exact: true }).click();
  await page.getByRole('button', { name: 'AC Ana Finance manager', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Finance');
  await expect(sidebar).toHaveCSS('width', '76px');
  await sidebar.getByRole('button', { name: 'Help & getting started', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Getting started', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expand.focus();
  await page.keyboard.press('Space');
  await expect(collapse).toBeFocused();
  await expect(sidebar).toHaveCSS('width', '224px');
  await expect(sidebar.getByRole('link', { name: 'Finance', exact: true }).locator('span')).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Finance', exact: true })).toHaveCSS('box-shadow', 'none');
  await checkWorkspaceLayout(page, 224);
});

test('collapsed sidebar passes automated AA checks and mobile navigation retains full labels', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.locator('.sidebar');
  await sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(sidebar).toHaveCSS('width', '76px');
    await checkWorkspaceLayout(page, 76);
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(sidebar).toBeHidden();
    await checkWorkspaceLayout(page, 0);
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
    await expect(drawer.getByRole('link', { name: 'Planner', exact: true }).locator('span')).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Overview', exact: true })).toHaveCSS('box-shadow', 'none');
    await expect(drawer.getByRole('button', { name: 'Expand sidebar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidebar).toHaveCSS('width', '76px');
  await sidebar.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await checkWorkspaceLayout(page, 224);
});

test('changing sidebar width keeps the active tour target and footer in view', async ({ page }) => {
  await page.goto('/');
  await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a role or app', exact: true }).click();
  await page.getByRole('button', { name: 'Start tour as Sofia', exact: true }).click();
  const guide = page.getByRole('complementary', { name: 'Guided tour', exact: true });
  await expect(guide).toContainText('Step 1 of 5');
  await page.locator('.sidebar').getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('.tour-highlight')).toBeInViewport();
  await expect(guide.getByRole('button', { name: 'Next', exact: true })).toBeInViewport();
  await checkWorkspaceLayout(page, 76);
  await page.locator('.sidebar').getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(page.locator('.tour-highlight')).toBeInViewport();
  await checkWorkspaceLayout(page, 224);
});
