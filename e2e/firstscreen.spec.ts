// Redesign P2: the first screen's shell. The phone bar, the place chip, the
// logo, the Tab order, enlarged text and the unknown-page redirect. Every page
// uses the stub, so no request reaches the AI and nothing is saved.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { rulesAskFixture } from '../client/src/test/askFixtures.ts';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { at, stub, type Level } from './layout.ts';
import { guideSet } from '../server/src/services/recommendations/guides.ts';
import { searchFixture } from '../client/src/test/fixtures.ts';
import { planAt, PUNE } from './routes.ts';

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

// PF-01: the forecast lands at about 0.8 s and the plan at about 1.5 s; the
// layout shifts nothing below the placeholders by more than 0.1 in total.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
] as const) {
  test(`Today's layout shift stays under 0.1: ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    const later = (pattern: string, ms: number) =>
      page.route(pattern, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        await route.fallback();
      });
    await later('**/api/v1/air-quality/forecast**', 800);
    await later('**/api/v1/recommendations/daily-plan', 1500);
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
    await page.goto(at('/app'));
    await expect(page.getByText('Your plan is ready.')).toBeAttached();
    await expect(
      page.getByRole('heading', {
        name: 'Consider an indoor alternative for exercise',
      }),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    // A frame later, so the last shift is recorded.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    console.log(`PF-01 CLS ${width}x${height} = ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });
}

// Redesign P3: Today's first screen and its four states. Every page uses the
// stub, so no request reaches the AI and nothing is saved.
const LONG = 'Thiruvananthapuram, Kerala';
const LONG_URL = `/app?place=${encodeURIComponent(LONG)}&lat=8.52&lon=76.94`;
const WITHIN = "Forecast within India's 24-hour limits";
const MEANING =
  'Fine and coarse particles are forecast below the national daily limits for the next 24 hours.';
const ABOVE_MEANING =
  'Fine particles (PM2.5) are forecast above the national daily limit for the next 24 hours.';

async function today(
  page: Page,
  width: number,
  height: number,
  options: { url?: string; level?: Level } = {},
) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, options.level ?? 'not_elevated');
  await page.goto(options.url ?? PUNE);
  await expect(page.locator('main h1:visible').first()).toBeVisible();
  await expect(page.getByText('Your plan is ready.')).toBeAttached();
  await expect(page.locator('main article').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
}

const barTop = async (page: Page) =>
  (await page.locator('nav[aria-label="Main"]').boundingBox())!.y;
const bottomOf = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return box.y + box.height;
};
const verdict = (page: Page) =>
  page.getByRole('heading', { level: 2, name: WITHIN });
const provenance = (page: Page) =>
  page.locator('p', { hasText: 'Model forecast · Open-Meteo · retrieved' });

// TD-01 and TD-02: the verdict and where it comes from are above the bar.
for (const [label, url] of [
  ['Pune', PUNE],
  [LONG, LONG_URL],
] as const) {
  test(`TD-01/02: the verdict and its provenance sit above the bar at 320x640: ${label}`, async ({
    page,
  }) => {
    await today(page, 320, 640, { url });
    const bar = await barTop(page);
    const h2 = await bottomOf(verdict(page));
    const line = await bottomOf(provenance(page));
    console.log(
      `TD-01/02 ${label}: h2 bottom ${h2}, provenance bottom ${line}, bar top ${bar}`,
    );
    expect(h2).toBeLessThanOrEqual(bar);
    expect(line).toBeLessThanOrEqual(bar);
  });
}

