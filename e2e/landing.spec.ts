// The landing page in a real browser: the scroll reveal (CSS that jsdom
// can't run), where the hero's buttons lead on a first visit, and redesign
// P7's length, first screen, search button, links and skyline. Every request
// to a host other than localhost is aborted and counted (each test asserts
// none was made), so nothing reaches Supabase or the production site.
import { expect, test, type Page } from '@playwright/test';
import { searchFixture } from '../client/src/test/fixtures.ts';
import { pastTheEdge, stub } from './layout.ts';

const SECTION = 'Understand your air';

// The first route of every test: aborts and records any non-local request.
async function blockExternal(page: Page): Promise<string[]> {
  const blocked: string[] = [];
  await page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    (route) => {
      blocked.push(route.request().url());
      return route.abort();
    },
  );
  return blocked;
}

async function styleOf(page: Page) {
  return page.getByRole('region', { name: SECTION }).evaluate((el) => {
    const style = getComputedStyle(el);
    return { name: style.animationName, opacity: style.opacity };
  });
}

// Scrolls so the section's top sits `offset` px above the screen's bottom
// (a negative offset: below it), then waits two frames.
async function placeTop(page: Page, offset: number): Promise<void> {
  await page.getByRole('region', { name: SECTION }).evaluate(async (el, by) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top - window.innerHeight + by,
      behavior: 'instant',
    });
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    );
  }, offset);
}

test('sections rise in as they scroll into view', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');

  expect((await styleOf(page)).name).toBe('reveal');
  await placeTop(page, -10);
  expect((await styleOf(page)).opacity).toBe('0');
  // Fully shown 120 px in on every screen, phones' bottom scroll padding
  // included.
  await placeTop(page, 130);
  expect((await styleOf(page)).opacity).toBe('1');
  expect(blocked).toEqual([]);
});

// The arrows the forecast steps show at a screen width, in order.
async function arrowsAt(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  return page
    .getByRole('list', { name: 'How a forecast reaches you' })
    .locator('svg')
    .evaluateAll((arrows) =>
      arrows
        .filter((arrow) => getComputedStyle(arrow).display !== 'none')
        .map((arrow) =>
          arrow.classList.contains('lucide-arrow-down') ? 'down' : 'right',
        ),
    );
}

test('step arrows point the way the steps run', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');

  expect(await arrowsAt(page, 390)).toEqual(['down', 'down', 'down']);
  // A 2×2 grid has no one direction, so the numbers carry the order.
  expect(await arrowsAt(page, 900)).toEqual([]);
  expect(await arrowsAt(page, 1280)).toEqual(['right', 'right', 'right']);
  expect(blocked).toEqual([]);
});

// PF-05 (G1): the Air quality details capture is gone; the page's images are
// the hero's Today capture alone, and total no more than 220 kB.
test('PF-05: the page loads one image, within 220 kB', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('img')).toHaveCount(1);
  await expect(
    page.getByRole('img', { name: /^Screenshot of the open Air quality/ }),
  ).toHaveCount(0);
  const bytes = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'img')
      .reduce(
        (sum, e) => sum + (e as PerformanceResourceTiming).encodedBodySize,
        0,
      ),
  );
  console.log(`PF-05 landing images total ${bytes} bytes`);
  expect(bytes).toBeGreaterThan(0);
  expect(bytes).toBeLessThanOrEqual(220_000);
  expect(blocked).toEqual([]);
});

test('no movement under reduced motion', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await placeTop(page, -10);
  expect(await styleOf(page)).toEqual({ name: 'none', opacity: '1' });
  expect(blocked).toEqual([]);
});

test('the hero buttons on a first visit', async ({ page }) => {
  const blocked = await blockExternal(page);
  // Ask makes its own requests: every /api route is answered here.
  await stub(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Meet Your Assistant' }).click();
  await expect(page).toHaveURL(/\/app\/ask$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Search for a city or area in India' }),
  ).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Check My Air' }).first().click();
  await expect(page).toHaveURL(/\/app\/welcome$/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where should we check air quality?',
    }),
  ).toBeVisible();
  console.log(`landing hero buttons: non-local requests ${blocked.length}`);
  expect(blocked).toEqual([]);
});

// LA-01 (F-19): the page's length in screens. Production before: 13.3 / 9.4 /
// 6.7 / 7.8 / 6.3; gated at 390 (7.5) and 1280 (6.5), and no width may grow.
const SIZES = [
  { width: 320, height: 640, before: 13.3, gate: undefined },
  { width: 390, height: 844, before: 9.4, gate: 7.5 },
  { width: 768, height: 1024, before: 6.7, gate: undefined },
  { width: 1280, height: 720, before: 7.8, gate: 6.5 },
  { width: 1440, height: 900, before: 6.3, gate: undefined },
] as const;
for (const { width, height, before, gate } of SIZES) {
  test(`LA-01: page length in screens: ${width}x${height}`, async ({
    page,
  }) => {
    const blocked = await blockExternal(page);
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const screens = await page.evaluate(
      () => document.documentElement.scrollHeight / window.innerHeight,
    );
    console.log(`LA-01 ${width}x${height} = ${screens.toFixed(2)} screens`);
    expect(screens).toBeLessThanOrEqual(gate ?? before + 0.05);
    expect(blocked).toEqual([]);
  });
}

