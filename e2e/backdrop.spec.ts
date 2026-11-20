// The app backdrop in a real browser (backdrop design §5.3): only each
// page's title block may sit on the scene; every other word has a solid
// surface between it and the backdrop.
import { expect, test, type Page } from '@playwright/test';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

// Today and Ask build plans and answers by themselves: answered here, so the
// run spares the shared plan limit.
async function stubToday(page: Page): Promise<void> {
  const now = new Date();
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(rulesPlanFixture, now) },
  });
}

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
