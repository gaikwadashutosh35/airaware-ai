// The landing page in a real browser: the scroll reveal (CSS that jsdom
// can't run) and where the hero's two buttons lead on a first visit.
import { expect, test, type Page } from '@playwright/test';

const SECTION = 'Understand your air';

async function styleOf(page: Page) {
  return page.getByRole('region', { name: SECTION }).evaluate((el) => {
    const style = getComputedStyle(el);
    return { name: style.animationName, opacity: style.opacity };
  });
}

// Scrolls so the section's top sits `offset` px above the screen's bottom
// (a negative offset: below it), then waits two frames.
async function placeTop(page: Page, offset: number): Promise<void> {
  await page.getByRole('region', { name: SECTION }).evaluate(async (el, by) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top - window.innerHeight + by,
      behavior: 'instant',
    });
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    );
  }, offset);
}

test('sections rise in as they scroll into view', async ({ page }) => {
  await page.goto('/');

  expect((await styleOf(page)).name).toBe('reveal');
  await placeTop(page, -10);
  expect((await styleOf(page)).opacity).toBe('0');
  await placeTop(page, 200);
  expect((await styleOf(page)).opacity).toBe('1');
});

test('no movement under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await placeTop(page, -10);
  expect(await styleOf(page)).toEqual({ name: 'none', opacity: '1' });
});

test('the hero buttons on a first visit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Meet Your Assistant' }).click();
  await expect(page).toHaveURL(/\/app\/ask$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Search for a city or area in India' }),
  ).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Check My Air' }).first().click();
  await expect(page).toHaveURL(/\/app\/welcome$/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where should we check air quality?',
    }),
  ).toBeVisible();
});
