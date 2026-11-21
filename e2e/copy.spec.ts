// Phase 10: the copy rules (spec §8) on every page and state a person can
// reach. Never "safe", "healthy", "clean air", "good air" or "bad air", and
// no AQI except in "We don't calculate an AQI". Every request is answered
// here; every details element is opened, so hidden text is read too.
import { expect, test, type Page } from '@playwright/test';
import {
  aiAskFixture,
  medicalAskFixture,
  outOfScopeAskFixture,
  rulesAskFixture,
  unknownAirAskFixture,
} from '../client/src/test/askFixtures.ts';
import { open, stub } from './layout.ts';
import { PUNE } from './routes.ts';

const BANNED = /\b(safe|healthy|clean air|good air|bad air)\b/i;
// The one allowed sentence, and the official index's proper name: it is a
// source's title, and every use says AirAware doesn't calculate it ("Not the
// CPCB National AQI.", "We do not calculate the CPCB National AQI.").
const ALLOWED_AQI = ["We don't calculate an AQI", 'CPCB National AQI'];

// The page's text with every details element open.
async function pageText(page: Page): Promise<string> {
  for (const details of await page.locator('details').all()) {
    await details.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  }
  return page.evaluate(() => document.body.innerText);
}

function expectCopyRules(text: string): void {
  expect(text.match(BANNED)?.[0] ?? null).toBeNull();
  let rest = text;
  for (const phrase of ALLOWED_AQI) rest = rest.split(phrase).join('');
  const aqi = [...rest.matchAll(/.{0,40}\bAQI\b.{0,20}/g)].map((m) => m[0]);
  expect(aqi).toEqual([]);
}

for (const path of [
  '/',
  '/privacy',
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
  '/app/welcome',
]) {
  test(`no banned words: ${path}`, async ({ page }) => {
    await open(page, path);
    expectCopyRules(await pageText(page));
  });
}

test('no banned words: a stale, above-limit Today', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'elevated', {}, new Date(Date.now() - 2 * 3600_000));
  await page.goto(PUNE);
  await expect(page.getByText(/^Not current:/)).toBeVisible();
  expectCopyRules(await pageText(page));
});

test('no banned words: the forecast error card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.route('**/api/v1/air-quality/forecast**', (route) =>
    route.fulfill({
      status: 502,
      json: { error: { code: 'PROVIDER_ERROR', message: 'Test reply.' } },
    }),
  );
  await page.goto(PUNE);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expectCopyRules(await pageText(page));
});

for (const [name, answer] of Object.entries({
  ai: aiAskFixture,
  rules: rulesAskFixture,
  medical: medicalAskFixture,
  'out of scope': outOfScopeAskFixture,
  'unknown air': unknownAirAskFixture,
})) {
  test(`no banned words: an Ask answer (${name})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, 'not_elevated');
    await page.route('**/api/v1/assistant/answer', (route) =>
      route.fulfill({ json: { data: answer } }),
    );
    await page.goto(PUNE.replace('/app?', '/app/ask?'));
    await page
      .getByRole('button', { name: 'Outdoor activities', exact: true })
      .click();
    await expect(page.locator('article.ask-answer')).toBeVisible();
    expectCopyRules(await pageText(page));
  });
}
