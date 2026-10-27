import { expect, test } from './workspace-fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function asAdmin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
  await page.getByRole('button', { name: 'KN Kristina Platform admin' }).click();
  await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible();
}
async function noPageOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    route: location.hash, width: window.innerWidth, scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('main *')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width && r.right > window.innerWidth + 1 && !e.closest('.table-scroll,.tabs,.inventory-map,.world-map,.scene-board,.creative-art,.frame-scene,.planner-hero,.quick-brief,.marketplace-intro,.report-context,.plan-options');
    }).slice(0, 5).map(e => e.className),
  }));
  expect(sizes.scroll, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.width + 1);
  const layout = await page.locator('.app-main').evaluate(element => {
    const main = element.querySelector('main')!;
    const footer = element.querySelector('footer')!;
    return { viewport: innerHeight, footerBottom: footer.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top, mainBottom: main.getBoundingClientRect().bottom, width: main.clientWidth, scroll: main.scrollWidth };
  });
  expect(Math.abs(layout.viewport - layout.footerBottom), JSON.stringify(layout)).toBeLessThanOrEqual(1);
  expect(layout.mainBottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.footerTop + 1);
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width + 1);
}
test('desktop shell, local-only requests, search and keyboard skip link', async ({ page, browserName }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.locator('.sidebar-brand .brand')).toHaveText('allunite one');
  await expect(page.locator('.brand-symbol')).toHaveCount(0);
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Search campaigns, places and apps' }).click();
  await page.getByRole('textbox', { name: 'Search workspace' }).fill('A little more outside');
  await page.getByRole('button', { name: /A little more outside/ }).click();
  await expect(page.getByRole('heading', { name: 'A little more outside', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test('direct campaign completes all persona handoffs through paid invoice', async ({ page }) => {
  await page.goto('/#/planner');
  await page.getByRole('textbox', { name: 'Campaign brief' }).fill('Launch a new collection in Copenhagen.');
  await page.getByRole('button', { name: 'Fine-tune' }).click();
  await page.getByLabel('Campaign name', { exact: true }).fill('Northern light launch');
  await page.getByRole('button', { name: 'Find my audience' }).click();
  await page.locator('.plan-option.recommended').getByRole('button', { name: 'Make this my plan' }).click();
  await expect(page.getByRole('heading', { name: 'Northern light launch', exact: true })).toBeVisible();
  const campaignUrl = page.url().split('?')[0];
  const alerts: string[] = [];
  for (let i = 0; i < 55; i++) {
    if (await page.getByText('All wrapped up', { exact: true }).count()) break;
    const button = page.locator('.next-action-banner').getByRole('button');
    await expect(button).toBeVisible();
    const label = await button.innerText();
    await button.click();
    if (label === 'Complete posting jobs') {
      await expect(page.locator('.field-job').first()).toBeVisible();
      await page.locator('.field-job').first().click();
      await page.getByRole('button', { name: 'Submit demo posting proof' }).click();
      await expect(page.getByRole('heading', { name: 'Posted. Proven. Connected.' })).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
      await page.goto(campaignUrl);
      await expect(page.getByRole('heading', { name: 'Northern light launch', exact: true })).toBeVisible();
    }
    if (await page.getByRole('alert').count()) alerts.push(`${label}: ${await page.getByRole('alert').innerText()}`);
  }
  expect(alerts).toEqual([]);
  await expect(page.getByText('All wrapped up', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('All wrapped up', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Financials', exact: true }).click();
  await page.getByRole('button', { name: 'View invoice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'PAID', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Delivery & proof', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export delivery', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/-delivery\.csv$/);
});
test('mobile self-serve booking preserves the cart and uses local payment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/marketplace');
  await page.locator('.frame-card').filter({ has: page.getByText('Available', { exact: true }) }).first().getByRole('button', { name: 'Add to booking' }).click();
  await page.getByRole('button', { name: /Your booking/ }).click();
  await page.getByLabel('Campaign name', { exact: true }).fill('Bakery launch');
  await expect(page.getByRole('radio', { name: 'Pix Simulated', exact: true })).toBeChecked();
  await page.getByLabel('I understand no money will move.').check();
  await page.getByRole('button', { name: 'Confirm demo booking', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bakery launch', exact: true })).toBeVisible();
  await page.locator('.next-action-banner').getByRole('button', { name: 'Use demo creative' }).click();
  await expect(page.getByRole('button', { name: 'Continue as Ben' })).toBeVisible();
  await noPageOverflow(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bakery launch', exact: true })).toBeVisible();
});
test('guaranteed supply deal arrives at the trader and can be accepted', async ({ page }) => {
  await page.goto('/#/ssp');
  await page.getByRole('button', { name: 'Continue as Priya', exact: true }).click();
  await page.getByRole('button', { name: 'Create guaranteed deal' }).click();
  await page.getByLabel('Deal name', { exact: true }).fill('Guaranteed Copenhagen');
  await page.getByRole('button', { name: 'Create & offer deal' }).click();
  await expect(page.getByRole('heading', { name: 'Guaranteed Copenhagen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue as Marcus' }).click();
  await page.getByRole('button', { name: 'Accept guaranteed deal', exact: true }).click();
  await expect(page.locator('.next-action-banner').getByRole('button', { name: 'Use demo creative' })).toBeVisible();
  await page.getByRole('button', { name: 'Activity', exact: false }).click();
  await expect(page.locator('main').getByText('Accepted guaranteed deal and reserved priority-2 capacity', { exact: true })).toBeVisible();
});
test('field proof rejects offsite submissions and updates the buyer report', async ({ page }) => {
  await asAdmin(page);
  await page.goto('/#/campaigns/AU-1008?tab=plan');
  for (let i = 0; i < 8; i++) {
    const label = await page.locator('.next-action-banner').getByRole('button').innerText();
    if (label.includes('Use demo creative')) break;
    await page.locator('.next-action-banner').getByRole('button').click();
  }
  await page.goto('/#/field?campaign=AU-1008');
  const jobs = page.locator('.field-job');
  await expect(jobs.first()).toBeVisible();
  await jobs.first().click();
  await page.getByLabel('Simulated distance from frame (metres)').fill('51');
  await page.getByRole('button', { name: 'Submit demo posting proof' }).click();
  await expect(page.getByRole('alert')).toContainText('within 50 m');
  await page.getByLabel('Simulated distance from frame (metres)').fill('50');
  await page.getByRole('button', { name: 'Submit demo posting proof' }).click();
  await expect(page.getByRole('heading', { name: 'Posted. Proven. Connected.' })).toBeVisible();
});
test('finance exceptions reconcile from evidence and publish local policies', async ({ page }) => {
  await asAdmin(page);
  await page.goto('/#/finance');
  await expect(page.locator('.stat-card').filter({ hasText: 'Automatically matched' })).toContainText('94%');
  await page.getByRole('button', { name: 'Review exceptions' }).click();
  await page.getByRole('button', { name: 'Apply suggested resolution' }).click();
  await expect(page.getByRole('heading', { name: 'Everything adds up.' })).toBeVisible();
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'Workflow policies', exact: true }).click();
  await page.getByLabel('Approval limit', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Publish demo policies' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Workflow policies', exact: true }).click();
  await expect(page.getByLabel('Approval limit', { exact: true })).toHaveValue('25000');
});
test('all modules render without page overflow on desktop, tablet and narrow phone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await asAdmin(page);
  const routes = ['', 'planner', 'deals', 'campaigns', 'inventory', 'marketplace', 'creative', 'schedule', 'field', 'finance', 'ssp', 'dsp', 'reports', 'measure', 'data', 'attribution', 'agents', 'admin', 'developer', 'tasks', 'campaigns/AU-1001', 'campaigns/AU-1009', 'deals?deal=AU-1005'];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`/#/${route}`);
      await expect(page.locator('main h1').or(page.locator('main .empty-state h3')).first()).toBeVisible();
      await noPageOverflow(page);
      await expect(page.getByText('This view needs a fresh start.')).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
test('overview meets automated WCAG AA checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const heading = document.querySelector('main h1');
    const paragraph = document.querySelector('main p');
    return {
      primary: heading && getComputedStyle(heading).fontFamily,
      secondary: paragraph && getComputedStyle(paragraph).fontFamily,
      loaded: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family.replaceAll('"', '')),
    };
  });
  expect(fonts.primary?.split(',')[0].replaceAll('"', '').trim()).toBe('Poppins');
  expect(fonts.secondary?.split(',')[0].replaceAll('"', '').trim()).toBe('Roboto');
  expect(fonts.loaded).toEqual(expect.arrayContaining(['Poppins', 'Roboto']));
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
});
for (const route of ['planner', 'deals', 'deals?deal=AU-1009', 'campaigns', 'inventory', 'marketplace', 'creative', 'schedule', 'field', 'finance', 'ssp', 'dsp', 'reports', 'measure', 'data', 'attribution', 'agents', 'admin', 'developer', 'tasks', 'campaigns/AU-1001', 'campaigns/AU-1005']) {
  test(`${route} meets automated WCAG AA checks`, async ({ page }) => {
    await asAdmin(page);
    await page.goto(`/#/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
  });
}
test('creative upload survives refresh and appears in the local read-only share', async ({ page, context }) => {
  await asAdmin(page);
  await page.goto('/#/campaigns/AU-1008');
  for (let i = 0; i < 8; i++) {
    const action = page.locator('.next-action-banner').getByRole('button');
    if ((await action.innerText()).includes('Use demo creative')) break;
    await action.click();
  }
  await expect(page.locator('.next-action-banner').getByRole('button', { name: 'Use demo creative' })).toBeVisible();
  await page.getByRole('button', { name: 'Creative', exact: true }).click();
  const smallImage = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const input = page.getByLabel('Upload campaign creative', { exact: true });
  await input.setInputFiles({ name: 'too-small.png', mimeType: 'image/png', buffer: Buffer.from(smallImage, 'base64') });
  await expect(page.getByRole('alert')).toContainText('at least 320');
  const creative = await page.locator('.creative-detail-grid > .creative-art').screenshot();
  await input.setInputFiles({ name: 'demo-creative.png', mimeType: 'image/png', buffer: creative });
  await expect(page.locator('.uploaded-creative')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.uploaded-creative')).toBeVisible();
  expect(await page.locator('.uploaded-creative').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThanOrEqual(320);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const popup = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open preview' }).click();
  const shared = await popup;
  await expect(shared.locator('.uploaded-creative')).toBeVisible();
  await expect(shared.getByRole('heading', { name: 'The city is your runway', exact: true })).toBeVisible();
  await expect(shared.locator('input,textarea,select')).toHaveCount(0);
});
test('audience context reaches planner inventory and confirmed reset restores fixtures', async ({ page }) => {
  await asAdmin(page);
  await page.goto('/#/data');
  await page.getByRole('button', { name: 'Build an audience' }).click();
  await page.getByLabel('Audience name', { exact: true }).fill('Morning commuters');
  await page.getByRole('combobox', { name: 'City', exact: true }).selectOption('BR');
  await page.getByRole('combobox', { name: 'Where they spend time', exact: true }).selectOption('Transit');
  await page.getByRole('button', { name: 'Save audience', exact: true }).click();
  await page.getByRole('button', { name: 'Turn this into a plan' }).click();
  await expect(page.getByLabel('Plan market')).toHaveValue('BR');
  await expect(page.getByText('Planning for Morning commuters · Transit locations', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find my audience' }).click();
  await page.locator('.plan-option.recommended').getByRole('button', { name: 'Make this my plan' }).click();
  await expect(page.getByRole('heading', { name: 'Morning commuters campaign', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Morning commuters campaign', exact: true })).toBeVisible();
  await asAdmin(page);
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page.goto('/#/campaigns');
  await expect(page.getByRole('link', { name: /Morning commuters campaign/ })).toHaveCount(0);
  await expect(page.locator('.campaign-table tbody tr')).toHaveCount(9);
});
test('mobile navigation and context dialog meet automated accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
  const menu = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(menu.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
  await page.getByRole('dialog').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
  const dialog = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dialog.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
  await noPageOverflow(page);
});