// TD-03: the lowest-priority top card still shows "Why?".
test('TD-03: the card with no For you line keeps its summary above the bar at 390x844', async ({
  page,
}) => {
  const smoke = rulesPlanFixture.featured.find(
    (f) => f.candidate.id === 'indoor.smoke-sources',
  )!;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  const plan = planAt(
    {
      ...rulesPlanFixture,
      air: { ...rulesPlanFixture.air, level: 'not_elevated' as const },
      featured: [smoke],
      more: [],
    },
    new Date(),
  );
  await page.route('**/api/v1/recommendations/daily-plan', (route) =>
    route.fulfill({ json: { data: plan } }),
  );
  await page.goto(PUNE);
  await expect(
    page
      .getByRole('heading', { name: 'Cut indoor smoke at the source' })
      .first(),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
  const bottom = await bottomOf(page.locator('main article summary').first());
  const bar = await barTop(page);
  console.log(
    `TD-03: summary bottom ${bottom}, bar top ${bar}, margin ${bar - bottom}`,
  );
  expect(bottom).toBeLessThanOrEqual(bar);
});

// TD-04 and TD-06: reported, not gated.
for (const [width, height, id] of [
  [390, 844, 'TD-04'],
  [320, 640, 'TD-06'],
] as const) {
  test(`${id}: where the shipped plan's summary falls at ${width}x${height}`, async ({
    page,
  }) => {
    await today(page, width, height);
    const bottom = await bottomOf(page.locator('main article summary').first());
    const bar = await barTop(page);
    console.log(
      `${id}: summary bottom ${bottom}, bar top ${bar}, margin ${bar - bottom}`,
    );
  });
}

// TD-07: on desktop both cards open the page and their tops line up.
test('TD-07: at 1280x720 the summary is on screen and the cards line up', async ({
  page,
}) => {
  await today(page, 1280, 720);
  const bottom = await bottomOf(page.locator('main article summary').first());
  const lead = (await page
    .locator('section', { has: verdict(page) })
    .first()
    .boundingBox())!;
  const plan = (await page
    .locator('section', {
      has: page.getByRole('heading', { name: 'Your recommendation for today' }),
    })
    .boundingBox())!;
  console.log(`TD-07: summary bottom ${bottom}, tops ${lead.y} and ${plan.y}`);
  expect(bottom).toBeLessThanOrEqual(720);
  expect(Math.abs(lead.y - plan.y)).toBeLessThanOrEqual(8);
});

// TD-08: 24 px on a phone, 30 px from 640.
for (const [width, height, size] of [
  [320, 640, '24px'],
  [390, 844, '24px'],
  [640, 900, '30px'],
  [1280, 720, '30px'],
] as const) {
  test(`TD-08: the H1 is ${size} at ${width}`, async ({ page }) => {
    await today(page, width, height);
    const [font, lines] = await page
      .locator('main h1:visible')
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return [
          style.fontSize,
          Math.round(
            el.getBoundingClientRect().height / parseFloat(style.lineHeight),
          ),
        ] as const;
      });
    if (width === 390) console.log(`TD-08: Pune H1 at 390 is ${lines} line(s)`);
    expect(font).toBe(size);
  });
}

// TD-09: no word of the H1 breaks across lines at 320.
test('TD-09: no word of the long place name breaks at 320x640', async ({
  page,
}) => {
  await today(page, 320, 640, { url: LONG_URL });
  const words = await page
    .locator('main h1:visible')
    .first()
    .evaluate((h1) => {
      const text = h1.firstChild!;
      const range = document.createRange();
      return [...(text.textContent ?? '').matchAll(/\S+/g)].map((match) => {
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        return [match[0], range.getClientRects().length] as const;
      });
    });
  console.log(`TD-09: rects per word ${JSON.stringify(words)}`);
  for (const [, rects] of words) expect(rects).toBe(1);
});

