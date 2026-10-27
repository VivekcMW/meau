import { test as base, expect } from '@playwright/test';

// Workflow regression tests represent returning visitors; onboarding has its own first-visit suite.
export const test = base.extend<{ returningVisitor: void }>({
  returningVisitor: [async ({ context }, use) => {
    await context.addInitScript(() => {
      if (!localStorage.getItem('allunite-one.onboarding.v1')) localStorage.setItem('allunite-one.onboarding.v1', JSON.stringify({ status: 'skipped', selection: null, step: 0 }));
    });
    await use();
  }, { auto: true }],
});
export { expect };
