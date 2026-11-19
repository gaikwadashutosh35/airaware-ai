// Deterministic failure states (TESTING_QA.md §7, last line): the browser's
// forecast and plan requests get test replies; the page is the real build.
import { expect, test, type Page } from '@playwright/test';
import {
  aiPlanFixture,
  rulesPlanFixture,
  unavailablePlanFixture,
} from '../client/src/test/planFixtures.ts';
import { expectNoAxeViolations } from './axe.ts';
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

const HOUR = 60 * 60 * 1000;

async function buildPlan(page: Page) {
  await page.getByRole('button', { name: 'Build my daily plan' }).click();
}

test('provider down: the forecast error, the unavailable notice and air check', async ({
  page,
}) => {
  await routeApi(page, {
    forecast: { status: 502, code: 'PROVIDER_ERROR' },
    plan: { data: unavailablePlanFixture },
  });
  await page.goto(PUNE);

  await expect(page.getByText('Forecast provider unavailable.')).toBeVisible();
  await buildPlan(page);
  await expect(
    page.getByRole('heading', {
      name: unavailablePlanFixture.notices[0].title,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Air information is unavailable for this plan.'),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test('stale data: both stale messages', async ({ page }) => {
  const old = new Date(Date.now() - 3 * HOUR);
  await routeApi(page, {
    forecast: { data: forecastAt(old) },
    plan: { data: planAt(rulesPlanFixture, old) },
  });
  await page.goto(PUNE);

  await expect(
    page.getByText(
      'Not current: retrieved more than an hour ago. Reload for the latest forecast.',
    ),
  ).toBeVisible();
  await buildPlan(page);
  await expect(
    page.getByText(
      'This plan was built more than an hour ago. Build it again for the latest forecast.',
    ),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test('AI down: a complete rules-only plan', async ({ page }) => {
  const now = new Date();
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(rulesPlanFixture, now) },
  });
  await page.goto(PUNE);
  await buildPlan(page);

  await expect(
    page.getByText(
      'Made by our rules. AI personalisation is unavailable right now.',
    ),
  ).toBeVisible();
  for (const heading of [
    'Outdoors and travel',
    'Indoor air',
    'Sustainable swaps',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Your day' })).toHaveCount(0);
  await expect(
    page.getByText('This plan was built more than an hour ago', {
      exact: false,
    }),
  ).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('AI up: summary, "Your day" in order, "For you" lines', async ({
  page,
}) => {
  const now = new Date();
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(aiPlanFixture, now) },
  });
  await page.goto(PUNE);
  await buildPlan(page);

  await expect(page.getByText(aiPlanFixture.summary ?? '')).toBeVisible();
  const day = page.getByRole('region', { name: 'Your day' });
  await expect(day.getByRole('heading', { level: 4 })).toHaveText([
    'Morning',
    'At home',
  ]);
  await expect(
    day.getByText(aiPlanFixture.featured[0].forYou ?? ''),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test('plan error: the rate-limit message', async ({ page }) => {
  await routeApi(page, {
    forecast: { data: forecastAt(new Date()) },
    plan: { status: 429, code: 'RATE_LIMITED' },
  });
  await page.goto(PUNE);
  await buildPlan(page);

  await expect(
    page.getByText('Too many requests. Try again in a minute.'),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});