// TD-11 and G-05: the invite is quiet, after the help choices, and at most
// one control is filled with the primary colour while the details are shut.
test('TD-11 and G-05: the invite follows the help choices, outlined', async ({
  page,
}) => {
  await today(page, 390, 844);
  const invite = page.getByRole('link', {
    name: 'Make it personal: 2 quick questions',
  });
  const help = page.getByRole('heading', {
    name: 'What would you like help with?',
  });
  expect(
    await help.evaluate(
      (el, other) =>
        !!(
          el.compareDocumentPosition(other!) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
      await invite.elementHandle(),
    ),
  ).toBe(true);
  expect(
    await invite.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe('rgb(57, 213, 194)');
  expect(await page.locator('details[open]').count()).toBe(0);
  const filled = await page.evaluate(
    () =>
      [...document.querySelectorAll('a, button')].filter(
        (el) =>
          el.checkVisibility() &&
          getComputedStyle(el).backgroundColor === 'rgb(57, 213, 194)',
      ).length,
  );
  console.log(`G-05: ${filled} visible primary-filled control(s)`);
  expect(filled).toBeLessThanOrEqual(1);
});

// TD-14: the meaning sentence is in "Air quality details" when within, on the
// card when above.
test('TD-14: within the limit the meaning sentence is in the details, not on the card', async ({
  page,
}) => {
  await today(page, 390, 844);
  const details = page.locator('details', {
    has: page.locator('summary', { hasText: 'Air quality details' }),
  });
  expect(await details.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(
    false,
  );
  const card = page.locator('section', { has: verdict(page) }).first();
  await expect(card.getByText(MEANING)).toHaveCount(0);
  await expect(details.getByText(MEANING)).toHaveCount(1);
});

test('TD-14: above the limit the meaning sentence stays on the card', async ({
  page,
}) => {
  await today(page, 390, 844, { level: 'elevated' });
  const card = page
    .locator('section', {
      has: page.getByRole('heading', {
        level: 2,
        name: "Forecast above India's 24-hour limit",
      }),
    })
    .first();
  await expect(card.getByText(ABOVE_MEANING)).toHaveCount(1);
});

// ST-01a: one tap, one forecast request, focus on the place, the banner goes.
test('ST-01a: "Reload forecast" sends one request, keeps focus on the place and clears the banner', async ({
  page,
}) => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated', {}, twoHoursAgo);
  await page.goto(PUNE);
  const banner = page.locator('[data-part="stale-banner"]');
  await expect(banner).toBeVisible();
  await page.waitForLoadState('networkidle');
  // The next forecast is a fresh one.
  await stub(page, 'not_elevated');
  const gets: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'GET' &&
      request.url().includes('/api/v1/air-quality/forecast')
    ) {
      gets.push(request.url());
    }
  });
  const url = page.url();
  await banner.getByRole('button', { name: 'Reload forecast' }).click();
  await page.waitForLoadState('networkidle');
  // Wait for the fresh card (the loading state has no banner either).
  await expect(verdict(page)).toBeVisible();
  await expect(banner).toHaveCount(0);
  console.log(`ST-01a: ${gets.length} forecast GET(s) after one tap`);
  expect(gets).toHaveLength(1);
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(() => document.activeElement?.tagName === 'H1'),
  ).toBe(true);
});

// PF-07: leaving Today and coming back never builds a second plan.
test('PF-07: Today, My Home, Today builds one plan', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().includes('/api/v1/recommendations/daily-plan')
    ) {
      posts.push(request.url());
    }
  });
  await today(page, 390, 844);
  const nav = page.locator('nav[aria-label="Main"]');
  await nav.getByRole('link', { name: 'My Home' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'My Home' }),
  ).toBeVisible();
  await nav.getByRole('link', { name: 'Today' }).click();
  await expect(page.locator('main h1:visible').first()).toContainText(
    'Today in',
  );
  await page.waitForLoadState('networkidle');
  console.log(`PF-07: ${posts.length} plan POST(s)`);
  expect(posts).toHaveLength(1);
});

// Redesign P4: Ask AirAware. Every request is stubbed, so no answer reaches
// the AI and nothing is saved.
async function ask(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.route('**/api/v1/assistant/answer', (route) =>
    route.fulfill({ json: { data: rulesAskFixture } }),
  );
  await page.goto(at('/app/ask'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
}

const questionInput = (page: Page) =>
  page.getByRole('textbox', { name: 'Ask about your air, home or day' });

// AK-01: the question box is on the first screen.
for (const [width, height] of [
  [390, 844],
  [320, 640],
  [1280, 720],
] as const) {
  test(`AK-01: the question box is above the fold at ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const bottom = await bottomOf(questionInput(page));
    const limit = width < 768 ? await barTop(page) : 720;
    console.log(
      `AK-01 ${width}x${height}: input bottom ${bottom}, limit ${limit}, margin ${limit - bottom}`,
    );
    expect(bottom).toBeLessThanOrEqual(limit);
  });
}

// AK-04 and AK-05: a new exchange is at the top of the view, its answer starts
// on screen, and focus is on its heading with no later scroll.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [1280, 720],
] as const) {
  test(`AK-04/05: a tapped starter shows its answer on screen at ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    await page
      .getByRole('button', { name: 'Can I go for a morning walk today?' })
      .click();
    const article = page.locator('article.ask-answer').last();
    await expect(article.getByText('Made by our rules')).toBeVisible();
    const scrolls = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) =>
          requestAnimationFrame(() => {
            const first = window.scrollY;
            requestAnimationFrame(() => resolve([first, window.scrollY]));
          }),
        ),
    );
    const top = (await article.boundingBox())!.y;
    const paragraph = (await article.locator('p').first().boundingBox())!.y;
    const limit = width < 768 ? await barTop(page) : height;
    console.log(
      `AK-04 ${width}x${height}: article top ${top}, first paragraph top ${paragraph}, limit ${limit}, scrollY ${scrolls.join(',')}`,
    );
    // scrollIntoView rounds to a whole pixel: allow a subpixel.
    expect(top).toBeGreaterThanOrEqual(-0.5);
    expect(paragraph).toBeLessThan(limit);
    expect(scrolls[0]).toBe(scrolls[1]);
    expect(
      await page.evaluate(
        () =>
          document.activeElement ===
          document.querySelector('article.ask-answer:last-of-type h2'),
      ),
    ).toBe(true);
  });
}