// LA-02: the search and its button are on the first 1280x720 screen.
test('LA-02: the search and its button sit on the first screen', async ({
  page,
}) => {
  const blocked = await blockExternal(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const input = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  const button = page.getByRole('button', { name: 'Search' });
  const inputBox = (await input.boundingBox())!;
  const buttonBox = (await button.boundingBox())!;
  console.log(
    `LA-02 1280x720 input bottom ${inputBox.y + inputBox.height}, Search bottom ${buttonBox.y + buttonBox.height}`,
  );
  expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(720);
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(720);
  expect(blocked).toEqual([]);
});

// LA-03 (G5): an outlined button of at least 44 px; it and Enter open the
// list, never pick a place and never leave the page.
test('LA-03: the Search button and Enter both open the list', async ({
  page,
}) => {
  const blocked = await blockExternal(page);
  await page.route('**/api/v1/locations/search**', (route) =>
    route.fulfill({ json: { data: searchFixture } }),
  );
  await page.goto('/');
  const input = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  const button = page.getByRole('button', { name: 'Search' });
  const box = (await button.boundingBox())!;
  console.log(`LA-03 Search button ${box.width} x ${box.height}`);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  // Outlined: a border and no fill (the hero keeps one teal primary).
  expect(
    await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderTopWidth, s.backgroundColor];
    }),
  ).toEqual(['1px', 'rgba(0, 0, 0, 0)']);

  await input.fill('Pune');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(searchFixture.length);
  for (const open of [
    () => button.click(),
    async () => {
      await input.focus();
      await input.press('Enter');
    },
  ]) {
    await input.press('Escape');
    await expect(options).toHaveCount(0);
    await open();
    await expect(options).toHaveCount(searchFixture.length);
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/$/);
  }
  expect(blocked).toEqual([]);
});

// LA-03 (G5): with an option highlighted, a click on Search chooses it, as
// Enter does (a press must not blur the input and close the list first).
test('LA-03: Search with a highlighted option chooses it', async ({ page }) => {
  const blocked = await blockExternal(page);
  await stub(page);
  await page.goto('/');
  const input = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  await input.fill('Pune');
  await expect(page.getByRole('option')).toHaveCount(searchFixture.length);
  await input.press('ArrowDown');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/app\?place=/);
  expect(blocked).toEqual([]);
});

// The Explainable AI chapter at desktop width: its text beside the card, the
// mid-page Check My Air under both.
test('Explainable AI: text beside the card, link below', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const chapter = page.locator('section', {
    has: page.getByRole('heading', { level: 2, name: 'Explainable AI' }),
  });
  const h2 = (await chapter.getByRole('heading', { level: 2 }).boundingBox())!;
  const card = (await chapter.locator('figure').boundingBox())!;
  const link = (await chapter
    .getByRole('link', { name: 'Check My Air' })
    .boundingBox())!;
  console.log(
    `Explainable h2 x ${h2.x} y ${h2.y}; card right ${card.x + card.width} bottom ${card.y + card.height}; link y ${link.y}`,
  );
  expect(h2.y).toBeLessThan(card.y + card.height);
  expect(h2.x).toBeGreaterThan(card.x + card.width - 1);
  expect(link.y).toBeGreaterThan(card.y + card.height - 1);
  expect(link.y).toBeGreaterThan(h2.y);
  expect(blocked).toEqual([]);
});

// LA-04: a "Check My Air" in the hero, mid-page and at the end.
test('LA-04: three Check My Air links, each to /app', async ({ page }) => {
  const blocked = await blockExternal(page);
  await page.goto('/');
  const links = page.getByRole('link', { name: 'Check My Air' });
  await expect(links).toHaveCount(3);
  const hrefs = await links.evaluateAll((all) =>
    all.map((a) => a.getAttribute('href')),
  );
  console.log(`LA-04 Check My Air hrefs ${JSON.stringify(hrefs)}`);
  expect(hrefs).toEqual(['/app', '/app', '/app']);
  expect(blocked).toEqual([]);
});

// CS-13: the hero's skyline is decoration only, stays inside the screen and
// shifts nothing.
const skyline = (page: Page) => page.locator('main > section > svg').first();

test('CS-13: the skyline has no data-air and nothing passes the screen at 320', async ({
  page,
}) => {
  const blocked = await blockExternal(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(skyline(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(skyline(page).locator('path').first()).toBeAttached();
  expect(
    await skyline(page).evaluate(
      (el) => el.hasAttribute('data-air') || !!el.querySelector('[data-air]'),
    ),
  ).toBe(false);
  const over = await pastTheEdge(page);
  console.log(`CS-13 320 past the edge: ${JSON.stringify(over)}`);
  expect(over).toEqual([]);
  expect(blocked).toEqual([]);
});

for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`CS-13: no layout shift on /: ${width}x${height}`, async ({ page }) => {
    const blocked = await blockExternal(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      const w = window as unknown as { cls: number };
      w.cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) w.cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // A frame later, so the last shift is recorded.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    console.log(`CS-13 / CLS ${width}x${height} = ${cls}`);
    expect(cls).toBeLessThan(0.1);
    expect(blocked).toEqual([]);
  });
}
