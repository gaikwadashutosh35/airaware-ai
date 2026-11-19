import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../test/axe.ts';
import Landing from './Landing.tsx';

const ACTION = "Check your area's air quality";
const HERO_ALT =
  'AirAware dashboard showing a model forecast for Pune with pollutant values, units, times and sources';
// Documented facts the page may state; any other digit would be invented.
const REAL_FIGURES = [
  'PM2.5',
  'PM10',
  '45 km',
  '48 hours',
  '2 letters',
  '12 hours',
  '1 km',
  '10 minutes',
];

describe('Landing', () => {
  afterEach(() => {
    cleanup();
  });

  it('has one main heading and the action once', () => {
    render(<Landing />);

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe('The air around you matters.');
    const actions = screen.getAllByRole('link', { name: ACTION });
    expect(actions).toHaveLength(1);
    for (const link of actions) expect(link.getAttribute('href')).toBe('/app');
  });

  it('puts the place search in the hero', () => {
    render(<Landing />);

    expect(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeDefined();
  });

  it('explains where every number comes from, in order', () => {
    render(<Landing />);

    const steps = screen.getByRole('list', {
      name: 'How a forecast reaches you',
    });
    expect(steps.tagName).toBe('OL');
    expect(
      within(steps)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'CAMS global model',
      'Open-Meteo',
      'AirAware server',
      'Your screen',
    ]);
  });

  it('shows the real dashboard', () => {
    render(<Landing />);

    expect(screen.getByAltText(HERO_ALT)).toBeDefined();
  });

  it('states its limits plainly', () => {
    const { container } = render(<Landing />);

    expect(container.textContent).toContain(
      'Forecasts are model estimates, not station measurements, and not the CPCB National AQI.',
    );
    expect(container.textContent).toContain(
      'Official CPCB observations are not connected yet.',
    );
  });

  it('credits the data source in the footer', () => {
    render(<Landing />);

    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Open-Meteo.com');
    expect(footer.textContent).toContain('CC BY 4.0');
    expect(
      within(footer).getByRole('link', { name: 'Open-Meteo.com' }),
    ).toBeDefined();
  });

  it('links to the privacy page from the footer', () => {
    render(<Landing />);

    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer)
        .getByRole('link', { name: 'Privacy' })
        .getAttribute('href'),
    ).toBe('/privacy');
  });

  it('invents no numbers', () => {
    const { container } = render(<Landing />);
    const footer = screen.getByRole('contentinfo');

    let text = (container.textContent ?? '').replace(
      footer.textContent ?? '',
      '',
    );
    for (const figure of REAL_FIGURES) text = text.replaceAll(figure, '');
    expect(text).not.toMatch(/\d/);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Landing />);

    await expectNoAxeViolations(container);
  });
});
