// Phase 9: every page at phone, tablet and desktop widths. Nothing reaches
// past the screen, one h1, taps of 44 px, and axe on a phone. Every request
// is answered here, so the run spends none of the shared limits.
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';
import {
  clippedText,
  open,
  pastTheEdge,
  smallTargets,
  stub,
} from './layout.ts';
import {
  aiAskFixture,
  rulesAskFixture,
} from '../client/src/test/askFixtures.ts';
import { searchFixture } from '../client/src/test/fixtures.ts';
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
        expect(await clippedText(page)).toEqual([]);
        await expect(page.locator('h1:visible')).toHaveCount(1);
      });
    }
  }
});

for (const path of PATHS) {
  for (const width of [320, 768]) {
    test(`touch targets are 44 px: ${path} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 640 : 1024 });
      await open(page, path);
      expect(await smallTargets(page)).toEqual([]);
    });
  }

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
  // The verdict by its name, not the first h2 (the plan's heading shows
  // while the forecast loads), and the long name really in the title.
  await expect(page.locator('main h1:visible').first()).toContainText(
    'Chhatrapati Sambhajinagar',
  );
  const verdict = page.getByRole('heading', {
    level: 2,
    name: /^Forecast (within|above)|unavailable/,
  });
  await expect(verdict).toBeVisible();
  const bottom = (await verdict.boundingBox())!;
  const nav = (await page.locator('nav[aria-label="Main"]').boundingBox())!;
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(nav.y);
});

// WCAG 1.4.4 and 1.4.12, on the desktop project (sizes are set by hand).
test.describe('zoom and text spacing', () => {
  test.skip(({ isMobile }) => isMobile, 'sizes are set by hand');
  // Guided chat: a thread with a question back (six commute answers).
  test('text at 200 % still fits: an Ask question back', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await open(page, '/app/ask');
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({
        json: {
          data: {
            ...rulesAskFixture,
            followUps: [{ field: 'routine.commuteMode', changes: ['walk'] }],
          },
        },
      }),
    );
    await page
      .getByRole('button', { name: 'Outdoor activities', exact: true })
      .click();
    await expect(
      page.getByRole('group', {
        name: 'How do you usually travel to work or college?',
      }),
    ).toBeVisible();
    await page.addStyleTag({
      content: 'html { font-size: 200% !important }',
    });
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

  for (const path of PATHS) {
    // 200 % text: the root font size doubles, as browser text zoom does
    // for an app sized in rem. Final review: also below 1280, where the
    // short-label top bar (md) and the narrowest full-label bar (lg) live.
    for (const [width, height] of [
      [900, 800],
      [1024, 768],
      [1280, 800],
    ] as const) {
      test(`text at 200 % still fits: ${path} ${width}x${height}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
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
    }

    test(`wider text spacing clips nothing: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, path);
      await page.addStyleTag({
        content:
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }',
      });
      // Measure only once the wider spacing really applies.
      await expect
        .poll(() =>
          page.evaluate(() => getComputedStyle(document.body).wordSpacing),
        )
        .not.toBe('0px');
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
      // The long name really is in the chip (the text before the first comma
      // below lg, the whole name from lg) and the title.
      await expect(page.locator('header button .truncate:visible')).toHaveText(
        width < 1024 ? LONG_PLACE.split(',')[0]! : LONG_PLACE,
      );
      await expect(page.locator('main h1:visible').first()).toContainText(
        LONG_PLACE,
      );
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
        // ...and so do the logo, the chip and the nav (one 64 px header row).
        expect(
          await page
            .locator('header > div')
            .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
        ).toBe(64);
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

// Final review: headless Chromium hides scrollbars, so a desktop's classic
// 15-17 px scrollbar never narrows the page in the other tests. A right
// margin on body narrows the page the same way while media queries keep
// the window's width.
test.describe('the header at normal text with a scrollbar', () => {
  test.skip(({ isMobile }) => isMobile, 'sizes are set by hand');
  for (const width of [1024, 1280]) {
    for (const label of ['Thiruvananthapuram, Kerala', 'Mumbai, Maharashtra']) {
      test(`one nav row, nothing past the screen: ${width}, ${label}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await stub(page, 'not_elevated');
        await page.goto(
          PUNE.replace('Pune%2C%20Maharashtra', encodeURIComponent(label)),
        );
        await expect(page.locator('main h1:visible').first()).toBeVisible();
        await page.addStyleTag({
          content: 'body { margin-right: 17px !important }',
        });
        const tops = await page
          .locator('nav[aria-label="Main"] li')
          .evaluateAll((items) =>
            items.map((li) => Math.round(li.getBoundingClientRect().top)),
          );
        expect(new Set(tops).size).toBe(1);
        expect(await pastTheEdge(page)).toEqual([]);
      });
    }
  }

  // The metros' names fit the chip whole on a desktop.
  test('a metro name shows whole in the chip at 1280', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    await page.goto(
      PUNE.replace(
        'Pune%2C%20Maharashtra',
        encodeURIComponent('Mumbai, Maharashtra'),
      ),
    );
    const label = page.locator('header button .truncate:visible');
    await expect(label).toHaveText('Mumbai, Maharashtra');
    const [scroll, client] = await label.evaluate((el) => [
      el.scrollWidth,
      el.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
});

// Final review: in Windows High Contrast the highlighted place suggestion
// must still show which one Enter will pick.
test('forced colours: the highlighted suggestion shows', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.route('**/api/v1/locations/search**', (route) =>
    route.fulfill({ json: { data: searchFixture } }),
  );
  await page.goto('/app/welcome');
  const box = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  await box.fill('Pune');
  await expect(page.getByRole('option').first()).toBeVisible();
  await box.press('ArrowDown');
  const selected = page.locator('[role="option"][aria-selected="true"]');
  await expect(selected).toHaveCount(1);
  const outline = await selected.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
});

