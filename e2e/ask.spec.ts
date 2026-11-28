// Ask AirAware in a real browser: the forecast, plan and Ask replies are
// test replies; the page is the real build.
import { expect, test, type Page, type Request } from '@playwright/test';
import {
  aiAskFixture,
  rulesAskFixture,
} from '../client/src/test/askFixtures.ts';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { expectNoAxeViolations } from './axe.ts';
import { forecastAt, planAt, PUNE, routeApi, topicChip } from './routes.ts';

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
  await (await topicChip(page, 'Indoor air')).click();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'You asked: Indoor air',
      exact: true,
    }),
  ).toBeVisible();
  expect(asked).toHaveLength(2);
  expect(asked[1]!.postDataJSON()).toMatchObject({ topic: 'indoor' });
  expect(page.url()).not.toContain('purifier');
  await expectNoAxeViolations(page);
});

// Guided chat: a question back, answered or not.
async function offeringExercise(page: Page): Promise<Request[]> {
  const now = new Date();
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(rulesPlanFixture, now) },
    answer: {
      data: {
        ...planAt(aiAskFixture, now),
        topic: 'outdoors',
        followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }],
      },
    },
  });
  const asked: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/assistant/answer') {
      asked.push(request);
    }
  });
  await page.goto(PUNE.replace('/app?', '/app/ask?'));
  await (await topicChip(page, 'Outdoor activities')).click();
  await expect(
    page.getByRole('group', { name: 'Do you exercise outdoors?' }),
  ).toBeVisible();
  return asked;
}

test('a question back, answered, asks again with the answer', async ({
  page,
}) => {
  const asked = await offeringExercise(page);
  await expectNoAxeViolations(page);
  // The answer asked again carries the exercise card the first one lacked.
  await page.route('**/api/v1/assistant/answer', (route) =>
    route.fulfill({
      json: {
        data: { ...planAt(rulesAskFixture, new Date()), followUps: [] },
      },
    }),
  );

  await page
    .getByRole('group', { name: 'Do you exercise outdoors?' })
    .getByRole('button', { name: 'Yes' })
    .click();

  // Owner (27 Nov): question, response, question, response. Your answer is
  // your own message with its question, and the reply it updates folds.
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'You answered: Do you exercise outdoors? Yes',
    }),
  ).toBeVisible();
  await expect(page.locator('article.ask-answer')).toHaveCount(2);
  // The new reply repeats no card from the one above (owner, 27 Nov).
  const titles = async (i: number) =>
    page.locator('article.ask-answer').nth(i).locator('h3').allTextContents();
  const above = await titles(0);
  expect((await titles(1)).filter((t) => above.includes(t))).toEqual([]);
  await expect(
    page.getByRole('heading', {
      level: 3,
      name: 'Consider an indoor alternative for exercise',
    }),
  ).toBeVisible();
  await expect.poll(() => asked.length).toBe(2);
  expect(asked[1]!.postDataJSON()).toMatchObject({
    topic: 'outdoors',
    householdContext: { routine: { outdoorExercise: true } },
  });
  await expect(
    page.getByRole('group', { name: 'Do you exercise outdoors?' }),
  ).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('an answer that changes nothing sends no request', async ({ page }) => {
  const asked = await offeringExercise(page);

  await page
    .getByRole('group', { name: 'Do you exercise outdoors?' })
    .getByRole('button', { name: 'No' })
    .click();

  await expect(
    page
      .locator('article.ask-answer')
      .last()
      .getByText("Noted. That doesn't change this answer."),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'You answered: Do you exercise outdoors? No',
    }),
  ).toBeVisible();
  expect(asked).toHaveLength(1);
});

test('a second question carries the first as history', async ({ page }) => {
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
  await page.goto(PUNE.replace('/app?', '/app/ask?'));
  const box = page.getByRole('textbox', {
    name: 'Ask about your air, home or day',
  });

  await box.fill(QUESTION);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(answer.summary!, { exact: true })).toBeVisible();
  const SECOND = 'What about tomorrow morning?';
  await box.fill(SECOND);
  await page.getByRole('button', { name: 'Send' }).click();

  await expect.poll(() => asked.length).toBe(2);
  expect(asked[1]!.postDataJSON().history).toEqual([
    { question: QUESTION, cardIds: answer.cards.slice(0, 3).map((c) => c.id) },
  ]);
  expect(page.url()).not.toContain('purifier');
  expect(page.url()).not.toContain('tomorrow');
});
