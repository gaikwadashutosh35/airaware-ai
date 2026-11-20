// Ask AirAware in a real browser: the forecast, plan and Ask replies are
// test replies; the page is the real build.
import { expect, test, type Request } from '@playwright/test';
import { aiAskFixture } from '../client/src/test/askFixtures.ts';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { expectNoAxeViolations } from './axe.ts';
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

const QUESTION = 'Should I run the purifier tonight?';

test('an Ask answer, with the API stubbed', async ({ page }) => {
  const now = new Date();
  const answer = planAt(aiAskFixture, now);
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(rulesPlanFixture, now) },
    answer: { data: answer },
  });
  const asked: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/assistant/answer') {
      asked.push(request);
    }
  });
  await page.goto(PUNE);

  // From Today's ask box.
  await page
    .getByRole('textbox', { name: 'Ask about your air, home or day' })
    .fill(QUESTION);
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: QUESTION }),
  ).toBeVisible();
  await expect(page.getByText(answer.summary!, { exact: true })).toBeVisible();
  expect(asked).toHaveLength(1);
  expect(asked[0]!.method()).toBe('POST');
  expect(asked[0]!.postDataJSON()).toMatchObject({ question: QUESTION });
  expect(page.url()).not.toContain('purifier');
  await expectNoAxeViolations(page);

  // A topic chip answers at once.
  await page.getByRole('button', { name: 'Indoor air', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Indoor air', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Indoor air', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(asked).toHaveLength(2);
  expect(asked[1]!.postDataJSON()).toMatchObject({ topic: 'indoor' });
  expect(page.url()).not.toContain('purifier');
  await expectNoAxeViolations(page);
});