// Found while verifying the fix pass: chosen Welcome chips and pressed Ask
// topics were also marked by colour alone, which forced colours remove.
test.describe('forced colours: chosen chips show', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    await stub(page, 'not_elevated');
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({ json: { data: aiAskFixture } }),
    );
  });
  const outlined = (el: Element) => {
    const s = getComputedStyle(el);
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  };

  test('a chosen Welcome chip has an outline', async ({ page }) => {
    await page.goto(PUNE.replace('/app?', '/app/welcome?'));
    const chosen = page.locator('label', { hasText: 'Office commute' });
    await chosen.click();
    expect(await chosen.evaluate(outlined)).toBe(true);
    const plain = page.locator('label', { hasText: 'School commute' });
    expect(await plain.evaluate(outlined)).toBe(false);
  });

  // Guided chat: the pressed topic is gone; your message is a dark bubble,
  // and its edge must survive forced colours.
  test('your Ask message keeps its edge', async ({ page }) => {
    await page.goto(PUNE.replace('/app?', '/app/ask?'));
    await page
      .getByRole('button', { name: 'Outdoor activities', exact: true })
      .click();
    const mine = page.locator('article.ask-answer h2').first();
    await expect(mine).toBeVisible();
    const edge = await mine.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: parseFloat(s.borderTopWidth), color: s.borderTopColor };
    });
    expect(edge.width).toBeGreaterThan(0);
    expect(edge.color).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// Final review: the size matrix sees one data state (current, within, a
// ready plan, nothing open). These states get the same edge, clipping and
// target checks on a 320 px phone.
test.describe('other states on a 320 px phone', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/v1/locations/search**', (route) =>
      route.fulfill({ json: { data: searchFixture } }),
    );
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({ json: { data: aiAskFixture } }),
    );
  });
  const fits = async (page: Page) => {
    expect(await pastTheEdge(page)).toEqual([]);
    expect(await clippedText(page)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);
  };

  test('a stale, above-limit Today', async ({ page }) => {
    await stub(page, 'elevated', {}, new Date(Date.now() - 2 * 3600_000));
    await page.goto(PUNE);
    await expect(page.getByText(/^Not current:/)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /^Forecast above/ }),
    ).toBeVisible();
    await fits(page);
  });

  test('the forecast error card', async ({ page }) => {
    await stub(page, 'not_elevated');
    await page.route('**/api/v1/air-quality/forecast**', (route) =>
      route.fulfill({
        status: 502,
        json: { error: { code: 'PROVIDER_ERROR', message: 'Test reply.' } },
      }),
    );
    await page.goto(PUNE);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await fits(page);
  });

  test('the place dialog with suggestions', async ({ page }) => {
    await stub(page, 'not_elevated');
    await page.goto(PUNE);
    await page.getByRole('button', { name: /^Change place/ }).click();
    await page
      .getByRole('combobox', { name: 'Search for a city or area in India' })
      .fill('Pune');
    await expect(page.getByRole('option').first()).toBeVisible();
    await fits(page);
  });

  test('Welcome steps 2 and 3', async ({ page }) => {
    await stub(page, 'not_elevated');
    await page.goto(PUNE.replace('/app?', '/app/welcome?'));
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await fits(page);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await fits(page);
  });

  test('an Ask answer', async ({ page }) => {
    await stub(page, 'not_elevated');
    await page.goto(PUNE.replace('/app?', '/app/ask?'));
    await page
      .getByRole('button', { name: 'Outdoor activities', exact: true })
      .click();
    await expect(page.locator('article.ask-answer')).toBeVisible();
    await fits(page);
  });

  // Guided chat: six commute answers wrap on a 320 px phone.
  test('an Ask answer with a question back', async ({ page }) => {
    await stub(page, 'not_elevated');
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({
        json: {
          data: {
            ...rulesAskFixture,
            followUps: [{ field: 'routine.commuteMode', changes: ['walk'] }],
          },
        },
      }),
    );
    await page.goto(PUNE.replace('/app?', '/app/ask?'));
    await page
      .getByRole('button', { name: 'Outdoor activities', exact: true })
      .click();
    await expect(
      page.getByRole('group', {
        name: 'How do you usually travel to work or college?',
      }),
    ).toBeVisible();
    await fits(page);
  });
});
