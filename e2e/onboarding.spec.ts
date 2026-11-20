// Phase 5: a first visit goes through Welcome to Today. "Remember" stays
// unticked, so no account is created. Uses live Open-Meteo search.
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe.ts';

test('a first visit goes through Welcome to Today', async ({ page }) => {
  await page.goto('/app');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Where should we check air quality?',
    }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page
    .getByRole('combobox', { name: 'Search for a city or area in India' })
    .fill('Pune');
  await page
    .getByRole('option', { name: 'Pune, Maharashtra', exact: true })
    .click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'What does your typical day look like?',
    }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: 'Your day' })
    .getByText('Office commute', { exact: true })
    .click();
  await page
    .getByRole('group', { name: 'How do you usually travel?' })
    .getByText('Car', { exact: true })
    .click();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Tell us a little about your home.',
    }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: 'What do you mostly cook with?' })
    .getByText('Electric', { exact: true })
    .click();
  await expect(
    page.getByRole('checkbox', { name: 'Remember on this device' }),
  ).not.toBeChecked();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'See my air' }).click();

  await expect(page).toHaveURL(/\/app\?place=Pune/);
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Air quality: Pune, Maharashtra',
    }),
  ).toBeVisible();
  // The answers went into My Profile, unsaved.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'My Profile' })
    .click();
  await expect(
    page.getByLabel('How do you usually travel to work or college?'),
  ).toHaveValue('car');
  await expect(page.getByLabel('What do you mostly cook with?')).toHaveValue(
    'electric',
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)),
    ),
  ).toBe(false);
});