// AK-10: at 200 % text the input keeps most of the row; at normal text on the
// narrowest phone it shares a row with Send.
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  for (const where of ['Ask', 'Today'] as const) {
    test(`AK-10: the ${where} input is at least 60 % wide at 200 % text: ${width}x${height}`, async ({
      page,
    }) => {
      await ask(page, width, height);
      if (where === 'Today') {
        await page.goto(at('/app'));
        await expect(page.getByText('Your plan is ready.')).toBeAttached();
      }
      await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      const [input, content] = await questionInput(page).evaluate((el) => {
        const form = el.closest('form')!;
        const style = getComputedStyle(form);
        return [
          el.getBoundingClientRect().width,
          form.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight),
        ];
      });
      console.log(
        `AK-10 ${where} ${width}x${height}: input ${input}, form content ${content}, ${Math.round((100 * input) / content)} %`,
      );
      expect(input).toBeGreaterThanOrEqual(content * 0.6);
    });
  }
}

for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
] as const) {
  test(`AK-10: the input and Send share a row at normal text: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const tops = [
      (await questionInput(page).boundingBox())!.y,
      (await page.getByRole('button', { name: 'Send' }).boundingBox())!.y,
    ];
    console.log(
      `AK-10 ${width}x${height}: input and Send tops ${tops.join(',')}`,
    );
    expect(tops[0]).toBe(tops[1]);
  });
}

// PF-01 Ask: the forecast lands at about 0.8 s.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
] as const) {
  test(`Ask's layout shift stays under 0.1: ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    await page.route('**/api/v1/air-quality/forecast**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fallback();
    });
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
    await page.goto(at('/app/ask'));
    await expect(page.getByText(/retrieved/).first()).toBeAttached();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    console.log(`PF-01 Ask CLS ${width}x${height} = ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });
}

// Redesign P5: My Home and Better Habits. Every page uses the stub, so no
// request reaches the AI and nothing is saved.

// The shipped guide library, answered from the stub: its groups and card
// counts decide the layout, so the layout tests use it, not the short fixture.
const realGuides = (page: Page) =>
  page.route('**/api/v1/recommendations/guides**', (route) =>
    route.fulfill({
      json: {
        data: guideSet(
          route.request().url().includes('topic=habits') ? 'habits' : 'home',
        ),
      },
    }),
  );

// MH-01 / E2: with a place, "Today, for your home" is there from the first
// paint, even while the plan never answers; with no place it is absent.
test('MH-01: My Home shows its plan section while the plan has not answered', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  // Never answers: the plan stays due.
  await page.route('**/api/v1/recommendations/daily-plan', () => {});
  await page.goto(at('/app/home'));
  const today = page.getByRole('region', { name: 'Today, for your home' });
  await expect(today).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Today, for your home' }),
  ).toBeVisible();
  await expect(today.getByText("Finding today's suggestions…")).toBeAttached();
  console.log('MH-01 region and heading visible with the plan unanswered');
});

test('MH-01: My Home with no place has no plan section', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.goto('/app/home');
  await expect(
    page.getByRole('heading', { name: 'Ways to improve indoor air' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Today, for your home' }),
  ).toHaveCount(0);
});

// What the grid at `selector` laid out: each item by its place and width.
type Cell = { text: string; top: number; left: number; width: number };
async function cells(page: Page, selector: string, item: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((grid, item) => {
      const box = grid.getBoundingClientRect();
      const style = getComputedStyle(grid);
      const out: Cell[] = [];
      for (const el of grid.querySelectorAll(`:scope > ${item}`)) {
        const r = el.getBoundingClientRect();
        out.push({
          text: (el.querySelector('h2, h3')?.textContent ?? '').trim(),
          top: Math.round(r.top),
          left: Math.round(r.left - box.left),
          width: Math.round(r.width),
        });
      }
      const content =
        box.width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      return { out, content };
    }, item);
}
function rowsOf(list: Cell[]): Cell[][] {
  const rows: Cell[][] = [];
  for (const c of list) {
    const row = rows.find((r) => Math.abs(r[0]!.top - c.top) < 4);
    if (row) row.push(c);
    else rows.push([c]);
  }
  return rows;
}

// MH-03 / BH-02: at 1280 and 1440 every row of groups but the last fills the
// grid's width, so no cell is empty.
for (const [width, height] of [
  [1280, 720],
  [1440, 900],
] as const) {
  for (const [path, label] of [
    ['/app/habits', 'Better Habits'],
    ['/app/home', 'My Home'],
  ] as const) {
    test(`${label} groups fill their rows: ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await stub(page, 'not_elevated');
      await realGuides(page);
      await page.goto(at(path));
      await expect(
        page.locator('main [class~="@container"]:visible'),
      ).toBeVisible();
      await page.waitForLoadState('networkidle');
      const { out, content } = await cells(
        page,
        'main [class~="@container"]:visible',
        'section',
      );
      const rows = rowsOf(out);
      console.log(
        `${label} ${width}x${height}: grid ${Math.round(content)}px; rows ` +
          rows
            .map(
              (r) =>
                '[' +
                r.map((c) => `${c.text} ${c.left}+${c.width}`).join(', ') +
                ']',
            )
            .join(' '),
      );
      for (const row of rows.slice(0, -1)) {
        const end = Math.max(...row.map((c) => c.left + c.width));
        expect(Math.abs(end - content)).toBeLessThanOrEqual(2);
        expect(Math.min(...row.map((c) => c.left))).toBeLessThanOrEqual(2);
      }
    });
  }

  test(`My Home's plan cards leave no empty column: ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    await page.goto(at('/app/home'));
    await expect(
      page
        .getByRole('region', { name: 'Today, for your home' })
        .locator('article')
        .first(),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    const { out } = await cells(page, '[aria-labelledby] > .grid', 'article');
    const rows = rowsOf(out);
    console.log(
      `My Home plan cards ${width}x${height}: ` +
        rows
          .map((r) => `[${r.map((c) => `${c.left}+${c.width}`).join(', ')}]`)
          .join(' '),
    );
    // Every row before the last has as many cards as the first has columns.
    const columns = rows[0]!.length;
    for (const row of rows.slice(0, -1)) expect(row).toHaveLength(columns);
    expect(columns).toBeGreaterThan(1);
  });
}

// PF-01 My Home and Better Habits: the guides land at about 0.8 s and, on
// My Home, the plan at about 1.5 s; the layout shifts by under 0.1 in total.
// My Home's plan is the one a user with no answers gets on a day within the
// limit: the single indoor card every home gets (rules.ts, indoor.smoke-sources).
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
] as const) {
  for (const [path, label, ready] of [
    ['/app/home', 'My Home', 'Cooking and smoke'],
    ['/app/habits', 'Better Habits', 'Waste'],
  ] as const) {
    test(`${label}'s layout shift stays under 0.1: ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await stub(page, 'not_elevated');
      await realGuides(page);
      const later = (pattern: string, ms: number) =>
        page.route(pattern, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, ms));
          await route.fallback();
        });
      await later('**/api/v1/recommendations/guides**', 800);
      if (path === '/app/home') {
        const smoke = rulesPlanFixture.featured.find(
          (f) => f.candidate.id === 'indoor.smoke-sources',
        )!;
        const plan = planAt(
          {
            ...rulesPlanFixture,
            air: {
              ...rulesPlanFixture.air,
              level: 'not_elevated' as const,
              checks: [
                {
                  pollutant: 'PM2_5' as const,
                  status: 'within_limit' as const,
                  average24h: 41.2,
                  limit: 60,
                },
                {
                  pollutant: 'PM10' as const,
                  status: 'within_limit' as const,
                  average24h: 63.5,
                  limit: 100,
                },
              ],
            },
            notices: [],
            featured: [smoke],
            more: [],
          },
          new Date(),
        );
        await page.route('**/api/v1/recommendations/daily-plan', async (r) => {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await r.fulfill({ json: { data: plan } });
        });
      }
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
      await page.goto(at(path));
      await expect(
        page.getByRole('heading', { name: ready }).first(),
      ).toBeVisible();
      if (path === '/app/home') {
        // The plan's cards, after the later of the two replies.
        await expect(
          page
            .getByRole('region', { name: 'Today, for your home' })
            .locator('article')
            .first(),
        ).toBeVisible();
      }
      await page.waitForLoadState('networkidle');
      // A frame later, so the last shift is recorded.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      const cls = await page.evaluate(
        () => (window as unknown as { cls: number }).cls,
      );
      console.log(`PF-01 ${label} CLS ${width}x${height} = ${cls}`);
      expect(cls).toBeLessThan(0.1);
    });
  }
}

