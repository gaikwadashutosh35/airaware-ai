// The app backdrop in a real browser (backdrop design §5): only each page's
// title block may sit on the scene, and it reads against every sky; every
// other word has a solid surface between it and the backdrop; the backdrop
// stays put between pages.
import { expect, test, type Page } from '@playwright/test';
import type {
  AirAssessment,
  ForecastData,
  WeatherNow,
} from '../shared/contracts.ts';
import { sourcesFixture } from '../client/src/test/fixtures.ts';
import {
  habitsGuidesFixture,
  homeGuidesFixture,
} from '../client/src/test/guideFixtures.ts';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { expectNoAxeViolations } from './axe.ts';
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

type Level = AirAssessment['level'];
const CHECKS: Record<Exclude<Level, 'unknown'>, AirAssessment['checks']> = {
  not_elevated: [
    { pollutant: 'PM2_5', status: 'within_limit', average24h: 41.2, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 63.5, limit: 100 },
  ],
  elevated: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 78.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 91, limit: 100 },
  ],
};

// Every request the app pages make, answered here, so the run spends none
// of the shared limits: the forecast in the given look and weather, the
// plan, the guides and the sources.
async function stub(
  page: Page,
  level: Level = 'unknown',
  weather: Partial<WeatherNow> = {},
): Promise<void> {
  const now = new Date();
  // The recorded fixture is a full forecast, with its check and weather.
  const base = forecastAt(now) as ForecastData;
  await routeApi(page, {
    forecast: {
      data: {
        ...base,
        airCheck:
          level === 'unknown'
            ? base.airCheck
            : {
                level,
                windowStart: base.hours[0]!.time,
                checks: CHECKS[level],
              },
        weather: { ...base.weather!, time: base.hours[0]!.time, ...weather },
      },
    },
    plan: { data: planAt(rulesPlanFixture, now) },
  });
  await page.route('**/api/v1/recommendations/guides**', (route) =>
    route.fulfill({
      json: {
        data: route.request().url().includes('topic=habits')
          ? habitsGuidesFixture
          : homeGuidesFixture,
      },
    }),
  );
  await page.route('**/api/v1/air-quality/sources', (route) =>
    route.fulfill({ json: { data: sourcesFixture } }),
  );
}
const stubToday = (page: Page) => stub(page);

const at = (path: string) => PUNE.replace('/app?', `${path}?`);

// Visible text in `main` outside the title block with no opaque background
// between it and `main`; its first 40 characters.
function textOnScene(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector('main')!;
    const opaque = (el: Element) => {
      const bg = getComputedStyle(el).backgroundColor;
      if (/^rgb\(/.test(bg)) return true;
      const alpha = /^rgba\(.*,\s*([\d.]+)\)$/.exec(bg)?.[1];
      return alpha !== undefined && Number(alpha) === 1;
    };
    const offenders: string[] = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el) continue;
      if (el.closest('[data-part="title-block"], .sr-only')) continue;
      if (!el.checkVisibility({ opacityProperty: true })) continue;
      let solid = false;
      for (let a: Element | null = el; a && a !== main; a = a.parentElement) {
        if (opaque(a)) {
          solid = true;
          break;
        }
      }
      if (!solid) offenders.push(text.slice(0, 40));
    }
    return offenders;
  });
}

for (const path of [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
]) {
  test(`no text outside the title block rests on the scene: ${path}`, async ({
    page,
  }) => {
    await stubToday(page);
    await page.goto(at(path));
    // Today and My Profile stay mounted while hidden: the shown page's h1.
    await expect(page.locator('main h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const details of await page.locator('main details').all()) {
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }
    expect(await textOnScene(page)).toEqual([]);
  });
}

test('no text outside the title block rests on the scene: Welcome', async ({
  page,
}) => {
  await page.goto('/app/welcome');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where should we check air quality?',
    }),
  ).toBeVisible();
  expect(await textOnScene(page)).toEqual([]);
});

const visibleH1 = (page: Page) => page.locator('main h1:visible').first();

