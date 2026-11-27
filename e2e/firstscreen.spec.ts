// Redesign P2: the first screen's shell. The phone bar, the place chip, the
// logo, the Tab order, enlarged text and the unknown-page redirect. Every page
// uses the stub, so no request reaches the AI and nothing is saved.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  aiAskFixture,
  rulesAskFixture,
} from '../client/src/test/askFixtures.ts';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { at, pastTheEdge, stub, type Level } from './layout.ts';
import { guideSet } from '../server/src/services/recommendations/guides.ts';
import { searchFixture } from '../client/src/test/fixtures.ts';
import { forecastAt, planAt, PUNE, topicChip } from './routes.ts';

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
    const label = page.locator('header button .truncate:visible');
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
    // The top card; the open full day repeats its heading (owner, 27 Nov).
    await expect(
      page
        .getByRole('heading', {
          name: 'Consider an indoor alternative for exercise',
        })
        .first(),
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
// The full day starts open (owner, 27 Nov), so it is left out of the details
// check; its Save plan is outlined, so the filled count stays strict.
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
  expect(
    await page
      .locator('details[open]')
      .evaluateAll(
        (all) =>
          all.filter(
            (d) =>
              !d
                .querySelector(':scope > summary')
                ?.textContent?.includes('See your full day'),
          ).length,
      ),
  ).toBe(0);
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

// AK-01: the question box is on the first screen. Phones pin it from the
// start; from md up the Ask column's smaller gap makes it fit (J17, 26 Nov).
for (const [width, height] of [
  [390, 844],
  [320, 640],
  [1280, 720],
] as const) {
  test(`AK-01: the question box position on the first screen at ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const bottom = await bottomOf(questionInput(page));
    const limit = width < 768 ? await barTop(page) : 720;
    console.log(
      `AK-01 ${width}x${height}: input bottom ${bottom}, limit ${limit}, margin ${limit - bottom}`,
    );
    expect(bottom).toBeLessThanOrEqual(limit + 0.5);
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
    const form = page.locator('[data-part="ask-composer"]');
    const pinned = await form.evaluate(
      (el) => getComputedStyle(el).position === 'sticky',
    );
    const composerTop = (await form.boundingBox())!.y;
    const old = width < 768 ? await barTop(page) : height;
    const limit = pinned ? Math.min(old, composerTop) : old;
    console.log(
      `AK-04 ${width}x${height}: article top ${top}, first paragraph top ${paragraph}, limit ${limit} (old ${old}, composer top ${composerTop}, pinned ${pinned}), scrollY ${scrolls.join(',')}`,
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

// AK-11 to AK-18: the pinned, auto-growing question box.
const AC_SIZES = [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
] as const;
const composer = (page: Page) => page.locator('[data-part="ask-composer"]');
// Phones pin the box from the start; from md up it pins after the first
// question (owner ruling J17).
async function askFirst(page: Page) {
  await page
    .getByRole('button', { name: 'Can I go for a morning walk today?' })
    .click();
  await expect(
    page.locator('article.ask-answer').last().getByText('Made by our rules'),
  ).toBeVisible();
}
const answerPosts = (page: Page) => {
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/v1/assistant/answer'))
      posts.push(r.url());
  });
  return posts;
};

for (const [width, height] of AC_SIZES) {
  test(`AK-11: the box is pinned and inside the screen: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    expect(
      await composer(page).evaluate((el) => getComputedStyle(el).position),
    ).toBe(width < 768 ? 'sticky' : 'static');
    await askFirst(page);
    const box = (await questionInput(page).boundingBox())!;
    const limit = width < 768 ? await barTop(page) : height;
    const position = await composer(page).evaluate(
      (el) => getComputedStyle(el).position,
    );
    console.log(
      `AK-11 ${width}x${height}: box top ${box.y}, bottom ${box.y + box.height}, limit ${limit}, position ${position}`,
    );
    expect(position).toBe('sticky');
    expect(box.y).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(limit + 0.5);
  });

  test(`AK-12: a focused answer element is not hidden by the box: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    await page
      .getByRole('button', { name: 'Can I go for a morning walk today?' })
      .click();
    const article = page.locator('article.ask-answer').last();
    await expect(article.getByText('Made by our rules')).toBeVisible();
    await article
      .locator('h2')
      .evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
    let checked = 0;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const m = await page.evaluate(() => {
        const el = document.activeElement!;
        const inThread = !!el.closest('[data-part="ask-thread"]');
        const form = document.querySelector('[data-part="ask-composer"]')!;
        return {
          inThread,
          top: el.getBoundingClientRect().top,
          composerTop: form.getBoundingClientRect().top,
          name: (el.textContent ?? '').trim().slice(0, 20),
        };
      });
      if (!m.inThread) continue;
      checked++;
      console.log(
        `AK-12 ${width}x${height} tab ${i + 1} "${m.name}": top ${m.top}, composer top ${m.composerTop}`,
      );
      expect(m.top).toBeLessThan(m.composerTop);
    }
    expect(checked).toBeGreaterThan(0);
  });

  test(`AK-13: the box grows to a limit and then scrolls: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    // 100 short lines are 200 characters (the box's limit) and reach the cap
    // at every width; 200 words of text would not on a wide screen.
    await questionInput(page).fill('w\n'.repeat(100));
    const m = await questionInput(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        height: el.getBoundingClientRect().height,
        max: parseFloat(s.maxHeight),
        scroll: el.scrollHeight,
        client: el.clientHeight,
        overflowY: s.overflowY,
      };
    });
    const formHeight = (await composer(page).boundingBox())!.height;
    console.log(
      `AK-13 ${width}x${height}: tallest box ${m.height}, max ${m.max}, scrollHeight ${m.scroll}/${m.client}, form height ${formHeight}, form + bar ${formHeight + 56}`,
    );
    expect(m.height).toBeGreaterThan(48);
    expect(m.height).toBeLessThanOrEqual(m.max + 0.5);
    expect(m.scroll).toBeGreaterThan(m.client);
    expect(m.overflowY).toBe('auto');
    // The scroll padding in index.css: 18.5rem on phones (the bar is 3.5rem), 14.5rem on desktop.
    expect(width < 768 ? formHeight + 56 : formHeight).toBeLessThanOrEqual(
      width < 768 ? 296 : 232,
    );
  });

  test(`AK-14: Enter sends, Shift+Enter adds a line: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const posts = answerPosts(page);
    const input = questionInput(page);
    await input.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const empty = posts.length;
    await page.keyboard.type('first');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('second');
    await page.waitForTimeout(300);
    const afterShift = posts.length;
    const value = await input.inputValue();
    await page.keyboard.press('Enter');
    await expect.poll(() => posts.length).toBe(1);
    console.log(
      `AK-14 ${width}x${height}: posts after empty Enter ${empty}, after Shift+Enter ${afterShift}, after Enter ${posts.length}`,
    );
    expect(empty).toBe(0);
    expect(afterShift).toBe(0);
    expect(value).toContain('\n');
  });

  test(`AK-15: a double click on Send posts once: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const posts = answerPosts(page);
    await questionInput(page).fill('Is it a good day to dry clothes outside?');
    await page.getByRole('button', { name: 'Send' }).dblclick();
    await page.waitForTimeout(500);
    console.log(`AK-15 ${width}x${height}: ${posts.length} POST(s)`);
    expect(posts).toHaveLength(1);
  });
}

