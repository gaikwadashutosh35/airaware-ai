// The live journey (TESTING_QA.md §7, steps 1–12) against real Open-Meteo
// and real Supabase. Limits it stays under, per run (desktop + phone):
// - 10 plan requests (5 per project: user A builds, rebuilds after its
//   answers change, and saves; user B builds and saves), within the API's
//   10 per minute even if both projects land in one minute. Reloads happen
//   on My Profile, where the hidden Today builds nothing;
// - 4 anonymous sign-ins, under Supabase's 30 per hour.
// Every account it creates is deleted again, by the UI or, if a step
// failed first, by the cleanup below.
import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';
import { PUNE } from './routes.ts';

const SAVED = 'Saved to your anonymous account. This is the plan as saved.';
const DELETED = 'Deleted. Nothing is saved now.';
const EMPTY_TOPIC = 'No suggestions in this area for your answers today.';

// The whole suite shares the API's 60-a-minute limit per address, and the
// specs before this one spend part of the minute. The journey alone stays
// under it, so it waits out a used minute and starts on a full one. The
// header is read from the page, so it is this browser's own count.
async function startOnFreshMinute(page: Page): Promise<void> {
  const header = await page.evaluate(async () =>
    (await fetch('/api/v1/health')).headers.get('RateLimit'),
  );
  const match = /r=(\d+); t=(\d+)/.exec(header ?? '');
  if (match && Number(match[1]) < 59) {
    await page.waitForTimeout((Number(match[2]) + 1) * 1000);
  }
}

// Deletes this browser's anonymous account if one is left. The token is
// read from the page's own storage and never logged.
async function deleteLeftoverAccount(page: Page): Promise<void> {
  const token = await page
    .evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        /^sb-.*-auth-token$/.test(k),
      );
      if (!key) return null;
      try {
        const session = JSON.parse(localStorage.getItem(key) ?? '') as {
          access_token?: string;
        };
        return session.access_token ?? null;
      } catch {
        return null;
      }
    })
    .catch(() => null);
  if (token) {
    const res = await page.request.delete('/api/v1/account', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // A failed cleanup leaves an account behind: report it, never silently.
    expect
      .soft(res.ok(), `cleanup DELETE /api/v1/account: HTTP ${res.status()}`)
      .toBe(true);
  }
}

// The app's main navigation (bottom bar on phones, top bar on desktop).
async function goTo(page: Page, name: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name })
    .click();
}

// The plan builds by itself: once it is shown, open its full day.
async function buildPlan(page: Page): Promise<void> {
  await page.getByText('See your full day').click({ timeout: 60_000 });
  // The first is the line beside the card, outside the full day.
  await expect(
    page.getByText(/^Made (by our rules|with AI)/).first(),
  ).toBeVisible();
}

async function savePlan(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByText(SAVED)).toBeVisible({ timeout: 60_000 });
}

async function deleteEverything(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Delete my saved data' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText(DELETED)).toBeVisible({ timeout: 30_000 });
}

const savedRows = (page: Page): Locator =>
  page.getByRole('list', { name: 'Saved plans' }).getByRole('listitem');

// A topic shows cards or says it has none: never a blank section.
async function expectTopic(page: Page, name: string): Promise<void> {
  const topic = page.getByRole('region', { name });
  await expect(topic.getByRole('heading', { name })).toBeVisible();
  await expect(
    topic.getByRole('article').or(topic.getByText(EMPTY_TOPIC)).first(),
  ).toBeVisible();
}

