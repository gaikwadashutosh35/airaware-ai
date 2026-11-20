// Phase 9: every page at phone, tablet and desktop widths. Nothing reaches
// past the screen, one h1, taps of 44 px, and axe on a phone. Every request
// is answered here, so the run spends none of the shared limits.
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';
import {
  clippedText,
  open,
  pastTheEdge,
  smallTargets,
  stub,
} from './layout.ts';
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

// 640x400 is how Chrome, Edge and Safari lay out 200 % page zoom of a
// 1280x800 window, and the sm breakpoint; 1024x768 is the narrowest top
// bar with the full nav labels (lg).
const SIZES = [
  [320, 640],
  [640, 400],
  [768, 1024],
  [1024, 768],
  [1280, 800],
] as const;

const LONG_PLACE =
  'Pune Municipal Corporation Ward Office Twenty Three, Pune, Maharashtra';

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

// WCAG 1.4.4 and 1.4.12, on the desktop project (sizes are set by hand).
test.describe('zoom and text spacing', () => {
  test.skip(({ isMobile }) => isMobile, 'sizes are set by hand');
  for (const path of PATHS) {
    // 200 % text: the root font size doubles, as browser text zoom does
    // for an app sized in rem.
    test(`text at 200 % still fits: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page, path);
      await page.addStyleTag({
        content: 'html { font-size: 200% !important }',
      });
      // Measure only once the page really shows 200 % text.
      await expect
        .poll(() =>
          page.evaluate(
            () => getComputedStyle(document.documentElement).fontSize,
          ),
        )
        .toBe('32px');
      expect(await pastTheEdge(page)).toEqual([]);
      expect(await clippedText(page)).toEqual([]);
    });

    test(`wider text spacing clips nothing: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, path);
      await page.addStyleTag({
        content:
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }',
      });
      expect(await clippedText(page)).toEqual([]);
    });
  }
});

// The header row: a long place shrinks the chip (it truncates), never
// pushes the nav off the screen.
test.describe('a long place in the header', () => {
  test.skip(({ isMobile }) => isMobile, 'sizes are set by hand');
  for (const [width, height] of SIZES) {
    test(`a long place keeps the header on screen: ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await stub(page, 'not_elevated');
      await page.goto(
        PUNE.replace('Pune%2C%20Maharashtra', encodeURIComponent(LONG_PLACE)),
      );
      await expect(page.locator('main h1:visible').first()).toBeVisible();
      expect(await pastTheEdge(page)).toEqual([]);
      // At normal text the top bar (md and up) keeps its nav on one row:
      // the chip truncates instead (the nav wraps only for enlarged text).
      if (width >= 768) {
        const tops = await page
          .locator('nav[aria-label="Main"] li')
          .evaluateAll((items) =>
            items.map((li) => Math.round(li.getBoundingClientRect().top)),
          );
        expect(new Set(tops).size).toBe(1);
      }
    });
  }
});
