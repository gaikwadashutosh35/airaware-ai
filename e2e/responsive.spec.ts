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

// Phase 9: Windows High Contrast. The backdrop steps aside, focus still
// shows on the navy bars and the panels, and axe still passes.
test.describe('forced colours', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('forced colours: no backdrop, focus still shows', async ({ page }) => {
    await open(page, '/app');
    await expect(page.locator('[data-air]')).toBeHidden();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? getComputedStyle(el).outlineStyle : 'none';
      });
      expect(outline).not.toBe('none');
    }
  });

  // The header's words against its background, as the browser forces them
  // (the computed `color`, which is what it paints).
  test('forced colours: the header reads', async ({ page }) => {
    await open(page, '/app');
    const worst = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const rgb = (css: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const header = document.querySelector('header')!;
      const bg = rgb(getComputedStyle(header).backgroundColor);
      let ratio = Infinity;
      for (const el of header.querySelectorAll('a, button, span')) {
        if (!el.checkVisibility() || !(el.textContent ?? '').trim()) continue;
        const [hi, lo] = [lum(rgb(getComputedStyle(el).color)), lum(bg)].sort(
          (x, y) => y - x,
        );
        ratio = Math.min(ratio, (hi! + 0.05) / (lo! + 0.05));
      }
      return ratio;
    });
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });

  for (const path of ['/app', '/app/ask']) {
    test(`axe passes in forced colours: ${path}`, async ({ page }) => {
      await open(page, path);
      // axe's colour-contrast misreads forced colours in Chromium: it takes
      // the authored -webkit-text-fill-color (#f4f7fa in the navy header),
      // not the forced colour the browser paints (black or link blue on
      // white; computed `color` and a screenshot agree). The header's real
      // contrast is checked above; every other axe rule still runs.
      await expectNoAxeViolations(page, { skip: ['color-contrast'] });
    });
  }
});
