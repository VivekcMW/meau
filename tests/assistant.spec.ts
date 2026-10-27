import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './workspace-fixture';
import { compact } from '../src/domain/config';
import { canSeeCampaign, metrics } from '../src/domain/engine';
import { seedWorkspace } from '../src/domain/fixtures';
import type { Workspace } from '../src/domain/model';

const workspaceKey = 'allunite-one.workspace.v1';
const panel = (page: Page) => page.getByRole('dialog', { name: 'Workflow assistant', exact: true });
const latest = (page: Page) => panel(page).locator('.chat-assistant').last();
async function seed(page: Page, overrides: Partial<Workspace> = {}, route = '/') {
  const w = { ...seedWorkspace(), ...overrides };
  await page.addInitScript(({ key, w }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(w));
  }, { key: workspaceKey, w });
  await page.goto(route);
  await expect(page.locator('main h1')).toBeVisible();
  return w;
}
async function open(page: Page) {
  await page.locator('.topbar').getByRole('button', { name: 'Workflow assistant', exact: true }).click();
  await expect(panel(page)).toBeVisible();
}
async function say(page: Page, text: string) {
  await panel(page).getByRole('textbox', { name: 'Ask assistant' }).fill(text);
  await panel(page).getByRole('button', { name: 'Send message', exact: true }).click();
}
async function accessibility(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
}

test('assistant is exactly twenty percent wider and carries a response-driven brief into the already-open Planner', async ({ page }) => {
  const w = await seed(page, {}, '/#/planner');
  await open(page);
  await expect(panel(page)).toHaveCSS('width', `${385 * 1.2}px`);
  await panel(page).getByRole('button', { name: 'Help me plan a campaign', exact: true }).click();
  await expect(latest(page).getByRole('heading')).toHaveText('What should this campaign achieve, Sofia?');
  await panel(page).getByRole('button', { name: 'Drive store visits', exact: true }).click();
  await expect(latest(page).getByRole('heading')).toHaveText('Store visits in Copenhagen');
  await say(page, 'Milan please');
  await expect(latest(page).getByRole('heading')).toHaveText('Store visits in Milan');
  await panel(page).getByRole('button', { name: 'Explain why', exact: true }).click();
  await expect(latest(page)).toContainText('You chose store visits');
  await accessibility(page);
  await latest(page).getByRole('button', { name: 'Review brief in Planner', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Campaign brief', exact: true })).toHaveValue('Drive store visits in Milan for our neighbourhood campaign.');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
  expect(saved.campaigns).toEqual(JSON.parse(JSON.stringify(w.campaigns)));
  expect(saved.persona).toBe('planner');
});

test('current-campaign questions retain their context through explanations and delivery follow-ups without taking action', async ({ page }) => {
  const w = await seed(page, {}, '/#/deals?deal=AU-1005');
  await open(page);
  await panel(page).getByRole('button', { name: 'What’s next for Your next chapter?', exact: true }).click();
  await expect(latest(page)).toContainText('Vista Outdoor');
  await expect(latest(page)).toContainText('Send proposal');
  await say(page, 'why?');
  await expect(latest(page)).toContainText('same workflow used by My tasks');
  await panel(page).getByRole('button', { name: 'How is delivery looking?', exact: true }).click();
  await expect(latest(page).getByRole('heading')).toHaveText('Your next chapter · delivery');
  await expect(latest(page).locator('.assistant-facts dd').first()).toHaveText('0');
  await say(page, 'Teleport the campaign');
  await expect(latest(page).getByRole('heading')).toHaveText('Let’s narrow that down');
  const campaigns = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).campaigns, workspaceKey);
  expect(campaigns).toEqual(JSON.parse(JSON.stringify(w.campaigns)));
});

