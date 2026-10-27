import type { Page } from '@playwright/test';
import { expect, test } from './workspace-fixture';

// The journey animation runs through the existing workflow cards and follows the explorer selection.
const currentCard = (page: Page) => page.locator('.arch-workflow-steps > li[aria-current="step"] h4');
const progress = (page: Page) => page.locator('.arch-journey-progress');
const showCards = (page: Page) => page.locator('.arch-workflow-heading').scrollIntoViewIfNeeded();

test('a selected role walks only through the cards that role takes part in', async ({ page }) => {
  await page.goto('/#/architecture?persona=planner');
  await expect(currentCard(page)).toHaveText('Build the plan');
  await expect(progress(page)).toHaveText('Step 1 of 4');
  await showCards(page);
  // Step 02 (budget approval) belongs to Helena, so Sofia's journey moves straight to step 03.
  await expect(currentCard(page)).toHaveText('Negotiate with owners', { timeout: 6000 });
  await expect(progress(page)).toHaveText('Step 2 of 4');
  await expect(page.locator('.arch-workflow-steps > li.is-passed h4')).toHaveText(['Build the plan']);
});

test('a selected tool opens the journey where it does the most work', async ({ page }) => {
  await page.goto('/#/architecture?app=field');
  await expect(page.locator('.arch-workflow-heading h3')).toHaveText('Static posting & proof');
  await expect(currentCard(page)).toHaveText('Receive the job');
  await expect(progress(page)).toHaveText('Step 1 of 2');
});

test('pause stops the journey on the current card', async ({ page }) => {
  await page.goto('/#/architecture?persona=planner');
  await showCards(page);
  await page.getByRole('button', { name: "Pause Sofia's journey" }).click();
  await page.waitForTimeout(2400);
  await expect(currentCard(page)).toHaveText('Build the plan');
  await expect(page.getByRole('button', { name: "Play Sofia's journey" })).toBeVisible();
});

test('reduced motion waits for the visitor to start the journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/architecture?persona=planner');
  await showCards(page);
  await page.waitForTimeout(2400);
  await expect(currentCard(page)).toHaveText('Build the plan');
  await page.getByRole('button', { name: "Play Sofia's journey" }).click();
  await expect(currentCard(page)).toHaveText('Negotiate with owners', { timeout: 6000 });
});
