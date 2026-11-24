// axe in a real browser (colour contrast included) on the two static pages
// that only had jsdom checks before Phase 8, and on My Home and Better Habits
// with their guides from the real server (no external service).
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';

for (const path of ['/', '/privacy']) {
  test(`axe passes on ${path} in a real browser`, async ({ page }) => {
    // The resting page: the landing's sections rise in on scroll and load at
    // opacity 0, and axe skips anything at opacity 0, so every section must
    // be fully shown or its contrast goes unchecked. The motion itself is
    // checked in landing.spec.ts.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    for (const section of await page.locator('main > section').all()) {
      await expect(section).toHaveCSS('opacity', '1');
    }
    await expectNoAxeViolations(page);
  });
}

// The whole suite shares the API's 60-a-minute limit per address, so late
// in a run the guides can answer 429. The page then says so and offers
// "Try again", which is what a person would press: wait out the minute and
// press it.
async function guidesShown(page: Page, group: string): Promise<void> {
  const heading = page.getByRole('heading', { name: group });
  const busy = page.getByText('Too many requests. Try again in a minute.');
  await expect(heading.or(busy)).toBeVisible();
  if (await busy.isVisible()) {
    await page.waitForTimeout(61_000);
    await page.getByRole('button', { name: 'Try again' }).click();
  }
  await expect(heading).toBeVisible();
}

for (const [path, group] of [
  ['/app/home', 'Dust and cleaning'],
  ['/app/habits', 'Energy use'],
] as const) {
  test(`axe passes on ${path} with its guides`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(path);
    await guidesShown(page, group);
    await expectNoAxeViolations(page);
  });
}

// NF-01: the branded 404 page, on a deployed site only (Netlify serves
// public/404.html with status 404; the local server answers JSON).
test('an unknown path shows the branded 404 page', async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, 'Netlify only: set E2E_BASE_URL');
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: "We couldn't find that page" }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Go to AirAware' }),
  ).toHaveAttribute('href', '/app');
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    '/',
  );
});
