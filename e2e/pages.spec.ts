// axe in a real browser (colour contrast included) on the two static pages
// that only had jsdom checks before Phase 8, and on My Home and Better Habits
// with their guides from the real server (no external service).
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';

for (const path of ['/', '/privacy']) {
  test(`axe passes on ${path} in a real browser`, async ({ page }) => {
    await page.goto(path);
    await expectNoAxeViolations(page);
  });
}

for (const [path, group] of [
  ['/app/home', 'Dust and cleaning'],
  ['/app/habits', 'Energy use'],
] as const) {
  test(`axe passes on ${path} with its guides`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: group })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
