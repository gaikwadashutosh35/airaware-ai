import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  ForecastData,
} from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { AirReadout } from './AirReadout.tsx';

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
      'PM10: not enough forecast hours for a 24-hour check',
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
    expect(container.textContent).toContain(
      'Retrieved more than an hour ago. Reload for the latest forecast.',
    );
    expect(container.querySelector('svg[data-haze-level]')).not.toBeNull();
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
