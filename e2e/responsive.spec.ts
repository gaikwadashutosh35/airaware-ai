// Phase 9: every page at phone, tablet and desktop widths. Nothing reaches
// past the screen, one h1, taps of 44 px, and axe on a phone. Every request
// is answered here, so the run spends none of the shared limits.
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';
import { at, pastTheEdge, smallTargets, stub } from './layout.ts';
import { PUNE } from './routes.ts';

const PATHS = [
  '/',
  '/privacy',
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
  '/app/welcome',
] as const;

const SIZES = [
  [320, 640],
  [768, 1024],
  [1280, 800],
] as const;

// Opens a page at rest (no rise-in motion), with Pune for the app pages but
// Welcome, which opens fresh, and every details element open.
export async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  const withPlace = path.startsWith('/app') && path !== '/app/welcome';
  await page.goto(withPlace ? at(path) : path);
  await expect(page.locator('h1:visible').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const details of await page.locator('main details').all()) {
    await details.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  }
}

test.describe('every size', () => {
  // The sizes are set by hand, so the desktop project covers them; the
  // phone project adds touch and a phone browser below.
  test.skip(({ isMobile }) => isMobile, 'sizes are set by hand');
  for (const path of PATHS) {
    for (const [width, height] of SIZES) {
      test(`nothing reaches past the screen, one h1: ${path} ${width}x${height}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await open(page, path);
        expect(await pastTheEdge(page)).toEqual([]);
        await expect(page.locator('h1:visible')).toHaveCount(1);
      });
    }
  }
});

for (const path of PATHS) {
  test(`touch targets are 44 px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, path);
    expect(await smallTargets(page)).toEqual([]);
  });

  test(`axe passes on a phone: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, path);
    await expectNoAxeViolations(page);
  });
}

// Goal 1 (spec §2): a 320x640 phone answers "How is my air today?" on the
// first screen, even for a long real place name.
test('a long real place keeps the verdict above the bar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.goto(
    PUNE.replace(
      'Pune%2C%20Maharashtra',
      encodeURIComponent('Chhatrapati Sambhajinagar, Maharashtra'),
    ),
  );
  const verdict = page.locator('main section h2:visible').first();
  await expect(verdict).toBeVisible();
  const bottom = (await verdict.boundingBox())!;
  const nav = (await page.locator('nav[aria-label="Main"]').boundingBox())!;
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(nav.y);
});
