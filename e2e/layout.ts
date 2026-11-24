// Shared Playwright helpers for the layout specs: one stub that answers every
// request the app pages make, and in-page checks for edges and tap targets.
import { expect, type Page } from '@playwright/test';
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
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

export type Level = AirAssessment['level'];
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
export async function stub(
  page: Page,
  level: Level = 'unknown',
  weather: Partial<WeatherNow> = {},
  // When the forecast was retrieved: two hours ago makes it stale.
  now: Date = new Date(),
): Promise<void> {
  // The recorded fixture is a full forecast, with its check and weather.
  const base = forecastAt(now) as ForecastData;
  const airCheck: AirAssessment =
    level === 'unknown'
      ? base.airCheck
      : { level, windowStart: base.hours[0]!.time, checks: CHECKS[level] };
  await routeApi(page, {
    forecast: {
      data: {
        ...base,
        airCheck,
        weather: { ...base.weather!, time: base.hours[0]!.time, ...weather },
      },
    },
    // The real server builds the plan from the same forecast, so the plan's
    // air is the forecast's, never a second level on the page.
    plan: { data: planAt({ ...rulesPlanFixture, air: airCheck }, now) },
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

// An app path for Pune, from the address, so a test needs no search.
export const at = (path: string) => PUNE.replace('/app?', `${path}?`);

// Today and My Profile stay mounted while hidden: the shown page's h1.
export const visibleH1 = (page: Page) =>
  page.locator('main h1:visible').first();

// The page clips sideways overflow (html, body overflow-x: clip), so
// scrollWidth always fits. Measure each element's edges instead: nothing
// shown may reach past the screen unless an ancestor that fits clips it.
export function pastTheEdge(page: Page): Promise<string[]> {
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
    // Bare text can spill out of a box that fits (an unbreakable word), so
    // each run of text is measured too.
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const host = node.parentElement;
      if (!host || !(node.textContent ?? '').trim()) continue;
      if (host.closest('[data-air], .sr-only') || !host.checkVisibility()) {
        continue;
      }
      range.selectNodeContents(node);
      const out = [...range.getClientRects()].find(
        (r) => r.width > 0 && (r.left < -0.5 || r.right > width + 0.5),
      );
      if (!out) continue;
      let clipped = false;
      for (
        let a: Element | null = host;
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
          `text "${(node.textContent ?? '').trim().slice(0, 30)}" ${Math.round(out.left)}..${Math.round(out.right)}`,
        );
      }
    }
    return offenders;
  });
}

// Controls under 44 px (DESIGN.md: min-h-11): too short, or too narrow
// unless they take typing. A link shown inline inside a sentence is exempt
// (WCAG 2.5.8's inline exception); a link styled as a block or control is
// always measured. An input inside its label is measured as the label.
export function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44 - 0.5;
    const offenders: string[] = [];
    const controls = document.querySelectorAll(
      'a, button, input:not([type="hidden"]), select, textarea, summary, label:has(input), [role="button"], [role="link"], [role="option"], [role="tab"], [role="checkbox"], [role="radio"], [tabindex="0"]',
    );
    for (const el of controls) {
      if (el.closest('[data-air], .sr-only') || !el.checkVisibility()) {
        continue;
      }
      if (el.matches('input') && el.closest('label')) continue;
      if (el.matches('a') && getComputedStyle(el).display === 'inline') {
        const block = el.parentElement?.closest('p, li');
        const own = (el.textContent ?? '').trim();
        if (block && (block.textContent ?? '').trim() !== own) continue;
      }
      const typed = el.matches(
        'textarea, select, input:not([type]), input[type="text"], input[type="search"]',
      );
      const r = el.getBoundingClientRect();
      if (r.height < MIN || (!typed && r.width < MIN)) {
        const name =
          (el.textContent ?? '').trim() || el.getAttribute('aria-label') || '';
        offenders.push(
          `${el.tagName.toLowerCase()} "${name.slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
      }
    }
    return offenders;
  });
}

// Text cut off by its own box (an element that hides overflow and holds
// more than it shows), or spilling out of it (an element with its own text
// whose content is wider than its box, overflow visible). A deliberate
// ellipsis (`truncate`, whose full text is the control's accessible name)
// is not a cut.
export function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const clips = (value: string) => value === 'hidden' || value === 'clip';
    const offenders: string[] = [];
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      if (el.closest('[data-air], .sr-only, .truncate')) continue;
      if (!el.checkVisibility() || !(el.textContent ?? '').trim()) continue;
      const style = getComputedStyle(el);
      const wide =
        clips(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const tall =
        clips(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
      const ownText = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim(),
      );
      const spills =
        ownText &&
        style.overflowX === 'visible' &&
        el.clientWidth > 0 &&
        el.scrollWidth > el.clientWidth + 1;
      if (wide || tall || spills) {
        offenders.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${el.scrollWidth}/${el.clientWidth}x${el.scrollHeight}/${el.clientHeight}`,
        );
      }
    }
    return offenders;
  });
}

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
