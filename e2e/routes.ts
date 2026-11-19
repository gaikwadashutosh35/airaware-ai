import type { Page, Route } from '@playwright/test';
import type { DailyPlan, ForecastSeries } from '../shared/contracts.ts';
import { forecastFixture } from '../client/src/test/fixtures.ts';

const HOUR = 60 * 60 * 1000;

// Pune from the address, so a test needs no search.
export const PUNE = '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86';

const hourOf = (date: Date) => Math.floor(date.getTime() / HOUR) * HOUR;

// The recorded test forecast, moved so its hours start at `retrievedAt`.
export function forecastAt(retrievedAt: Date): ForecastSeries {
  const start = hourOf(retrievedAt);
  return {
    ...forecastFixture,
    retrievedAt: retrievedAt.toISOString(),
    hours: forecastFixture.hours.map((hour, i) => ({
      ...hour,
      time: new Date(start + i * HOUR).toISOString(),
    })),
  };
}

// A test plan whose forecast was retrieved at `retrievedAt`.
export function planAt(plan: DailyPlan, retrievedAt: Date): DailyPlan {
  return {
    ...plan,
    air: {
      ...plan.air,
      windowStart:
        plan.air.windowStart && new Date(hourOf(retrievedAt)).toISOString(),
    },
    forecast: plan.forecast && {
      ...plan.forecast,
      retrievedAt: retrievedAt.toISOString(),
    },
  };
}

export type Reply = { data: unknown } | { status: number; code: string };

function fulfil(route: Route, reply: Reply) {
  return 'data' in reply
    ? route.fulfill({ json: { data: reply.data } })
    : route.fulfill({
        status: reply.status,
        json: { error: { code: reply.code, message: 'Test reply.' } },
      });
}

// Answers the browser's forecast and plan requests; everything else reaches
// the real server.
export async function routeApi(
  page: Page,
  replies: { forecast: Reply; plan?: Reply },
): Promise<void> {
  await page.route('**/api/v1/air-quality/forecast**', (route) =>
    fulfil(route, replies.forecast),
  );
  const { plan } = replies;
  if (plan) {
    await page.route('**/api/v1/recommendations/daily-plan', (route) =>
      fulfil(route, plan),
    );
  }
}