// Redesign P6: My Profile, Welcome and Privacy. Every request is stubbed, and
// every request to a host other than localhost is aborted and counted, so
// nothing reaches Supabase (the built client carries its real address).
const PLANS_EMPTY =
  'No saved plans yet. Use Save plan under See your full day on Today.';
const WIDTHS = [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
] as const;

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

const stubSearch = (page: Page) =>
  page.route('**/api/v1/locations/search**', (route) =>
    route.fulfill({ json: { data: searchFixture } }),
  );

// MP-04 (F3): the order of My Profile's sections, and from lg the form on the
// left with Saved plans and Your data stacked on the right.
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`MP-04: My Profile's section order and columns: ${width}x${height}`, async ({
    page,
  }) => {
    await blockExternal(page);
    await load(page, width, height, '/app/profile');
    const box = async (name: string) => {
      const heading = page.getByRole('heading', { level: 2, name });
      await expect(heading).toBeVisible();
      return (await heading
        .locator('xpath=ancestor::section[1]')
        .boundingBox())!;
    };
    const form = await box('Your household (optional)');
    const saved = await box('Saved plans');
    const data = await box('Your data');
    console.log(
      `MP-04 ${width}x${height} form ${JSON.stringify([form.x, form.y])} saved ${JSON.stringify([saved.x, saved.y])} data ${JSON.stringify([data.x, data.y])}`,
    );
    if (width >= 1024) {
      expect(form.x).toBeLessThan(saved.x);
      expect(Math.abs(data.x - saved.x)).toBeLessThan(1);
      expect(saved.y).toBeLessThan(data.y);
      expect(data.y).toBeGreaterThanOrEqual(saved.y + saved.height);
    } else {
      expect(form.y).toBeLessThan(saved.y);
      expect(saved.y).toBeLessThan(data.y);
      expect(Math.abs(form.x - saved.x)).toBeLessThan(1);
    }
  });
}