test('the backdrop stays put between pages', async ({ page }) => {
  await stub(page, 'not_elevated', { cloudCoverPercent: 30 });
  await page.goto(PUNE);
  await expect(page.locator('[data-air]')).toHaveAttribute(
    'data-air',
    'within',
  );
  // Past the clouds' one drift, then mark the backdrop element.
  await page.waitForTimeout(5_500);
  await page.evaluate(() => {
    Object.assign(window, { backdrop: document.querySelector('[data-air]') });
  });
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of [/Ask/, /Habits/]) {
    await nav.getByRole('link', { name }).click();
    await expect(visibleH1(page)).toBeVisible();
    // A remount would restart the drift: 200 ms in, the clouds would be
    // well off their resting place.
    await page.waitForTimeout(200);
    const seen = await page.evaluate(() => {
      const el = document.querySelector('[data-air]');
      const clouds = el?.querySelector('[data-part="clouds"]');
      return {
        same: el === (window as unknown as { backdrop: Element }).backdrop,
        air: el?.getAttribute('data-air'),
        transform: clouds ? getComputedStyle(clouds).transform : null,
      };
    });
    expect(seen.same).toBe(true);
    expect(seen.air).toBe('within');
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(seen.transform);
  }
});

// The lowest contrast between the title block's text colours and every
// colour that can pass behind it: each sky stop alone, each cloud, deck and
// glow centre over each sky stop, and a rain streak over all of those.
function titleContrast(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgb = (css: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const over = (top: number[], alpha: number, base: number[]) =>
      top.map((c, i) => c * alpha + base[i]! * (1 - alpha));
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contrast = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const root = document.querySelector('[data-air]')!;
    const gradientStops = (holder: Element) => {
      const ref = /url\(#([^)]+)\)/.exec(
        holder.getAttribute('fill') ?? '',
      )![1]!;
      return [...document.getElementById(ref)!.querySelectorAll('stop')];
    };
    const skies = gradientStops(root.querySelector('[data-part="sky"]')!).map(
      (stop) => rgb(getComputedStyle(stop).stopColor),
    );
    const layers: Array<{ name: string; color: number[]; alpha: number }> = [];
    for (const el of root.querySelectorAll(
      '[data-part="cloud"] ellipse, [data-part="cloud-deck"]',
    )) {
      const style = getComputedStyle(el);
      layers.push({
        name: el.matches('[data-part="cloud-deck"]') ? 'deck' : 'cloud',
        color: rgb(style.fill),
        alpha: Number(style.opacity),
      });
    }
    const glow = root.querySelector('[data-part="glow"]');
    if (glow) {
      layers.push({
        name: 'glow',
        color: rgb(getComputedStyle(gradientStops(glow)[0]!).stopColor),
        alpha: Number(getComputedStyle(glow).opacity),
      });
    }
    const streak = root.querySelector('pattern line');
    if (streak) {
      layers.push({
        name: 'rain',
        color: rgb(getComputedStyle(streak).stroke),
        alpha: Number(getComputedStyle(streak.parentElement!).opacity),
      });
    }
    // Clouds, the deck and the glow over each sky stop; then rain over each
    // of those and over the bare sky, since a streak can cross any of them.
    const rain = layers.filter((l) => l.name === 'rain');
    const bases = [
      ...skies.map((color) => ({ name: 'sky', color })),
      ...skies.flatMap((sky) =>
        layers
          .filter((l) => l.name !== 'rain')
          .map((l) => ({ name: l.name, color: over(l.color, l.alpha, sky) })),
      ),
    ];
    const behind = [
      ...bases,
      ...bases.flatMap((base) =>
        rain.map((r) => ({
          name: `rain over ${base.name}`,
          color: over(r.color, r.alpha, base.color),
        })),
      ),
    ];
    const texts = new Set<string>();
    // The shown page's block: My Profile stays mounted, hidden, before it.
    const block = [
      ...document.querySelectorAll('[data-part="title-block"]'),
    ].find((el) => el.checkVisibility())!;
    for (const el of [block, ...block.querySelectorAll('*')]) {
      if (el.checkVisibility() && el.textContent?.trim()) {
        texts.add(getComputedStyle(el).color);
      }
    }
    let worst = { ratio: Infinity, text: '', behind: '' };
    for (const text of texts) {
      for (const b of behind) {
        const ratio = contrast(rgb(text), b.color);
        if (ratio < worst.ratio) worst = { ratio, text, behind: b.name };
      }
    }
    return { ...worst, layers: layers.map((l) => l.name) };
  });
}

const SKIES: Array<Partial<WeatherNow>> = [
  { precipitationMm: 1, cloudCoverPercent: 30, isDay: true }, // rain
  { precipitationMm: 0, cloudCoverPercent: 90, isDay: true }, // deck
  { precipitationMm: 0, cloudCoverPercent: 30, isDay: true }, // glow
  { precipitationMm: 1, cloudCoverPercent: 90, isDay: true }, // rain, deck
];

