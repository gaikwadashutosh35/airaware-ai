// Redesign P2: the first screen's shell. The phone bar, the place chip, the
// logo, the Tab order, enlarged text and the unknown-page redirect. Every page
// uses the stub, so no request reaches the AI and nothing is saved.
import { expect, test, type Page } from '@playwright/test';
import { at, stub } from './layout.ts';
import { PUNE } from './routes.ts';

const PLACE = 'Pune, Maharashtra';

async function load(page: Page, width: number, height: number, path = '/app') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.goto(at(path));
  await expect(page.locator('main h1:visible').first()).toBeVisible();
}

// SH-01: one short row, with side as well as bottom safe-area padding.
for (const [width, height] of [
  [320, 640],
  [390, 844],
] as const) {
  test(`the phone bar is short and has safe-area padding: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    const nav = page.locator('nav[aria-label="Main"]');
    const box = (await nav.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(height * 0.12);
    // No inset on a test browser: the bottom has no minimum, the sides add 0.
    const pad = await nav.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.paddingBottom, s.paddingLeft, s.paddingRight];
    });
    expect(pad).toEqual(['0px', '0px', '0px']);
    // The rules read the insets (env() is 0 here, so read the rule).
    const css = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .map((rule) => rule.cssText)
        .join('\n'),
    );
    expect(css).toContain('safe-area-inset-left');
    expect(css).toContain('safe-area-inset-right');
  });
}

// SH-04: the chip's text is never ellipsised for a usual place.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 800],
  [1440, 900],
] as const) {
  test(`the chip shows the place without an ellipsis: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    await expect(
      page.getByRole('button', { name: `Change place: ${PLACE}` }),
    ).toBeVisible();
    const label = page.locator('header .truncate:visible');
    await expect(label).toHaveText(width < 1024 ? 'Pune' : PLACE);
    const [scroll, client] = await label.evaluate((el) => [
      el.scrollWidth,
      el.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
}

// SH-05
test('the logo inside the app keeps the place', async ({ page }) => {
  await load(page, 1280, 800, '/app/ask');
  await expect(
    page.locator('header').getByRole('link', { name: 'AirAware AI' }),
  ).toHaveAttribute('href', PUNE);
});

async function tabStops(page: Page, count: number) {
  const stops: { name: string; left: number }[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return {
          name: el.getAttribute('aria-label') ?? (el.textContent ?? '').trim(),
          left: el.getBoundingClientRect().left,
        };
      }),
    );
  }
  return stops;
}

const NAV = ['Today', 'Ask AirAware', 'My Home', 'Better Habits', 'My Profile'];

// SH-06: phone order is skip link, logo, chip, the 5 bar links, content.
test('phone Tab order: skip link, logo, chip, bar, then content', async ({
  page,
}) => {
  await load(page, 390, 844);
  const stops = await tabStops(page, 9);
  expect(stops.slice(0, 8).map((s) => s.name)).toEqual([
    'Skip to content',
    'AirAware AI',
    `Change place: ${PLACE}`,
    ...NAV,
  ]);
  expect(NAV).not.toContain(stops[8]!.name);
});

// SH-06 at 1280: Tab order equals the left-to-right order.
test('desktop Tab order follows the header left to right', async ({ page }) => {
  await load(page, 1280, 800);
  const stops = (await tabStops(page, 8)).slice(1);
  expect(stops.map((s) => s.name)).toEqual([
    'AirAware AI',
    `Change place: ${PLACE}`,
    ...NAV,
  ]);
  const lefts = stops.map((s) => s.left);
  expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
});

// SH-07: at 200 % text the header wraps and every control stays on screen.
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`200 % text: the header wraps, nothing is lost: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    const result = await page.evaluate(() => {
      const row = document.querySelector('header > div')!;
      const width = document.documentElement.clientWidth;
      const controls = [...document.querySelectorAll('header a, header button')]
        .filter((el) => el.checkVisibility())
        .map((el) => el.getBoundingClientRect());
      return {
        fits: row.scrollWidth <= row.clientWidth,
        count: controls.length,
        inside: controls.every((r) => r.left >= -0.5 && r.right <= width + 0.5),
      };
    });
    expect(result.fits).toBe(true);
    // The logo, the chip and the five navigation links.
    expect(result.count).toBe(7);
    expect(result.inside).toBe(true);
  });
}

// NF-03: an unknown app page opens Today for the same place, by replace.
test('an unknown app page becomes Today, replacing the entry', async ({
  page,
}) => {
  await stub(page, 'not_elevated');
  await page.goto(PUNE);
  const before = await page.evaluate(() => history.length);
  await page.goto(PUNE.replace('/app?', '/app/nope?'));
  await expect(page).toHaveURL(PUNE);
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  await expect(page.locator('main h1:visible').first()).toContainText(
    `Today in ${PLACE}`,
  );
});

// At normal text the header is one 64 px row: the chip gives way, not the row.
// "Choose a place" must also show whole at 320.
for (const [width, height, label] of [
  [320, 640, ''],
  [390, 844, 'Thiruvananthapuram, Kerala'],
  [768, 1024, 'Near you (approximate)'],
  [1024, 768, 'Thiruvananthapuram, Kerala'],
  [1280, 800, 'Thiruvananthapuram, Kerala'],
] as const) {
  test(`the header stays one row at normal text: ${width}x${height} ${label || 'no place'}`, async ({
    page,
  }) => {
    await load(
      page,
      width,
      height,
      label ? `/app?place=${encodeURIComponent(label)}` : '/app/ask',
    );
    const row = await page.locator('header > div').evaluate((el) => {
      const top = (s: string) =>
        Math.round(el.querySelector(s)!.getBoundingClientRect().top);
      return {
        height: Math.round(el.getBoundingClientRect().height),
        tops: [
          top(':scope > a'),
          top(':scope > button'),
          top('nav[aria-label="Main"] li'),
        ],
      };
    });
    expect(row.height).toBe(64);
    if (width >= 768) expect(new Set(row.tops).size).toBe(1);
    if (!label) {
      const text = page.locator('header button .truncate:visible');
      expect(await text.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
        true,
      );
    }
  });
}

// SH-03: in forced colours the current page still differs from the others.
test('forced colours: the current nav item is underlined, the others not', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await load(page, 1280, 800);
  const lines = await page
    .locator('nav[aria-label="Main"] a')
    .evaluateAll((links) =>
      links.map((a) => [
        a.getAttribute('aria-current'),
        getComputedStyle(a).textDecorationLine,
      ]),
    );
  for (const [current, line] of lines)
    expect(line).toBe(current === 'page' ? 'underline' : 'none');
  expect(lines.some(([current]) => current === 'page')).toBe(true);
});
