import { expect, test } from './workspace-fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { appsForPersona, architectureApps, architectureWorkflows, ecosystemAreas, ecosystemLoop, personasForApp } from '../src/domain/architecture';
import { moduleNames, personas } from '../src/domain/config';

async function expectNoOverflow(page: Page) {
  const size = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth, route: location.hash }));
  expect(size.actual, JSON.stringify(size)).toBeLessThanOrEqual(size.width + 1);
}
async function expectAccessible(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) }))).toEqual([]);
}

test('navbar opens an independent, contextual architecture page and returns without mutating the workspace', async ({ page }) => {
  await page.goto('/#/planner');
  await expect(page.getByRole('heading', { name: 'Planner' })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('allunite-one.workspace.v1'));
  await page.getByRole('link', { name: 'Platform architecture', exact: true }).click();
  await expect(page).toHaveURL(/#\/architecture\?app=planner$/);
  await expect(page.getByRole('heading', { name: 'Different roles. One connected world.' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.brand')).toHaveText(['allunite one', 'allunite one']);
  await expect(page.locator('.brand-symbol')).toHaveCount(0);
  await expect(page.locator('.arch-detail h2')).toHaveText('Planner');
  await page.locator('.arch-people').getByRole('button', { name: 'Explore Finance manager persona: Ana', exact: true }).click();
  await page.locator('.arch-apps').getByRole('button', { name: 'Explore Field operations app', exact: true }).click();
  await page.getByRole('button', { name: 'Show full platform', exact: true }).click();
  await page.reload();
  await expect(page.locator('.arch-detail h2')).toHaveText('A whole platform. Not a collection of silos.');
  expect(await page.evaluate(() => localStorage.getItem('allunite-one.workspace.v1'))).toBe(before);
  await page.getByRole('link', { name: 'Back to workspace', exact: true }).click();
  await expect(page).toHaveURL(/#\/planner$/);
  await expect(page.getByRole('button', { name: 'Switch persona', exact: true })).toHaveText('SL');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Platform architecture', exact: true }).click();
  await expect(page).toHaveURL(/#\/architecture$/);
});

test('every persona and app has reciprocal highlights, aligned features and a default workflow', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto('/#/architecture');
  const people = page.locator('.arch-people');
  const apps = page.locator('.arch-apps');
  await expect(people.locator('[data-persona]')).toHaveCount(15);
  await expect(apps.locator('[data-app]')).toHaveCount(18);
  for (const persona of personas) {
    await people.locator(`[data-persona="${persona.id}"]`).click();
    await expect(people.locator(`[data-persona="${persona.id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(apps.locator('[data-connected="true"]')).toHaveCount(appsForPersona(persona.id).length);
    await expect(page.locator('.arch-detail h2')).toHaveText(`${persona.name}'s world`);
    await expect(page.locator('.arch-persona-features > div')).toHaveCount(appsForPersona(persona.id).length);
    await expect(page.locator('.arch-workflow-steps [data-highlighted="true"]')).not.toHaveCount(0);
  }
  for (const app of architectureApps) {
    await apps.locator(`[data-app="${app.id}"] > button`).click();
    await expect(apps.locator(`[data-app="${app.id}"] > button`)).toHaveAttribute('aria-pressed', 'true');
    await expect(people.locator('[data-connected="true"]')).toHaveCount(personasForApp(app.id).length);
    await expect(page.locator('.arch-detail h2')).toHaveText(moduleNames[app.id]);
    await expect(page.locator('.arch-feature-list li')).toHaveCount(app.features.length);
    await expect(page.locator('.arch-connected-people > button')).toHaveCount(personasForApp(app.id).length);
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('workflow steps preserve the selected journey, query links survive refresh and browser history works', async ({ page }) => {
  await page.goto('/#/architecture?persona=crew');
  await expect(page.locator('.arch-workflow-heading h3')).toHaveText('Static posting & proof');
  await expect(page.locator('.arch-workflow-steps [data-highlighted="true"]')).toHaveCount(2);
  await page.locator('.arch-workflow-steps .arch-step-app').last().click();
  await expect(page).toHaveURL(/app=reports&journey=posting$/);
  await expect(page.locator('.arch-workflow-heading h3')).toHaveText('Static posting & proof');
  await expect(page.locator('.arch-workflow-steps [data-highlighted="true"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.arch-detail h2')).toHaveText('Reports & proof');
  await expect(page.locator('.arch-workflow-heading h3')).toHaveText('Static posting & proof');
  await page.locator('.arch-people [data-persona="admin"]').click();
  await expect(page.locator('.arch-workflow-heading h3')).toHaveText('Platform & assurance');
  await page.goBack();
  await expect(page.locator('.arch-detail h2')).toHaveText('Reports & proof');
  for (const workflow of architectureWorkflows) {
    await page.locator('.arch-journey-picker').getByRole('button', { name: new RegExp(workflow.name) }).click();
    await expect(page.locator('.arch-workflow-heading h3')).toHaveText(workflow.name);
    await expect(page.locator('.arch-workflow-steps > li')).toHaveCount(workflow.steps.length);
  }
});

test('architecture selection errors are explicit and the full-platform control clears them', async ({ page }) => {
  for (const query of ['app=unknown', 'persona=unknown', 'app=planner&persona=crew', 'app=', 'persona=', 'journey=unknown', 'journey=', 'area=unknown', 'area=', 'area=supply&app=inventory', 'area=supply&persona=ops']) {
    await page.goto(`/#/architecture?${query}`);
    await expect(page.getByRole('alert')).toContainText('selection is not recognised');
    await expect(page.locator('.arch-app-card')).toHaveCount(18);
    await page.getByRole('button', { name: 'Show full platform', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/architecture$/);
  }
});

test('architecture and the navbar CTA fit desktop, tablet and small phones', async ({ page }) => {
  for (const width of [1440, 1280, 1024, 768, 540, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/planner');
    await expect(page.getByRole('link', { name: 'Platform architecture', exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await page.getByRole('link', { name: 'Platform architecture', exact: true }).click();
    await expect(page.locator('.arch-detail h2')).toHaveText('Planner');
    if (width <= 1100) {
      await expect(page.locator('.arch-detail h2')).toBeInViewport();
      await page.getByRole('navigation', { name: 'Explore architecture', exact: true }).getByRole('button', { name: 'People', exact: true }).click();
      await expect(page.locator('#arch-people-title')).toBeInViewport();
    }
    await expectNoOverflow(page);
    await page.locator('.arch-people [data-persona="admin"]').click();
    await expect(page.locator('.arch-persona-features > div')).toHaveCount(18);
    await expectNoOverflow(page);
    await page.locator('.arch-apps [data-app="agents"] > button').click();
    await expect(page.locator('.arch-connected-people > button')).toHaveCount(15);
    await expectNoOverflow(page);
  }
});

test('architecture overview, role focus, app focus and mobile controls pass automated accessibility checks', async ({ page, browserName }) => {
  await page.goto('/#/architecture');
  await expect(page.locator('h1')).toBeVisible();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to architecture', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expectAccessible(page);
  await page.locator('.arch-people [data-persona="approver"]').click();
  await expectAccessible(page);
  await page.locator('.arch-apps [data-app="finance"] > button').click();
  await expectAccessible(page);
  for (const area of ecosystemAreas) {
    await page.locator(`.eco-node[data-area="${area.id}"]`).click();
    await expectAccessible(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expectAccessible(page);
});

test('ecosystem areas reveal real people, apps and handoffs and highlight the detailed atlas', async ({ page }) => {
  await page.goto('/#/architecture');
  await expect(page.getByRole('group', { name: 'Interactive ecosystem map', exact: true }).getByRole('button')).toHaveCount(6);
  await expect(page.locator('.eco-physical-world')).toContainText('Digital screens');
  await expect(page.locator('.eco-physical-world')).toContainText('Static billboards');
  for (const area of ecosystemAreas) {
    await page.locator(`.eco-node[data-area="${area.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`area=${area.id}$`));
    await expect(page.locator(`.eco-node[data-area="${area.id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.eco-node[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('.eco-connections [data-connected="true"]')).toHaveCount(1);
    await expect(page.locator('#ecosystem-detail-title')).toHaveText(area.name);
    await expect(page.locator('.eco-exchange dd')).toHaveText([area.receives, area.shares]);
    await expect(page.locator('.eco-people button')).toHaveCount(area.people.length);
    await expect(page.locator('.eco-app-links button')).toHaveText(area.apps.map(id => moduleNames[id]));
    await expect(page.locator('.arch-apps [data-connected="true"]')).toHaveCount(area.apps.length);
    await expect(page.locator('.arch-people [data-connected="true"]')).toHaveCount(area.people.length);
    await expect(page.locator('.arch-detail h2')).toHaveText(area.name);
    await expect(page.locator('.arch-persona-features > div')).toHaveCount(area.apps.length);
    await expect(page.locator('.arch-workflow-heading h3')).toHaveText(architectureWorkflows.find(workflow => workflow.id === area.workflow)!.name);
    const steps = architectureWorkflows.find(workflow => workflow.id === area.workflow)!.steps.filter(step => area.apps.includes(step.app));
    await expect(page.locator('.arch-workflow-steps [data-highlighted="true"]')).toHaveCount(steps.length);
    await page.getByRole('button', { name: 'Follow the handoffs', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`area=${area.id}&journey=${area.workflow}$`));
    await expect(page.locator('#arch-workflows-title')).toBeInViewport();
  }
});

test('ecosystem deep links, feedback loop and reciprocal exploration preserve history and workspace state', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await page.goto('/#/planner');
  await expect(page.locator('h1')).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('allunite-one.workspace.v1'));
  await page.getByRole('link', { name: 'Platform architecture', exact: true }).click();
  await expect(page.locator('.eco-node[data-area="demand"]')).toHaveAttribute('data-connected', 'true');
  await page.locator('.eco-node[data-area="supply"]').click();
  await page.reload();
  await expect(page.locator('#ecosystem-detail-title')).toHaveText('Media owners & places');
  await page.locator('.eco-app-links').getByRole('button', { name: 'Explore inventory', exact: true }).click();
  await expect(page).toHaveURL(/app=inventory$/);
  await expect(page.locator('.arch-detail h2')).toHaveText('Explore inventory');
  await expect(page.locator('.eco-node[data-area="supply"]')).toHaveAttribute('data-connected', 'true');
  await page.goBack();
  await expect(page.locator('#ecosystem-detail-title')).toHaveText('Media owners & places');
  await page.goForward();
  await expect(page.locator('.arch-detail h2')).toHaveText('Explore inventory');
  await page.goBack();
  await page.locator('.eco-people').getByRole('button', { name: 'Explore Inventory & operations persona: Tom', exact: true }).click();
  await expect(page).toHaveURL(/persona=ops$/);
  for (const area of ecosystemAreas) {
    await expect(page.locator(`.eco-node[data-area="${area.id}"]`)).toHaveAttribute('data-connected', String(area.people.includes('ops')));
  }
  for (const step of ecosystemLoop) {
    await page.locator('.eco-feedback').getByRole('button', { name: new RegExp(step.label) }).click();
    await expect(page).toHaveURL(new RegExp(`area=${step.area}$`));
    await expect(page.locator('#ecosystem-detail-title')).toHaveText(ecosystemAreas.find(area => area.id === step.area)!.name);
  }
  await page.getByRole('button', { name: 'Show the whole ecosystem', exact: true }).click();
  await expect(page).toHaveURL(/#\/architecture$/);
  await expect(page.locator('.eco-node[data-connected="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('allunite-one.workspace.v1'))).toBe(before);
  await page.getByRole('link', { name: 'Back to workspace', exact: true }).click();
  await expect(page).toHaveURL(/#\/planner$/);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('ecosystem map and every selected area fit desktop, tablet and phones with accessible mobile navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/architecture');
  for (const width of [1440, 1280, 1101, 1024, 900, 768, 540, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoOverflow(page);
    for (const area of ecosystemAreas) {
      await page.locator(`.eco-node[data-area="${area.id}"]`).click();
      await expect(page.locator('#ecosystem-detail-title')).toHaveText(area.name);
      if (width <= 900) {
        await expect(page.locator('#ecosystem-detail-title')).toBeInViewport();
        await page.getByRole('navigation', { name: 'Explore architecture', exact: true }).getByRole('button', { name: 'Map', exact: true }).click();
        await expect(page.locator('#ecosystem-title')).toBeInViewport();
      }
      await expectNoOverflow(page);
    }
  }
});

test('ecosystem keyboard selection and reopening the same area bring mobile details into view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/architecture?area=demand');
  await expect(page.locator('#ecosystem-detail-title')).toBeInViewport();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('navigation', { name: 'Explore architecture', exact: true }).getByRole('button', { name: 'Map', exact: true }).click();
    const node = page.getByRole('button', { name: 'Explore Brands & agencies ecosystem area', exact: true });
    await node.focus();
    await page.keyboard.press('Enter');
    await expect(node).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#ecosystem-detail-title')).toBeInViewport();
  }
});