const LOOK: Record<Level, string> = {
  not_elevated: 'within',
  elevated: 'above',
  unknown: 'unknown',
};

for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
  test(`the title block reads against every sky: ${level}`, async ({
    page,
  }) => {
    for (const weather of SKIES) {
      await stub(page, level, weather);
      await page.goto(PUNE);
      await expect(visibleH1(page)).toBeVisible();
      // The look this run asked for, not just any drawn look.
      await expect(page.locator('[data-air]')).toHaveAttribute(
        'data-air',
        LOOK[level],
      );
      const worst = await titleContrast(page);
      expect(
        worst.ratio,
        JSON.stringify({ weather, worst }),
      ).toBeGreaterThanOrEqual(4.5);
      await page.unrouteAll();
    }
  });
}

// Final review: a long place wraps the title, which a short landscape
// screen can push into the city band. Whenever the city shows, the title
// must end above it.
const LONG_PLACE =
  'Pune Municipal Corporation Ward Office Twenty Three, Pune, Maharashtra';
for (const [width, height] of [
  [640, 320],
  [667, 400],
] as const) {
  for (const label of ['Pune, Maharashtra', LONG_PLACE]) {
    test(`a short landscape phone keeps the title off the city: ${width}x${height}, ${label.length} chars`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await stub(page, 'not_elevated');
      await page.goto(
        PUNE.replace('Pune%2C%20Maharashtra', encodeURIComponent(label)),
      );
      await expect(visibleH1(page)).toBeVisible();
      const title = (await visibleH1(page).boundingBox())!;
      const city = page.locator('[data-layer="city"]');
      if (await city.isVisible()) {
        const top = (await city.boundingBox())!.y;
        expect(title.y + title.height).toBeLessThan(top);
      }
    });
  }
}

for (const level of ['not_elevated', 'elevated', 'unknown'] as const) {
  test(`axe passes over the ${level} look`, async ({ page }) => {
    await stub(page, level, {
      precipitationMm: 1,
      cloudCoverPercent: 30,
      isDay: true,
    });
    for (const path of ['/app', '/app/ask', '/app/habits']) {
      await page.goto(at(path));
      await expect(visibleH1(page)).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page);
    }
  });
}

// Final review: the rain moves its whole layer, as one box, and stays still
// under reduced motion.
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`the rain layer moves as one box: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await stub(page, 'not_elevated', { precipitationMm: 1 });
    await page.goto(PUNE);
    const layer = page.locator('[data-layer="rain"]');
    await expect(layer).toBeAttached();
    const name = await layer.evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(name).toBe(reducedMotion === 'reduce' ? 'none' : 'rain-fall');
  });
}

// Final review: the page clips sideways overflow (html, body
// overflow-x: clip), so scrollWidth always fits. Measure each element's
// edges instead: nothing shown may reach past the screen unless an
// ancestor that fits clips it. The backdrop overhangs by design.
function pastTheEdge(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const fits = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.left >= -0.5 && r.right <= width + 0.5;
    };
    const offenders: string[] = [];
    for (const el of document.body.querySelectorAll('*')) {
      // The backdrop overhangs by design; screen-reader-only text is
      // clipped to nothing.
      if (el.closest('[data-air], .sr-only') || !el.checkVisibility()) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || fits(el)) continue;
      let clipped = false;
      for (
        let a = el.parentElement;
        a && a !== document.body;
        a = a.parentElement
      ) {
        if (
          /hidden|clip|auto|scroll/.test(getComputedStyle(a).overflowX) &&
          fits(a)
        ) {
          clipped = true;
          break;
        }
      }
      if (!clipped) {
        offenders.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)}`,
        );
      }
    }
    return offenders;
  });
}

for (const path of [
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
]) {
  test(`nothing reaches past a 320 px screen: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await stub(page, 'not_elevated', { precipitationMm: 1 });
    await page.goto(at(path));
    await expect(visibleH1(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const details of await page.locator('main details').all()) {
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }
    expect(await pastTheEdge(page)).toEqual([]);
  });
}

test('nothing reaches past a 320 px screen: Welcome', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/app/welcome');
  await expect(visibleH1(page)).toBeVisible();
  expect(await pastTheEdge(page)).toEqual([]);
});