test('journey: search, plan, explain, save, reload, isolation, delete', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  try {
    await test.step('1. open the app: a first visit gets Welcome', async () => {
      await page.goto('/app');
      await startOnFreshMinute(page);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Where should we check air quality?',
        }),
      ).toBeVisible();
    });

    await test.step('2. search Pune, pick it, skip to Today', async () => {
      await page
        .getByRole('combobox', { name: 'Search for a city or area in India' })
        .fill('Pune');
      await page
        .getByRole('option', { name: 'Pune, Maharashtra', exact: true })
        .click();
      await page.getByRole('button', { name: 'Skip' }).click();
      await page.getByRole('button', { name: 'Skip' }).click();
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Today in Pune, Maharashtra',
        }),
      ).toBeVisible();
    });

    await test.step('3. data kind, source and time labels, in the details', async () => {
      await page.locator('summary', { hasText: 'Air quality details' }).click();
      await expect(
        page.getByRole('heading', { name: 'Model forecast' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText('Official CPCB observations are not connected yet.'),
      ).toBeVisible();
      await expect(page.getByText(/Retrieved /).first()).toBeVisible();
      await expect(
        page.getByRole('img', { name: 'PM2.5 and PM10 forecast chart' }),
      ).toBeVisible();
      await expect(page.getByText(/^PM2\.5 ranges from/)).toBeVisible();
    });

    await test.step('4. answer two household questions in My Profile', async () => {
      await goTo(page, 'My Profile');
      await page.getByLabel('Do you exercise outdoors?').selectOption('yes');
      await page.getByLabel('Do you have an air purifier?').selectOption('yes');
      // Today rebuilds the plan once, with the new answers.
      const rebuilt = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/v1/recommendations/daily-plan') &&
          (response.request().postData() ?? '').includes('"airPurifier":true'),
        { timeout: 60_000 },
      );
      await goTo(page, 'Today');
      await rebuilt;
    });

    await test.step('5. the recommendation and its made-by line', async () => {
      await expect(
        page.getByRole('heading', { name: 'Your recommendation for today' }),
      ).toBeVisible();
      await buildPlan(page);
    });

    await test.step('6. open "Why this recommendation?"', async () => {
      const why = page.locator('details', {
        has: page.locator('summary', { hasText: 'Why this recommendation?' }),
      });
      await why.locator('summary').click();
      await expect(why.getByText('Reason', { exact: true })).toBeVisible();
    });

    await test.step('7. the indoor section', async () => {
      await expectTopic(page, 'Indoor air');
    });

    await test.step('8. the swaps section', async () => {
      await expectTopic(page, 'Sustainable swaps');
    });

    await test.step('9. save the plan', async () => {
      const notSetUp = await page
        .getByText("Saving isn't set up on this site.")
        .first()
        .isVisible();
      // Against the live site a missing Supabase build is a failure, never
      // a skip (Phase 9).
      if (process.env.E2E_BASE_URL) {
        expect(notSetUp, 'saving must be set up on the live site').toBe(false);
      }
      test.skip(
        notSetUp,
        'Supabase settings missing in client/.env: save steps 9–12 skipped.',
      );
      await savePlan(page);
    });

    await test.step('10. reload: My Profile lists it', async () => {
      await goTo(page, 'My Profile');
      await page.reload();
      await expect(savedRows(page)).toHaveCount(1, { timeout: 30_000 });
      await expect(savedRows(page).first()).toContainText('Pune, Maharashtra');
    });

    await test.step('11. a second user sees only their own plan', async () => {
      const device =
        devices[
          testInfo.project.name === 'phone' ? 'Pixel 7' : 'Desktop Chrome'
        ];
      const context = await browser.newContext({
        ...device,
        // The project's own address: localhost, or the live site.
        baseURL: testInfo.project.use.baseURL,
      });
      const other = await context.newPage();
      try {
        await other.goto(PUNE);
        await buildPlan(other);
        await savePlan(other);
        await goTo(other, 'My Profile');
        await expect(savedRows(other)).toHaveCount(1, { timeout: 30_000 });
        await deleteEverything(other);
        await expect(
          other.getByRole('heading', { name: 'Saved plans' }),
        ).toHaveCount(0);
      } finally {
        await deleteLeftoverAccount(other);
        await context.close();
      }
    });

    await test.step('12. delete saved data; gone after a reload', async () => {
      await deleteEverything(page);
      await expect(
        page.getByRole('heading', { name: 'Saved plans' }),
      ).toHaveCount(0);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('heading', { name: 'Saved plans' }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)),
        ),
      ).toBe(false);
    });

    await expectNoAxeViolations(page);
  } finally {
    await deleteLeftoverAccount(page);
  }
});
