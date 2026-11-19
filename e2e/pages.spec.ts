// axe in a real browser (colour contrast included) on the two static pages
// that only had jsdom checks before Phase 8. No network or saved data needed.
import { test } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';

for (const path of ['/', '/privacy']) {
  test(`axe passes on ${path} in a real browser`, async ({ page }) => {
    await page.goto(path);
    await expectNoAxeViolations(page);
  });
}
