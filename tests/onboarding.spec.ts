import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { architectureApps } from '../src/domain/architecture';
import { moduleNames, personas } from '../src/domain/config';
import { seedWorkspace } from '../src/domain/fixtures';
import { onboardingKey, tourPath, tourSteps } from '../src/domain/tours';
import type { TourSelection } from '../src/domain/tours';

const welcomeTitle = 'Find your way around AllUnite One';
const workspaceKey = 'allunite-one.workspace.v1';
const guide = (page: Page) => page.getByRole('complementary', { name: 'Guided tour', exact: true });

async function seed(page: Page) {
  const workspace = seedWorkspace();
  await page.addInitScript(({ key, workspace }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(workspace));
  }, { key: workspaceKey, workspace });
  return workspace;
}
async function assertLayout(page: Page) {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - innerWidth,
    main: document.querySelector('.page-content')!.scrollWidth - document.querySelector('.page-content')!.clientWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(1);
  expect(widths.main).toBeLessThanOrEqual(1);
  const footer = await page.locator('.app-footer').boundingBox();
  const main = await page.locator('.page-content').boundingBox();
  expect(Math.abs(footer!.y + footer!.height - page.viewportSize()!.height)).toBeLessThanOrEqual(1);
  expect(main!.y + main!.height).toBeLessThanOrEqual(footer!.y + 1);
  await expect(page.locator('.app-footer')).toBeInViewport();
}
async function checkSteps(page: Page, selection: TourSelection) {
  const steps = tourSteps(selection);
  for (let index = 0; index < steps.length; index++) {
    await expect(guide(page).getByRole('heading', { name: steps[index].title, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${tourPath(steps[index])}$`));
    await expect(page.locator('.tour-highlight')).toHaveCount(1);
    await expect(page.locator('.tour-highlight')).toBeInViewport();
    await assertLayout(page);
    await guide(page).getByRole('button', { name: index === steps.length - 1 ? 'Finish tour' : 'Next', exact: true }).click();
  }
  await expect(guide(page).getByRole('heading', { name: 'You are ready to explore.' })).toBeVisible();
}

for (const person of personas) test(`role tour: ${person.role} explains permitted workflow without changing campaigns`, async ({ page }) => {
  const initial = await seed(page);
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await welcome.locator('.welcome-option').filter({ has: page.getByText(person.role, { exact: true }) }).click();
  await expect(welcome.getByLabel('Your tour preview')).toContainText(`Explore as ${person.name}`);
  await welcome.getByRole('button', { name: `Start tour as ${person.name}`, exact: true }).click();
  await checkSteps(page, { kind: 'persona', id: person.id });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
  expect(saved.persona).toBe(person.id);
  expect(saved.campaigns).toEqual(initial.campaigns);
  await guide(page).getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await expect(guide(page)).toHaveCount(0);
});

for (const app of architectureApps) test(`app tour: ${moduleNames[app.id]} highlights all three real sections`, async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await welcome.getByRole('button', { name: 'By an app', exact: false }).click();
  await welcome.locator('.welcome-option').filter({ has: page.getByText(moduleNames[app.id], { exact: true }) }).click();
  await expect(welcome.getByLabel('Your tour preview')).toContainText(app.purpose);
  const selection = await welcome.getByLabel('Your tour preview').locator('.welcome-identity strong').textContent();
  const person = personas.find(person => selection === `Explore as ${person.name}`)!;
  await welcome.getByRole('button', { name: `Start tour as ${person.name}`, exact: true }).click();
  await checkSteps(page, { kind: 'app', id: app.id, persona: person.id });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).status, onboardingKey)).toBe('completed');
});

test('pause, refresh, resume, back, replay and change tour remain connected', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start tour as Sofia', exact: true }).click();
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide(page)).toContainText('Step 2 of 5');
  await page.reload();
  await expect(guide(page)).toContainText('Step 2 of 5');
  await guide(page).getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Overview');
  await guide(page).getByRole('button', { name: 'Pause tour', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved tour' })).toContainText('Agency planner');
  await page.reload();
  await expect(guide(page)).toHaveCount(0);
  await page.getByRole('region', { name: 'Saved tour' }).getByRole('button', { name: 'Resume tour', exact: true }).click();
  await expect(guide(page)).toContainText('Step 1 of 5');
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await guide(page).getByRole('button', { name: 'Pause tour', exact: true }).click();
  await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Replay tour', exact: true }).click();
  await expect(guide(page)).toContainText('Step 1 of 5');
  await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a role or app', exact: true }).click();
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await expect(welcome).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(welcome).toHaveCount(0);
  await expect(guide(page)).toBeVisible();
});

test('app preview names a role change and ordinary navigation pauses instead of hijacking', async ({ page }) => {
  const initial = await seed(page);
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await welcome.getByRole('button', { name: 'By an app', exact: false }).click();
  await welcome.locator('.welcome-option').filter({ has: page.getByText('Finance', { exact: true }) }).click();
  await expect(welcome.getByLabel('Your tour preview')).toContainText('Finance manager · Switches your demo role');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).persona, workspaceKey)).toBe('planner');
  await welcome.getByRole('button', { name: 'Start tour as Ana', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Finance');
  await page.locator('.primary-nav').getByRole('link', { name: 'Campaigns', exact: true }).click();
  await expect(guide(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Campaigns');
  await expect(guide(page)).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
  expect(saved.campaigns).toEqual(initial.campaigns);
  expect(saved.persona).toBe('finance');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).status, onboardingKey)).toBe('paused');
  await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Resume tour', exact: true }).click();
  await expect(guide(page)).toContainText('Step 1 of 3');
  await expect(page.locator('h1')).toHaveText('Finance');
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await guide(page).getByRole('button', { name: 'Finish tour', exact: true }).click();
  await expect(guide(page)).toContainText('You are ready to explore.');
  await page.locator('.primary-nav').getByRole('link', { name: 'Campaigns', exact: true }).click();
  await expect(guide(page)).toHaveCount(0);
});

test('skip and close remember the decision, and Help can open the chooser again', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore without a tour', exact: true }).click();
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Overview');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a role or app', exact: true }).click();
  await expect(page.getByRole('dialog', { name: welcomeTitle })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('first-visit deep links are not interrupted, but Overview still offers an introduction', async ({ page }) => {
  const initial = await seed(page);
  for (const route of ['/planner', `/campaigns/${initial.campaigns[0].id}`, '/architecture?app=finance', `/share/${initial.campaigns[0].id}`]) {
    await page.goto(`/#${route}`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('dialog', { name: welcomeTitle })).toHaveCount(0);
    await expect(guide(page)).toHaveCount(0);
  }
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: welcomeTitle })).toBeVisible();
});

