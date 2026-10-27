import { expect, test } from './workspace-fixture';

// Layout guards for regressions that the behaviour tests cannot see: collapsed cards, hidden select labels, clipped artwork text and tiny type.
const artwork = '.scene-board,.creative-art,.frame-scene,.map-pin,.inventory-map,.world-map,.avatar';

test('marketplace location cards keep their full height on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/marketplace');
  const card = page.locator('.inventory-results .frame-card').first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(220);
});

test('billboard headline fits inside its board on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/marketplace');
  const board = page.locator('.inventory-results .frame-card .scene-board').first();
  await expect(board).toBeVisible();
  // Decorative orbits are meant to bleed; only the headline text has to stay inside the board.
  const overflow = await board.evaluate(el => {
    const art = el.querySelector('.art-small')!;
    const headline = art.querySelector('strong')!.getBoundingClientRect();
    const inner = art.getBoundingClientRect();
    const style = getComputedStyle(art);
    return headline.bottom - (inner.bottom - parseFloat(style.paddingBottom));
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test('phone inventory toolbar shows the city, format and environment labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/marketplace');
  const selects = page.locator('.inventory-toolbar .select-pill select');
  await expect(selects).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const box = await selects.nth(i).boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(100);
  }
  const page2 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(page2).toBe(true);
});

for (const route of ['', 'planner', 'deals', 'campaigns', 'inventory', 'marketplace', 'reports', 'measure']) {
  test(`no visible text under 10px on /${route || 'home'} outside artwork`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/#/${route}`);
    await expect(page.locator('main h1, .page-heading h1').first()).toBeVisible();
    const tiny = await page.evaluate(sel => [...document.querySelectorAll('main *')]
      .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()) && !e.closest(sel))
      .filter(e => parseFloat(getComputedStyle(e).fontSize) < 10)
      .map(e => `${e.className || e.tagName}:${e.textContent!.trim().slice(0, 30)}`), artwork);
    expect(tiny).toEqual([]);
  });
}