// Media queries in rem follow the browser's default font size, so the large
// text is set through CDP, not a style tag.
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`AK-16: at 32 px browser text the box is not pinned: ${width}x${height}`, async ({
    page,
  }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', {
      fontSizes: { standard: 32, fixed: 26 },
    });
    await ask(page, width, height);
    const position = await composer(page).evaluate(
      (el) => getComputedStyle(el).position,
    );
    const edge = await pastTheEdge(page);
    console.log(
      `AK-16 ${width}x${height}: position ${position}, past the edge ${edge.length}`,
    );
    expect(position).toBe('static');
    expect(edge).toEqual([]);
  });
}

test('AK-17: 200 unbroken characters stay inside the screen at 320x640', async ({
  page,
}) => {
  await ask(page, 320, 640);
  await questionInput(page).fill('a'.repeat(200));
  const edge = await pastTheEdge(page);
  console.log(`AK-17 320x640: past the edge ${edge.join('; ') || 'none'}`);
  expect(edge).toEqual([]);
});

// AK-16 at the tablet size: 30.2rem at 32 px is 966 px, so the box stays
// pinned. It must still not overflow, and with the phone bar it may take at
// most half the screen.
test('AK-16: at 32 px browser text on a tablet the box and bar take at most half the screen: 768x1024', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', {
    fontSizes: { standard: 32, fixed: 26 },
  });
  await ask(page, 768, 1024);
  await askFirst(page);
  const edge = await pastTheEdge(page);
  const composerTop = (await composer(page).boundingBox())!.y;
  const position = await composer(page).evaluate(
    (el) => getComputedStyle(el).position,
  );
  const bar = page.locator('nav[aria-label="Main"]');
  const limit = (await bar.isVisible()) ? await barTop(page) : 1024;
  console.log(
    `AK-16 768x1024: position ${position}, composer top ${composerTop}, limit ${limit}, taken ${limit - composerTop} of 1024 (half is 512), past the edge ${edge.length}`,
  );
  expect(edge).toEqual([]);
  expect(limit - composerTop).toBeLessThanOrEqual(0.5 * 1024);
});