test('corrupt tour state and save failures show explicit errors while keeping a usable tour', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, '{"status":"active","selection":{"kind":"persona","id":"unknown"},"step":99}');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Tour quota unavailable', 'QuotaExceededError');
      setItem.call(this, name, value);
    };
  }, onboardingKey);
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await expect(welcome.getByRole('alert')).toContainText('Saved tour progress could not be loaded');
  await welcome.getByRole('button', { name: 'Start tour as Sofia', exact: true }).click();
  await expect(guide(page).getByRole('alert')).toContainText('progress will be lost on refresh');
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide(page)).toContainText('Step 2 of 5');
  await expect(guide(page).getByRole('alert')).toBeVisible();
});

test('welcome traps keyboard focus, prevents conflicting search and meets automated AA checks', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await expect(welcome).toBeVisible();
  await page.waitForTimeout(250);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await welcome.getByRole('button', { name: 'Start tour as Sofia', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(welcome.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile and tablet tours keep the guidance, target and sticky footer usable', async ({ page }) => {
  for (const width of [1440, 1100, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    if (width === 1440) {
      await page.getByRole('button', { name: 'Start tour as Sofia', exact: true }).click();
    } else {
      await page.locator('.app-footer').getByRole('button', { name: 'Help', exact: true }).click();
      await page.getByRole('button', { name: 'Replay tour', exact: true }).click();
    }
    await expect(guide(page)).toContainText('Step 1 of 5');
    await expect(guide(page).getByRole('button', { name: 'Next', exact: true })).toBeInViewport();
    await expect(page.locator('.tour-highlight')).toBeInViewport();
    await assertLayout(page);
    await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
    await expect(guide(page)).toContainText('Step 2 of 5');
    await assertLayout(page);
    if (width === 390) {
      await page.waitForTimeout(250);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
    await guide(page).getByRole('button', { name: 'Pause tour', exact: true }).click();
  }
});

test('mobile selection brings its explanation into view before the explicit role switch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const initial = await seed(page);
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await expect(welcome).toBeVisible();
  await page.waitForTimeout(250);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await welcome.locator('.welcome-option').filter({ has: page.getByText('Field crew', { exact: true }) }).click();
  const preview = welcome.getByLabel('Your tour preview');
  await expect(preview.getByRole('heading', { name: 'Field crew', exact: true })).toBeInViewport();
  await expect(preview).toContainText('Explore as João');
  await expect(welcome.getByRole('button', { name: 'Start tour as João', exact: true })).toBeInViewport();
  await preview.getByRole('button', { name: 'Change selection', exact: true }).click();
  await welcome.getByRole('button', { name: 'By an app', exact: false }).click();
  await welcome.locator('.welcome-option').filter({ has: page.getByText('Finance', { exact: true }) }).click();
  await expect(preview.getByRole('heading', { name: 'Finance', exact: true })).toBeInViewport();
  await expect(preview).toContainText('Switches your demo role');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).persona, workspaceKey)).toBe(initial.persona);
  await welcome.getByRole('button', { name: 'Start tour as Ana', exact: true }).click();
  await expect(guide(page)).toContainText('Ana · Finance manager');
  await assertLayout(page);
});

test('empty market contexts finish safely without inventing an example campaign', async ({ page }) => {
  const workspace = { ...seedWorkspace(), persona: 'crew', market: 'UA' };
  await page.addInitScript(({ key, workspace }) => localStorage.setItem(key, JSON.stringify(workspace)), { key: workspaceKey, workspace });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start tour as João', exact: true }).click();
  await checkSteps(page, { kind: 'persona', id: 'crew' });
  await expect(guide(page).getByRole('button', { name: 'Open an example campaign', exact: true })).toHaveCount(0);
});

test('a missing tour target is explained and never prevents continuing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start tour as Sofia', exact: true }).click();
  await expect(page.locator('.tour-highlight')).toHaveCount(1);
  await page.locator('.overview-tasks').evaluate(element => element.remove());
  await expect(guide(page).getByRole('status')).toContainText('This section is not available');
  await guide(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide(page)).toContainText('Step 2 of 5');
  await expect(page.locator('.tour-highlight')).toHaveCount(1);
});

test('active guidance keeps its real target in view during live resize', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: welcomeTitle });
  await welcome.locator('.welcome-option').filter({ has: page.getByText('Inventory & operations', { exact: true }) }).click();
  await welcome.getByRole('button', { name: 'Start tour as Tom', exact: true }).click();
  for (const width of [1440, 390, 768, 320, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(guide(page)).toContainText('Step 1 of 5');
    await expect(page.locator('.tour-highlight')).toBeInViewport();
    await expect(guide(page).getByRole('button', { name: 'Next', exact: true })).toBeInViewport();
    await assertLayout(page);
  }
});
