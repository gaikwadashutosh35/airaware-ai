// Phase 9: the keyboard walk, kept so it can be re-run. Tab and Shift+Tab
// only: no traps, a visible focus indicator on every stop, nothing focused
// off screen, Shift+Tab steps back; the place dialog and Welcome by
// keyboard. It measures that a ring is drawn, not how clear it looks:
// that is still a person's call (ACCESSIBILITY.md).
import { expect, test, type Page } from '@playwright/test';
import { rulesAskFixture } from '../client/src/test/askFixtures.ts';
import { searchFixture } from '../client/src/test/fixtures.ts';
import { at, stub } from './layout.ts';

const PATHS = [
  '/',
  '/privacy',
  '/app',
  '/app/ask',
  '/app/home',
  '/app/habits',
  '/app/profile',
  '/app/welcome',
] as const;

async function load(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stub(page, 'not_elevated');
  await page.route('**/api/v1/locations/search**', (route) =>
    route.fulfill({ json: { data: searchFixture } }),
  );
  const withPlace = path.startsWith('/app') && path !== '/app/welcome';
  await page.goto(withPlace ? at(path) : path);
  await expect(page.locator('h1:visible').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
}

interface Stop {
  id: number;
  label: string;
  ring: boolean;
  onScreen: boolean;
}

// The focused element (null for the document itself), with a stable id.
function focused(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) {
      return null;
    }
    const w = window as unknown as {
      kbIds?: WeakMap<Element, number>;
      kbN?: number;
    };
    w.kbIds ??= new WeakMap();
    if (!w.kbIds.has(el)) {
      w.kbN = (w.kbN ?? 0) + 1;
      w.kbIds.set(el, w.kbN);
    }
    const ids = w.kbIds;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: ids.get(el)!,
      label: `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}`,
      ring:
        (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
        s.boxShadow !== 'none',
      onScreen: r.width > 0 && r.height > 0,
    };
  });
}

for (const path of PATHS) {
  test(`Tab walks the page with a ring on every stop: ${path}`, async ({
    page,
  }) => {
    await load(page, path);
    const stops: Stop[] = [];
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const stop = await focused(page);
      if (!stop) continue;
      if (stops.length && stop.id === stops[0]!.id) break; // wrapped
      // A trap holds focus on one element.
      expect(stop.id, `trap at ${stop.label}`).not.toBe(stops.at(-1)?.id);
      stops.push(stop);
    }
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.filter((s) => !s.ring).map((s) => s.label)).toEqual([]);
    expect(stops.filter((s) => !s.onScreen).map((s) => s.label)).toEqual([]);

    // Shift+Tab steps back one stop: from stop 3, back to stop 2.
    await page.reload();
    await expect(page.locator('h1:visible').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect((await focused(page))?.label).toBe(stops[1]?.label);
  });
}

// Guided chat: a question back is reached in visual order, with a ring on
// each stop, and Skip hands focus to the line that replaces it.
test('Ask by keyboard: a question back, then Skip', async ({ page }) => {
  await load(page, '/app/ask');
  await page.route('**/api/v1/assistant/answer', (route) =>
    route.fulfill({
      json: {
        data: {
          ...rulesAskFixture,
          followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }],
        },
      },
    }),
  );
  await page
    .getByRole('button', { name: 'Outdoor activities', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('group', { name: 'Do you exercise outdoors?' }),
  ).toBeVisible();

  const labels: string[] = [];
  for (let i = 0; i < 40 && !labels.includes('button:Skip'); i++) {
    await page.keyboard.press('Tab');
    const stop = await focused(page);
    if (!stop) continue;
    expect(stop.ring, stop.label).toBe(true);
    expect(stop.onScreen, stop.label).toBe(true);
    labels.push(stop.label);
  }
  const index = (label: string) => labels.indexOf(label);
  expect(index('button:Yes')).toBeGreaterThan(-1);
  expect(index('button:Yes')).toBeLessThan(index('button:No'));
  expect(index('button:No')).toBeLessThan(index('button:Skip'));

  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Skipped. You can answer it in My Profile any time.'),
  ).toBeFocused();
});

test('the place dialog by keyboard: search, choose, Escape', async ({
  page,
}) => {
  await load(page, '/app');
  const chip = page.getByRole('button', { name: /^Change place/ });
  await chip.focus();
  await page.keyboard.press('Enter');
  const box = page.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  await expect(box).toBeFocused();

  // Tab stays in the dialog (or on the document itself, the browser's own
  // stop), never on the page behind it.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const el = document.activeElement;
      return (
        !el ||
        el === document.body ||
        el === document.documentElement ||
        !!el.closest('dialog[open]')
      );
    });
    expect(inside).toBe(true);
  }

  // Escape closes it, and focus goes back to the chip.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(chip).toBeFocused();

  // Search and choose with the keyboard alone.
  await page.keyboard.press('Enter');
  await expect(box).toBeFocused();
  await page.keyboard.type('Pune');
  const first = page.getByRole('option').first();
  await expect(first).toBeVisible();
  await page.keyboard.press('ArrowDown');
  const choice = (await first.textContent())!.trim();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(chip).toHaveAccessibleName(
    new RegExp(choice.split(',')[0]!.trim()),
  );
});

test('Welcome by keyboard: place, step 2, step 3', async ({ page }) => {
  await load(page, '/app/welcome');
  // Step 1: search and choose with the keyboard.
  await page
    .getByRole('combobox', { name: 'Search for a city or area in India' })
    .focus();
  await page.keyboard.type('Pune');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Step 2: focus is on its heading; Space ticks a chip; Next by keyboard.
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await expect(page.locator('h1:visible')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.locator('input:checked')).toHaveCount(1);
  const next = page.getByRole('button', { name: 'Next' });
  await next.focus();
  await page.keyboard.press('Enter');

  // Step 3: focus is on its heading again.
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expect(page.locator('h1:visible')).toBeFocused();
});