test('conversation survives closing, supports reset and starts fresh after market or persona changes', async ({ page }) => {
  await seed(page);
  await open(page);
  await panel(page).getByRole('button', { name: 'Explain Direct deals', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await open(page);
  await expect(latest(page).getByRole('heading')).toHaveText('Agree the terms, then book');
  await panel(page).getByRole('button', { name: 'Start a new conversation', exact: true }).click();
  await expect(panel(page).locator('.chat-message')).toHaveCount(0);
  await panel(page).getByRole('button', { name: 'How is delivery looking?', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Market filter', exact: true }).selectOption('BR');
  await open(page);
  await expect(panel(page).locator('.chat-message')).toHaveCount(0);
  await expect(panel(page).locator('.assistant-context')).toContainText('Brazil');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Switch persona', exact: true }).click();
  await page.getByRole('button', { name: 'AC Ana Finance manager', exact: true }).click();
  await open(page);
  await panel(page).getByRole('button', { name: 'Help me plan a campaign', exact: true }).click();
  await expect(latest(page)).toContainText('I won’t switch your role');
  await latest(page).getByRole('button', { name: 'Open my tasks', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('My tasks');
  await expect(page.getByRole('button', { name: 'Switch persona', exact: true })).toHaveText('AC');
});

test('delivery totals obey market and role filtering and keyboard focus stays in the drawer', async ({ page, browserName }) => {
  const w = await seed(page, { market: 'BR', persona: 'advertiser' });
  await open(page);
  await panel(page).getByRole('button', { name: 'How is delivery looking?', exact: true }).click();
  const delivered = w.campaigns.filter(c => canSeeCampaign(w, c) && c.market === 'BR').reduce((n, c) => n + metrics(c).delivered, 0);
  await expect(latest(page).locator('.assistant-facts dd').first()).toHaveText(compact(delivered));
  await expect(latest(page)).toContainText('filtered to Brazil');
  await page.keyboard.press(browserName === 'webkit' ? 'Meta+k' : 'Control+k');
  await expect(page.getByRole('dialog', { name: 'Search workspace', exact: true })).toHaveCount(0);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await panel(page).evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await accessibility(page);
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('.topbar').getByRole('button', { name: 'Workflow assistant', exact: true })).toBeFocused();
});

test('paused mode points to settings and answers-only mode does not prepare a draft', async ({ page }) => {
  await seed(page, { agentEnabled: false, agentLevel: 'A0' });
  await open(page);
  await expect(panel(page)).toContainText('Your guide is paused');
  await panel(page).getByRole('button', { name: 'Show assistant settings', exact: true }).click();
  await expect(latest(page)).toContainText('The assistant is paused');
  await latest(page).getByRole('button', { name: 'Open Agent settings', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Agent hub');
  await page.getByRole('button', { name: 'A1 Answers', exact: true }).click();
  await open(page);
  await panel(page).getByRole('button', { name: 'Start a new conversation', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Help me plan a campaign', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Build awareness', exact: true }).click();
  await expect(latest(page)).toContainText('answers-only mode');
  await expect(latest(page).getByRole('button', { name: 'Review brief in Planner', exact: true })).toHaveCount(0);
  await latest(page).getByRole('button', { name: 'Open Planner', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Campaign brief', exact: true })).toHaveValue('');
});

for (const width of [768, 390, 320]) test(`assistant stays within ${width}px and keeps the composer accessible in a long conversation`, async ({ page }) => {
  await page.setViewportSize({ width, height: 660 });
  await seed(page);
  await open(page);
  await expect(panel(page)).toHaveCSS('width', `${Math.min(462, width)}px`);
  await panel(page).getByRole('button', { name: 'Help me plan a campaign', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Show an example', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Drive store visits', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Explain why', exact: true }).click();
  await say(page, 'x'.repeat(180));
  await expect(latest(page).getByRole('heading')).toHaveText('Let’s narrow that down');
  const sizes = await panel(page).evaluate(el => {
    const composer = el.querySelector('.assistant-composer')!.getBoundingClientRect();
    return { width: el.clientWidth, scroll: el.scrollWidth, composerBottom: composer.bottom, height: innerHeight, docScroll: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  expect(sizes.docScroll).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.composerBottom).toBeLessThanOrEqual(sizes.height + 1);
  await expect(panel(page).getByRole('textbox', { name: 'Ask assistant' })).toBeInViewport();
  await accessibility(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-footer')).toBeInViewport();
});