// AK-19: focusing or typing in the pinned box never moves a page that is being
// read (the owner's spec, section 8).
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`AK-19: focusing and typing in the box leave the scroll alone: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    for (const label of [
      'Outdoor activities',
      'Windows and ventilation',
      'Indoor air',
    ]) {
      const before = await page.locator('article.ask-answer').count();
      await (await topicChip(page, label)).click();
      await expect(page.locator('article.ask-answer')).toHaveCount(before + 1);
      // Its first advice card: the context lines show only once (owner, 27 Nov).
      await expect(
        page.locator('article.ask-answer').last().locator('h3').first(),
      ).toBeVisible();
    }
    await page
      .locator('article.ask-answer')
      .first()
      .evaluate((el) =>
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY),
      );
    const position = await composer(page).evaluate(
      (el) => getComputedStyle(el).position,
    );
    expect(position).toBe('sticky');
    const y = () => page.evaluate(() => window.scrollY);
    const start = await y();
    // The control just before the box in the page, then Tab into the box.
    await page.evaluate(() => {
      const thread = document.querySelector('[data-part="ask-thread"]')!;
      const last = [
        ...thread.querySelectorAll<HTMLElement>('a, button, summary'),
      ].at(-1)!;
      last.focus({ preventScroll: true });
    });
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => document.activeElement === document.querySelector('textarea'),
      ),
    ).toBe(true);
    const afterTab = await y();
    await questionInput(page).click();
    await page.keyboard.type('0123456789');
    const afterTyping = await y();
    console.log(
      `AK-19 ${width}x${height}: scrollY start ${start}, after Tab ${afterTab}, after typing ${afterTyping}`,
    );
    expect(Math.abs(afterTab - start)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterTyping - start)).toBeLessThanOrEqual(1);
  });
}

// AK-21: the flat "tray" bottom shows only while the box is stuck; at the
// page end it is a normal rounded card.
for (const [width, height] of [
  [390, 844],
  [1280, 720],
] as const) {
  test(`AK-21: the box is flat only while stuck: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    for (const label of [
      'Outdoor activities',
      'Windows and ventilation',
      'Indoor air',
    ]) {
      const before = await page.locator('article.ask-answer').count();
      await (await topicChip(page, label)).click();
      await expect(page.locator('article.ask-answer')).toHaveCount(before + 1);
      // Its first advice card: the context lines show only once (owner, 27 Nov).
      await expect(
        page.locator('article.ask-answer').last().locator('h3').first(),
      ).toBeVisible();
    }
    await page
      .locator('article.ask-answer')
      .first()
      .evaluate((el) =>
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY),
      );
    const panel = page.locator('[data-part="ask-composer-panel"]');
    // Scroll-state is updated while rendering: wait two frames before reading.
    const read = () =>
      panel.evaluate(
        (el) =>
          new Promise<{ radius: string; color: string }>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const s = getComputedStyle(el);
                resolve({
                  radius: s.borderBottomLeftRadius,
                  color: s.borderBottomColor,
                });
              }),
            ),
          ),
      );
    const supported = await page.evaluate(() =>
      CSS.supports('container-type', 'scroll-state'),
    );
    expect(
      await composer(page).evaluate((el) => getComputedStyle(el).position),
    ).toBe('sticky');
    const stuck = await read();
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const end = await read();
    console.log(
      `AK-21 ${width}x${height}: scroll-state supported ${supported}; stuck radius ${stuck.radius} color ${stuck.color}; at the end radius ${end.radius} color ${end.color}`,
    );
    if (supported) expect(stuck.radius).toBe('0px');
    else console.log('AK-21: scroll-state unsupported, stuck check skipped');
    expect(parseFloat(end.radius)).toBeGreaterThan(0);
    expect(end.color).not.toBe('rgba(0, 0, 0, 0)');
  });
}