// MP-02 (F-06): with no session the section is there, says so, and asks
// nothing of the plans endpoint.
test('MP-02: Saved plans with no session says none, and sends no request', async ({
  page,
}) => {
  await blockExternal(page);
  const plans: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/plans') {
      plans.push(request.url());
    }
  });
  await load(page, 1280, 720, '/app/profile');
  await expect(page.getByText(PLANS_EMPTY)).toBeVisible();
  await page.waitForLoadState('networkidle');
  console.log(`MP-02 requests to /api/v1/plans = ${plans.length}`);
  expect(plans).toHaveLength(0);
  // F-05: no session, so nothing to delete.
  await expect(
    page.getByRole('button', { name: 'Delete my saved data' }),
  ).toHaveCount(0);
});

// WE-01 (F4): step 1 has no place chip; step 2 has it again.
test('WE-01: no place chip on Welcome step 1, back on step 2', async ({
  page,
}) => {
  await blockExternal(page);
  await stubSearch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.goto('/app/welcome');
  const chip = page
    .locator('header')
    .getByRole('button', { name: /^(Choose a place|Change place)/ });
  await expect(
    page.getByRole('heading', { level: 1, name: /check air quality/ }),
  ).toBeVisible();
  await expect(chip).toHaveCount(0);
  await expect(
    page.getByText(
      "See today's air forecast for your place and one thing you could do.",
    ),
  ).toBeVisible();
  console.log(`WE-01 step 1 chips in header = ${await chip.count()}`);
  const box = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  await box.fill('Pune');
  await expect(page.getByRole('option').first()).toBeVisible();
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(
    page.getByRole('heading', { level: 1, name: /typical day/ }),
  ).toBeVisible();
  await expect(chip).toBeVisible();
  console.log(`WE-01 step 2 chips in header = ${await chip.count()}`);
});

