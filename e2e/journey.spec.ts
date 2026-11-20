// The live journey (TESTING_QA.md §7, steps 1–12) against real Open-Meteo
// and real Supabase. Limits it stays under, per run (desktop + phone):
// - 8 plan requests (users A and B each build and save, per project), under
//   the API's 10 per minute;
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

const SAVED = 'Saved on this browser. This is the plan as saved.';
const DELETED = 'Deleted. Nothing is saved now.';
const MODEL_LINE =
  'Model forecast for an area about 45 km wide. Not a station measurement and not the CPCB AQI.';
const EMPTY_TOPIC = 'No suggestions in this area for your answers today.';

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

async function buildPlan(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Build my daily plan' }).click();
  await expect(page.getByText(/^Made (by our rules|with AI)/)).toBeVisible({
    timeout: 60_000,
  });
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
    await test.step('1. open the app', async () => {
      await page.goto('/app');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Air quality near you' }),
      ).toBeVisible();
    });

    await test.step('2. search Pune and pick it', async () => {
      await page
        .getByRole('combobox', { name: 'Search for a city or area in India' })
        .fill('Pune');
      await page
        .getByRole('option', { name: 'Pune, Maharashtra', exact: true })
        .click();
      await expect(
        page.getByRole('heading', {
          level: 2,
          name: 'Air quality: Pune, Maharashtra',
        }),
      ).toBeVisible();
    });

    await test.step('3. data kind, source and time labels', async () => {
      await expect(
        page.getByRole('heading', { name: 'Model forecast' }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText('Official CPCB observation unavailable'),
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
      await goTo(page, 'Today');
    });

    await test.step('5. build the plan: made-by line and notice', async () => {
      await buildPlan(page);
      await expect(
        page
          .getByRole('region', { name: 'Air notice' })
          .getByRole('article')
          .first(),
      ).toBeVisible();
      await expect(page.getByText(MODEL_LINE)).toBeVisible();
    });

    await test.step('6. open a "Why?" panel', async () => {
      const notice = page.getByRole('region', { name: 'Air notice' });
      await notice.locator('summary').first().click();
      await expect(
        notice.locator('details[open]').getByText('Reason', { exact: true }),
      ).toBeVisible();
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
      await page.reload();
      await goTo(page, 'My Profile');
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