// AK-20: "Not current" stays next to the time and above the pinned box.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [1280, 720],
] as const) {
  test(`AK-20: a stale answer's "Not current" is above the box: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const stale = planAt(
      aiAskFixture,
      new Date(Date.now() - 2 * 60 * 60 * 1000),
    );
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({ json: { data: stale } }),
    );
    await page
      .getByRole('button', { name: 'Can I go for a morning walk today?' })
      .click();
    const banner = page.locator(
      'article.ask-answer [data-part="stale-banner"]',
    );
    await expect(banner).toBeVisible();
    const bannerTop = (await banner.boundingBox())!.y;
    const composerTop = (await composer(page).boundingBox())!.y;
    console.log(
      `AK-20 ${width}x${height}: banner top ${bannerTop}, composer top ${composerTop}`,
    );
    expect(bannerTop).toBeLessThan(composerTop);
  });
}

// Emulation only: a viewport cut to 480 high stands in for a phone with its
// keyboard open. It is not a real on-screen keyboard.
// 500 is above the 30.2rem (483.2 px) pin threshold, 480 is below it.
for (const [height, position] of [
  [500, 'sticky'],
  [480, 'static'],
] as const) {
  test(`AK-18: the focused box is fully inside a 390x${height} viewport, ${position} (emulation, not a real keyboard)`, async ({
    page,
  }) => {
    await ask(page, 390, height);
    await askFirst(page);
    await questionInput(page).focus();
    const box = (await questionInput(page).boundingBox())!;
    const actual = await composer(page).evaluate(
      (el) => getComputedStyle(el).position,
    );
    const limit = position === 'sticky' ? await barTop(page) : height;
    console.log(
      `AK-18 390x${height} (viewport emulation, not a real keyboard), ${position === 'sticky' ? 'pinned' : 'not pinned'}: position ${actual}, box top ${box.y}, bottom ${box.y + box.height}, limit ${limit}`,
    );
    expect(actual).toBe(position);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(limit + 0.5);
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
    // The auto-growing box is taller than Send, so "one row" now means Send
    // lies inside the box's vertical span, to its right.
    const input = (await questionInput(page).boundingBox())!;
    const send = (await page
      .getByRole('button', { name: 'Send' })
      .boundingBox())!;
    console.log(
      `AK-10 ${width}x${height}: input top ${input.y} bottom ${input.y + input.height} right ${input.x + input.width}, Send top ${send.y} bottom ${send.y + send.height} left ${send.x}`,
    );
    expect(send.y).toBeGreaterThanOrEqual(input.y - 0.5);
    expect(send.y + send.height).toBeLessThanOrEqual(
      input.y + input.height + 0.5,
    );
    expect(send.x).toBeGreaterThanOrEqual(input.x + input.width - 0.5);
  });
}

// The weather comparison fits the narrowest phone: nothing reaches past the
// screen edge, and the whole table is on screen.
test('the weather comparison fits 320x640 with every column whole', async ({
  page,
}) => {
  await load(page, 320, 640);
  const table = page.getByRole('table', {
    name: 'Weather · Open-Meteo model data',
  });
  await table.scrollIntoViewIfNeeded();
  const box = (await table.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  // Inside its panel's content box (the panel's padding and border), not
  // just inside the screen.
  const content = await table.evaluate((el) => {
    const panel = el.parentElement!;
    const rect = panel.getBoundingClientRect();
    const style = getComputedStyle(panel);
    const left =
      parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right =
      parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight);
    return { left: rect.left + left, right: rect.right - right };
  });
  expect(box.x).toBeGreaterThanOrEqual(content.left - 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(content.right + 0.5);
  for (const name of ['Yesterday', 'Today', 'Tomorrow']) {
    await expect(table.getByRole('columnheader', { name })).toBeVisible();
  }
  expect(await pastTheEdge(page)).toEqual([]);
});

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

// MP-04 (F3): the order of My Profile's sections, and from lg the form across
// the top with Saved plans and Your data side by side beneath it.
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
      // The form spans the width; Saved plans and Your data sit side by side
      // beneath it.
      expect(Math.abs(form.x - saved.x)).toBeLessThan(1);
      expect(saved.y).toBeGreaterThanOrEqual(form.y + form.height);
      expect(saved.x).toBeLessThan(data.x);
      expect(Math.abs(data.y - saved.y)).toBeLessThan(1);
      expect(form.x + form.width).toBeGreaterThanOrEqual(
        data.x + data.width - 1,
      );
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

// P11: the bottom bar at 200 % text (Chromium's default font at 32 px, set
// through the real setting) and at normal text.
const BAR_SIZES = [
  [320, 640],
  [390, 844],
] as const;

async function openBar(page: Page, width: number, height: number, px?: number) {
  if (px) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', {
      fontSizes: { standard: px, fixed: 26 },
    });
  }
  await page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    (route) => route.abort(),
  );
  await load(page, width, height);
  // Only the phone bar is under test; the top bar starts at md.
  return page.locator('nav[aria-label="Main"]');
}

for (const [width, height] of BAR_SIZES) {
  test(`at 200 % text the bar stays on screen, each item a 44 px target: ${width}x${height}`, async ({
    page,
  }) => {
    const bar = await openBar(page, width, height, 32);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).fontSize,
      ),
    ).toBe('32px');
    const out = await bar.evaluate((nav) => {
      const width = document.documentElement.clientWidth;
      return [nav, ...nav.querySelectorAll('*')]
        .map((el) => [el.tagName, el.getBoundingClientRect()] as const)
        .filter(([, r]) => r.left < -0.5 || r.right > width + 0.5)
        .map(
          ([tag, r]) => `${tag} ${Math.round(r.left)}..${Math.round(r.right)}`,
        );
    });
    expect(out).toEqual([]);
    const links = bar.getByRole('link');
    expect(await links.count()).toBe(5);
    for (const link of await links.all()) {
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
      expect(await link.getAttribute('aria-label')).toBeTruthy();
    }
  });
}

for (const [width, height] of [...BAR_SIZES, [768, 1024]] as const) {
  test(`at normal text the bar labels show whole: ${width}x${height}`, async ({
    page,
  }) => {
    const bar = await openBar(page, width, height);
    const labels = bar.locator('a > span:not(:first-child)');
    for (const label of await labels.all()) {
      if (!(await label.isVisible())) continue;
      expect(
        await label.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
  });
}

// P11 review: a nav click focuses #main without scrolling, so the new page
// (or the same page, tapped again) starts at its top with the header in view.
for (const [width, height] of [
  [390, 844],
  [1280, 800],
] as const) {
  test(`a nav click opens the page at its top: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    const link = page
      .locator('nav[aria-label="Main"]')
      .getByRole('link', { name: 'Better Habits' });
    // From Today, then Better Habits tapped again.
    for (let tap = 1; tap <= 2; tap += 1) {
      await page.evaluate(() => window.scrollTo(0, 400));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await link.click();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Better Habits' }),
      ).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(
        'main',
      );
    }
  });
}

