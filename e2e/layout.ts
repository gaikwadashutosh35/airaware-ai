// Shared Playwright helpers for the layout specs: one stub that answers every
// request the app pages make, and in-page checks for edges and tap targets.
import type { Page } from '@playwright/test';
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
    return offenders;
  });
}

// Controls under 44 px (DESIGN.md: min-h-11): too short, or too narrow
// unless they take typing. A link inside a sentence is exempt (WCAG 2.5.8's
// inline exception); an input inside its label is measured as the label.
export function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44 - 0.5;
    const offenders: string[] = [];
    const controls = document.querySelectorAll(
      'a, button, input:not([type="hidden"]), select, textarea, summary, [role="button"], label:has(input)',
    );
    for (const el of controls) {
      if (el.closest('[data-air], .sr-only') || !el.checkVisibility()) {
        continue;
      }
      if (el.matches('input') && el.closest('label')) continue;
      if (el.matches('a')) {
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
