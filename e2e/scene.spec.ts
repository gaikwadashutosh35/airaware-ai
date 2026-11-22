// Today's skyline in a real browser: the clouds settle once and rest, and
// nothing moves under reduced motion (jsdom can't run CSS animations).
import { expect, test, type Page } from '@playwright/test';
import { rulesPlanFixture } from '../client/src/test/planFixtures.ts';
import { forecastAt, planAt, PUNE, routeApi } from './routes.ts';

// Today builds a plan by itself, so the plan is answered here too: real
// builds would spend the shared 10-a-minute plan limit the journey needs.
async function stubToday(page: Page): Promise<void> {
  const now = new Date();
  await routeApi(page, {
    forecast: { data: forecastAt(now) },
    plan: { data: planAt(rulesPlanFixture, now) },
  });
}

async function cloudsStyle(page: Page) {
  const clouds = page.locator('[data-part="clouds"]');
  await expect(clouds).toBeAttached();
  return clouds.evaluate((el) => {
    const style = getComputedStyle(el);
    return { name: style.animationName, transform: style.transform };
  });
}

test('clouds drift then rest', async ({ page }) => {
  await stubToday(page);
  await page.goto(PUNE);

  expect((await cloudsStyle(page)).name).toBe('cloud-drift');
  await page.waitForTimeout(5_500);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(
    (await cloudsStyle(page)).transform,
  );
});

// The air look fades over 700 ms in a real browser (jsdom can't show that
// Chromium transitions a class-set stop-color), and at once under reduced
// motion (cityscape brief-finish design §5.2).
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`the air look fades in 0.7 s: ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await stubToday(page);
    await page.goto(PUNE);
    const sky = page.locator('[data-part="sky"]');
    await expect(sky).toBeAttached();
    const durations = await sky.evaluate((holder) => {
      const ref = /url\(#([^)]+)\)/.exec(
        holder.getAttribute('fill') ?? '',
      )![1]!;
      return [...document.getElementById(ref)!.querySelectorAll('stop')].map(
        (stop) => getComputedStyle(stop).transitionDuration,
      );
    });
    expect(durations).toHaveLength(2);
    for (const duration of durations) {
      if (reducedMotion === 'reduce') {
        expect(Number.parseFloat(duration)).toBeLessThan(0.001);
      } else {
        expect(duration).toBe('0.7s');
      }
    }
  });
}

test('no drift under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubToday(page);
  await page.goto(PUNE);

  expect((await cloudsStyle(page)).name).toBe('none');
});