// AK-22: the Ask column is centred in main (owner ruling J15).
for (const [width, height] of [
  [1280, 720],
  [1896, 828],
] as const) {
  test(`AK-22: the Ask column is centred: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    // The starters' panel (the topic chips sit under "More topics" now).
    const panel = page
      .getByRole('button', { name: 'Can I go for a morning walk today?' })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    const panelBox = (await panel.boundingBox())!;
    const main = await page.locator('main').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        left: r.left + parseFloat(s.paddingLeft),
        right: r.right - parseFloat(s.paddingRight),
      };
    });
    const panelCentre = panelBox.x + panelBox.width / 2;
    const mainCentre = (main.left + main.right) / 2;
    console.log(
      `AK-22 ${width}x${height}: panel centre ${panelCentre}, main content centre ${mainCentre}, difference ${Math.abs(panelCentre - mainCentre)}`,
    );
    expect(Math.abs(panelCentre - mainCentre)).toBeLessThanOrEqual(2);
  });
}

// AK-23: on Ask with a place, the credit line is in the box and the footer
// card is gone (owner ruling J16).
for (const [width, height] of [
  [320, 640],
  [1280, 720],
] as const) {
  test(`AK-23: the credit line shows and the footer card does not: ${width}x${height}`, async ({
    page,
  }) => {
    await ask(page, width, height);
    const credit = page.locator('[data-part="ask-credit"]');
    await credit.scrollIntoViewIfNeeded();
    await expect(credit).toBeVisible();
    await expect(
      credit.getByRole('link', { name: 'Open-Meteo.com' }),
    ).toBeVisible();
    await expect(credit.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(
      page.getByText('Air-quality forecasts from').locator('visible=true'),
    ).toHaveCount(0);
    console.log(
      `AK-23 ${width}x${height}: credit text "${await credit.innerText()}"`,
    );
  });
}

// Owner (27 Nov): opened, "See your full day" stretched the plan card down
// the page (2,598 px at 1280, 3,317 px at 320). It now scrolls in its own box,
// so the card stays within about one screen.
for (const [width, height] of [
  [320, 640],
  [1280, 800],
] as const) {
  test(`the full day scrolls in its own box: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    // It starts open (owner, 27 Nov): no click, which would fold it.
    const body = page.locator(
      'details:has(> summary:text("See your full day")) > div',
    );
    await expect(body).toBeVisible();
    const { scrollHeight, clientHeight } = await body.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    expect(clientHeight).toBeLessThanOrEqual(height * 0.65);
    // Save plan stays reachable inside the box.
    await page
      .getByRole('button', { name: 'Save plan' })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Save plan' }),
    ).toBeInViewport();
  });
}

