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
  // Fully shown 120 px in on every screen, phones' bottom scroll padding
  // included.
  await placeTop(page, 130);
  expect((await styleOf(page)).opacity).toBe('1');
});

// The arrows the forecast steps show at a screen width, in order.
async function arrowsAt(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  return page
    .getByRole('list', { name: 'How a forecast reaches you' })
    .locator('svg')
    .evaluateAll((arrows) =>
      arrows
        .filter((arrow) => getComputedStyle(arrow).display !== 'none')
        .map((arrow) =>
          arrow.classList.contains('lucide-arrow-down') ? 'down' : 'right',
        ),
    );
}

test('step arrows point the way the steps run', async ({ page }) => {
  await page.goto('/');

  expect(await arrowsAt(page, 390)).toEqual(['down', 'down', 'down']);
  // A 2×2 grid has no one direction, so the numbers carry the order.
  expect(await arrowsAt(page, 900)).toEqual([]);
  expect(await arrowsAt(page, 1280)).toEqual(['right', 'right', 'right']);
});

test('the details shot reads on a 320 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const shot = page.getByRole('img', {
    name: /^Screenshot of the open Air quality details/,
  });
  await shot.scrollIntoViewIfNeeded();
  const size = await shot.evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return {
      shown: img.getBoundingClientRect().width,
      // A 2× capture: its own CSS size is half its pixels.
      own: img.naturalWidth / 2,
      file: [img.naturalWidth, img.naturalHeight],
      set: [
        2 * Number(img.getAttribute('width')),
        2 * Number(img.getAttribute('height')),
      ],
    };
  });

  expect(size.shown / size.own).toBeGreaterThan(0.75);
  // Its width and height are exactly the file's at 2×, so nothing shifts
  // or stretches as it loads (a ratio check let a 2 px drift through).
  expect(size.set).toEqual(size.file);
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
