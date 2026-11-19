import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  ForecastData,
} from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { AirReadout } from './AirReadout.tsx';
import { formatDateTime } from './forecast.ts';

afterEach(cleanup);

// Inside the fixture's first hour (17:00 UTC, PM2.5 48).
const NOW = new Date('2026-11-17T17:30:00.000Z');

const elevated: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 },
  ],
};

function show(data: ForecastData = forecastFixture, stale = false) {
  return render(<AirReadout data={data} now={NOW} stale={stale} />);
}

describe('AirReadout', () => {
  it("leads with this hour's PM2.5", async () => {
    const { container } = show();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Model forecast' }),
    ).toBeDefined();
    const figure = screen.getByTestId('readout-pm25');
    expect(figure.hasAttribute('data-lead')).toBe(true);
    expect(figure.textContent).toContain('48');
    expect(figure.textContent).toContain('μg/m³');
    expect(container.textContent).toMatch(/Values for /);
    await expectNoAxeViolations(container);
  });

  it('shows No value when this hour has no PM2.5', () => {
    const [first, ...rest] = forecastFixture.hours;
    show({
      ...forecastFixture,
      hours: [
        { ...first!, values: { ...first!.values, PM2_5: null } },
        ...rest,
      ],
    });
    expect(screen.getByTestId('readout-pm25').textContent).toContain(
      'No value',
    );
  });

  it('has no headline figure when the model has no PM2.5', () => {
    const series = structuredClone(forecastFixture);
    delete series.units.PM2_5;
    for (const hour of series.hours) delete hour.values.PM2_5;
    const { container } = show(series);
    expect(container.querySelector('[data-lead]')).toBeNull();
  });

  it('states the 24-hour check in words', async () => {
    const { container } = show({ ...forecastFixture, airCheck: elevated });
    expect(container.textContent).toContain(
      'PM2.5 24-hour average 72.4 μg/m³, above the 60 μg/m³ limit',
    );
    expect(container.textContent).toContain(
      'PM10 24-hour average 80 μg/m³, within the 100 μg/m³ limit',
    );
    await expectNoAxeViolations(container);
  });

  it('words an unknown PM10 check', () => {
    const { container } = show({
      ...forecastFixture,
      airCheck: {
        ...elevated,
        checks: [
          elevated.checks[0]!,
          {
            pollutant: 'PM10',
            status: 'unknown',
            average24h: null,
            limit: 100,
          },
        ],
      },
    });
    expect(container.textContent).toContain(
      'PM10: 24-hour average not available',
    );
    expect(
      container
        .querySelector('svg[data-haze-level]')
        ?.getAttribute('data-haze-level'),
    ).toBe('3');
  });

  it('says when air information is unavailable', () => {
    const { container } = show();
    expect(container.textContent).toContain('Air information unavailable');
    expect(
      container
        .querySelector('svg[data-haze-level]')
        ?.getAttribute('data-haze-level'),
    ).toBe('0');
  });

  it('keeps the source line', () => {
    const { container } = show();
    expect(container.textContent).toMatch(/Retrieved /);
    expect(container.textContent).toContain(
      'Open-Meteo, CAMS global atmospheric composition forecast',
    );
  });

  it('keeps the stale sentence with the skyline', () => {
    const { container } = show(forecastFixture, true);
    const stale = screen.getByText(
      'Retrieved more than an hour ago. Reload for the latest forecast.',
    );
    expect(container.querySelector('svg[data-haze-level]')).not.toBeNull();
    // Final review I5: the "not current" note is read before the figure.
    expect(
      stale.compareDocumentPosition(screen.getByTestId('readout-pm25')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('names the 24-hour window it checked', () => {
    const { container } = show({ ...forecastFixture, airCheck: elevated });
    expect(container.textContent).toContain(
      `Model forecast for the next 24 hours from ${formatDateTime('2026-11-17T17:00:00.000Z')}`,
    );
  });

  it('says air information is unavailable only when both checks are', () => {
    const { container } = show({
      ...forecastFixture,
      airCheck: {
        level: 'unknown',
        windowStart: '2026-11-17T17:00:00.000Z',
        checks: [
          {
            pollutant: 'PM2_5',
            status: 'within_limit',
            average24h: 36,
            limit: 60,
          },
          {
            pollutant: 'PM10',
            status: 'unknown',
            average24h: null,
            limit: 100,
          },
        ],
      },
    });
    expect(container.textContent).not.toContain('Air information unavailable');
    expect(container.textContent).toContain(
      'PM10: 24-hour average not available',
    );
  });

  it('the weather line names only known values', () => {
    const { container } = show({
      ...forecastFixture,
      weather: {
        ...forecastFixture.weather!,
        temperatureC: 31,
        precipitationProbability: 70,
        precipitationMm: 0.4,
        cloudCoverPercent: 85,
        visibilityM: null,
      },
    });
    expect(container.textContent).toContain(
      'Weather this hour: 31 °C, rain (0.4 mm), 85 % cloud cover. Open-Meteo weather forecast.',
    );
    expect(container.textContent).not.toMatch(/visibility/i);
  });

  it('says rain is likely when only the chance is high', () => {
    const { container } = show({
      ...forecastFixture,
      weather: {
        ...forecastFixture.weather!,
        temperatureC: 29,
        precipitationMm: 0,
        precipitationProbability: 70,
        cloudCoverPercent: null,
      },
    });
    expect(container.textContent).toContain(
      'Weather this hour: 29 °C, rain likely (70 %). Open-Meteo weather forecast.',
    );
  });

  it('says when weather is unavailable', () => {
    const { container } = show({ ...forecastFixture, weather: null });
    expect(container.textContent).toContain('Weather unavailable');
  });

  it('the scene follows the weather', () => {
    const { container } = show({
      ...forecastFixture,
      weather: { ...forecastFixture.weather!, precipitationMm: 1.2 },
    });
    expect(container.querySelector('[data-part="rain"]')).not.toBeNull();
  });

  it('never says AQI, safe or healthy', () => {
    for (const airCheck of [elevated, forecastFixture.airCheck]) {
      const { container, unmount } = show({ ...forecastFixture, airCheck });
      expect(container.textContent).not.toMatch(/\bAQI\b/i);
      expect(container.textContent).not.toMatch(/\bsafe/i);
      expect(container.textContent).not.toMatch(/healthy/i);
      unmount();
    }
  });
});