// Owner (27 Nov): from lg the weather card and the recommendation card end
// at the same level, with the full day open.
for (const [width, height] of [
  [1280, 800],
  [1896, 915],
] as const) {
  test(`Today's two columns end level: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    await expect(
      page.locator('details[open] > summary', { hasText: 'See your full day' }),
    ).toBeVisible({ timeout: 60_000 });
    const weather = page.getByRole('table', {
      name: 'Weather · Open-Meteo model data',
    });
    const plan = page.locator('section', {
      has: page.getByRole('heading', { name: 'Your recommendation for today' }),
    });
    const bottom = async (l: Locator) => {
      const b = (await l.boundingBox())!;
      return b.y + b.height;
    };
    const weatherCard = weather.locator('xpath=ancestor::section[1]');
    const [w, p] = [await bottom(weatherCard), await bottom(plan)];
    console.log(
      `columns ${width}x${height}: weather ends ${w}, plan ends ${p}`,
    );
    expect(Math.abs(w - p)).toBeLessThanOrEqual(2);
  });
}

// Owner (27 Nov, Ask UX spec §5.1): Ask reads in a centred column of at most
// 56rem (896 px), narrower than Today on wide screens.
for (const [width, height] of [
  [1280, 720],
  [1896, 828],
] as const) {
  test(`Ask is a narrower reading column: ${width}x${height}`, async ({
    page,
  }) => {
    // Each page's title block spans its column.
    const titleWidth = async () =>
      (await page
        .locator('[data-part="title-block"]:visible')
        .first()
        .boundingBox())!.width;
    await load(page, width, height);
    const todayWidth = await titleWidth();
    await load(page, width, height, '/app/ask');
    const askWidth = await titleWidth();
    console.log(
      `widths ${width}x${height}: Today ${todayWidth}, Ask ${askWidth}`,
    );
    expect(askWidth).toBeLessThanOrEqual(896);
    expect(askWidth).toBeLessThan(todayWidth);
  });
}
// Owner (27 Nov): the hourly table shows the next 6 hours, then scrolls,
// with its column headings staying in view.
for (const [width, height] of [
  [320, 640],
  [1280, 800],
] as const) {
  test(`the hourly table shows 6 hours, then scrolls: ${width}x${height}`, async ({
    page,
  }) => {
    await load(page, width, height);
    // The real server sends 48 hours; the stub's recorded forecast has 3.
    const base = forecastAt(new Date());
    const start = Date.parse(base.hours[0]!.time);
    const hours = Array.from({ length: 48 }, (_, i) => ({
      ...base.hours[i % base.hours.length]!,
      time: new Date(start + i * 3_600_000).toISOString(),
    }));
    await page.route('**/api/v1/air-quality/forecast**', (route) =>
      route.fulfill({ json: { data: { ...base, hours } } }),
    );
    await page.reload();
    await page.locator('summary', { hasText: 'Air quality details' }).click();
    await page.locator('summary', { hasText: /^Hourly forecast/ }).click();
    const box = page.getByRole('region', { name: 'Hourly forecast table' });
    await expect(box).toBeVisible();
    const fit = await box.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const rows = [...el.querySelectorAll('tbody tr')].map((r) =>
        r.getBoundingClientRect(),
      );
      return {
        whole: rows.filter((r) => r.top >= b.top && r.bottom <= b.bottom + 0.5)
          .length,
        scrolls: el.scrollHeight > el.clientHeight,
      };
    });
    console.log(`hourly ${width}x${height}: ${fit.whole} whole rows in view`);
    expect(fit.whole).toBe(6);
    expect(fit.scrolls).toBe(true);
    // Scrolled down, the column headings stay at the box's top.
    await box.evaluate((el) => el.scrollBy(0, 200));
    const gap = await box.evaluate(
      (el) =>
        el.querySelector('thead th')!.getBoundingClientRect().top -
        el.getBoundingClientRect().top,
    );
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  });
}

// Owner (27 Nov): "Sources and limitations" folds under its own arrow.
test('Sources and limitations start folded', async ({ page }) => {
  await load(page, 1280, 800);
  await page.locator('summary', { hasText: 'Air quality details' }).click();
  const sources = page
    .locator('summary', { hasText: 'Sources and limitations' })
    .locator('xpath=..');
  await expect(sources.locator('summary')).toBeVisible();
  expect(await sources.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(
    false,
  );
  await expect(
    sources.getByRole('heading', { name: 'Limitations' }),
  ).toBeHidden();
  await sources.locator('summary').click();
  await expect(
    sources.getByRole('heading', { name: 'Limitations' }),
  ).toBeVisible();
});

// Owner (27 Nov): NASA FIRMS fire hotspots under the weather; from lg the
// columns still end level, phones do not overflow, and the page stays still.
for (const [width, height] of [
  [320, 640],
  [1280, 800],
] as const) {
  test(`fire hotspots card on Today: ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    // Registered after the stub, so it wins over its not_configured reply.
    await page.route('**/api/v1/fires/nearby**', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.fulfill({
        json: {
          data: {
            status: 'available',
            dataKind: 'satellite_detection',
            count: 3,
            nearestKm: 12.4,
            latestAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
            radiusKm: 50,
            windowHours: 24,
            retrievedAt: new Date().toISOString(),
            provider: 'NASA FIRMS',
            sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
            limitations: ['A hotspot is a satellite pixel.'],
          },
        },
      });
    });
    await page.addInitScript(() => {
      const w = window as unknown as { cls: number };
      w.cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<
          PerformanceEntry & { value: number; hadRecentInput: boolean }
        >)
          if (!e.hadRecentInput) w.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(at('/app'));
    const card = page.locator('section', {
      has: page.getByRole('heading', { name: 'Fire hotspots nearby' }),
    });
    await expect(
      card.getByText(/^NASA satellites detected 3 fire/),
    ).toBeVisible();
    await expect(
      page.locator('details[open] > summary', { hasText: 'See your full day' }),
    ).toBeVisible({ timeout: 60_000 });
    await page.waitForLoadState('networkidle');
    // Nothing wider than the screen.
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(wide).toBe(false);
    if (width >= 1024) {
      const plan = page.locator('section', {
        has: page.getByRole('heading', {
          name: 'Your recommendation for today',
        }),
      });
      const bottom = async (l: Locator) => {
        const b = (await l.boundingBox())!;
        return b.y + b.height;
      };
      expect(
        Math.abs((await bottom(card)) - (await bottom(plan))),
      ).toBeLessThanOrEqual(2);
    }
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    console.log(`fires ${width}x${height}: CLS ${cls.toFixed(3)}`);
    expect(cls).toBeLessThan(0.1);
  });
}