// WE-03 / PF-01: Welcome opened directly. The placeholder is read the moment
// it appears, then compared with the first step's panel.
for (const [width, height] of WIDTHS) {
  test(`WE-03: Welcome's layout shift stays under 0.1: ${width}x${height}`, async ({
    page,
  }) => {
    await blockExternal(page);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    await page.addInitScript(() => {
      const w = window as unknown as { cls: number; placeholder: number };
      w.cls = 0;
      w.placeholder = -1;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) w.cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      // The placeholder is on screen for a moment: take its height then.
      new MutationObserver(() => {
        const el = [
          ...document.querySelectorAll('main [aria-busy="true"]'),
        ].find((e) => e.textContent?.includes('Loading your place'));
        if (el && w.placeholder < 0) {
          w.placeholder = el.getBoundingClientRect().height;
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/app/welcome');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Where should we check air quality?',
      }),
    ).toBeVisible();
    await page.waitForLoadState('networkidle');
    // A frame later, so the last shift is recorded.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    const placeholder = await page.evaluate(
      () => (window as unknown as { placeholder: number }).placeholder,
    );
    const panel = (await page
      .getByRole('heading', { level: 1 })
      .locator(
        'xpath=ancestor::div[@data-part="title-block"]/following-sibling::div[1]',
      )
      .boundingBox())!;
    console.log(
      `PF-01 Welcome CLS ${width}x${height} = ${cls}; placeholder ${placeholder} px, step-1 panel ${panel.height} px`,
    );
    expect(cls).toBeLessThan(0.1);
  });
}

// PV-03 (F5): Privacy has the app's navy header and one way back.
test('PV-03: Privacy has the navy header and a way back to the app', async ({
  page,
}) => {
  await blockExternal(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  const colours = (p: Page) =>
    p.locator('header').evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.color];
    });
  await page.goto(at('/app'));
  const shell = await colours(page);
  await page.goto('/privacy');
  await expect(page.locator('header')).toHaveClass(/on-dark/);
  expect(await colours(page)).toEqual(shell);
  const back = page.getByRole('link', { name: 'Back to AirAware' });
  await expect(back).toHaveAttribute('href', '/app');
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('header').locator('a, button')).toHaveCount(1);
});

const SEEN = [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
  '/app/welcome',
  '/privacy',
];
const seenUrl = (path: string) =>
  path.startsWith('/app') && path !== '/app/welcome' ? at(path) : path;

// PR-01: looking is not saving. No account is made, no session is stored,
// and Supabase's sign-in service is never called.
test('PR-01: visiting every page creates no account and calls no auth URL', async ({
  page,
}) => {
  const blocked = await blockExternal(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  for (const path of SEEN) {
    await page.goto(seenUrl(path));
    await expect(page.locator('h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  const auth = blocked.filter(
    (url) => url.includes('supabase.co') && url.includes('/auth/'),
  );
  const keys = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => /^sb-.*-auth-token$/.test(key)),
  );
  console.log(
    `PR-01 auth requests = ${auth.length}, other blocked = ${blocked.length - auth.length}, sb keys = ${keys.length}`,
  );
  expect(auth).toHaveLength(0);
  expect(keys).toHaveLength(0);
});

// PR-02: the device location is read once, by the click, never by loading.
test('PR-02: geolocation is read only after "Use my location"', async ({
  page,
}) => {
  await blockExternal(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.addInitScript(() => {
    const w = window as unknown as { geoCalls: number };
    w.geoCalls = 0;
    const answer = {
      coords: { latitude: 18.52, longitude: 73.86, accuracy: 10 },
      timestamp: Date.now(),
    };
    navigator.geolocation.getCurrentPosition = (success) => {
      w.geoCalls++;
      setTimeout(() => success(answer as GeolocationPosition), 0);
    };
    navigator.geolocation.watchPosition = (success) => {
      w.geoCalls++;
      setTimeout(() => success(answer as GeolocationPosition), 0);
      return 1;
    };
  });
  const calls = () =>
    page.evaluate(() => (window as unknown as { geoCalls: number }).geoCalls);
  for (const path of SEEN) {
    await page.goto(seenUrl(path));
    await expect(page.locator('h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await calls()).toBe(0);
  }
  await page.goto('/app/welcome');
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /typical day/ }),
  ).toBeVisible();
  const after = await calls();
  console.log(`PR-02 geolocation calls: loading 0, after one click ${after}`);
  expect(after).toBe(1);
});
