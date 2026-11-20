// Today's skyline in a real browser: the clouds settle once and rest, and
// nothing moves under reduced motion (jsdom can't run CSS animations).
import { expect, test, type Page } from '@playwright/test';
import { forecastAt, PUNE, routeApi } from './routes.ts';

async function cloudsStyle(page: Page) {
  const clouds = page.locator('[data-part="clouds"]');
  await expect(clouds).toBeAttached();
  return clouds.evaluate((el) => {
    const style = getComputedStyle(el);
    return { name: style.animationName, transform: style.transform };
  });
}

test('clouds drift then rest', async ({ page }) => {
  await routeApi(page, { forecast: { data: forecastAt(new Date()) } });
  await page.goto(PUNE);

  expect((await cloudsStyle(page)).name).toBe('cloud-drift');
  await page.waitForTimeout(5_500);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(
    (await cloudsStyle(page)).transform,
  );
});

test('no drift under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await routeApi(page, { forecast: { data: forecastAt(new Date()) } });
  await page.goto(PUNE);

  expect((await cloudsStyle(page)).name).toBe('none');
});
