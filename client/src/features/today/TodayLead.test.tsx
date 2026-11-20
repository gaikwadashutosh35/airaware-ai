import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  ForecastData,
} from '../../../../shared/contracts.ts';
import { formatTime } from '../air-quality/forecast.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { TodayLead } from './TodayLead.tsx';

afterEach(cleanup);

const within: AirAssessment = {
  level: 'not_elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'within_limit', average24h: 43, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 45, limit: 100 },
  ],
};

function show(data: ForecastData = forecastFixture, stale = false) {
  return render(
    <main>
      <TodayLead data={data} stale={stale} />
    </main>,
  );
}

describe('TodayLead', () => {
  it('the verdict leads, with its tag, provenance and caveat', async () => {
    const { container } = show({ ...forecastFixture, airCheck: within });
    const verdict = screen.getByRole('heading', {
      level: 2,
      name: "Forecast within India's 24-hour limits",
    });
    expect(verdict).toBeDefined();
    expect(container.textContent).toContain('Within the limit');
    expect(container.textContent).toContain(
      'Fine and coarse particles are forecast below the national daily limits for the next 24 hours.',
    );
    expect(container.textContent).toContain(
      'Being within the national limit does not mean the air is clean or free of risk.',
    );
    const time = new Date(forecastFixture.retrievedAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    expect(container.textContent).toContain(
      `Model forecast · Open-Meteo · updated ${time}`,
    );
    // No number without its unit, and no coordinates, in the lead.
    expect(container.textContent).not.toMatch(/µg|μg/);
    await expectNoAxeViolations(container);
  });

  it('unknown air says so plainly', () => {
    show();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Live air information unavailable',
      }),
    ).toBeDefined();
  });

  it('the stale banner sits under the verdict', () => {
    const { container } = show({ ...forecastFixture, airCheck: within }, true);
    const stale = container.querySelector('[data-part="stale-banner"]');
    expect(stale?.textContent).toBe(
      'Not current: retrieved more than an hour ago. Reload for the latest forecast.',
    );
    expect(
      screen
        .getByRole('heading', { level: 2 })
        .compareDocumentPosition(stale!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
      `Weather for ${formatTime(forecastFixture.weather!.time)}: 31 °C, rain (0.4 mm), 85 % cloud cover. Open-Meteo weather forecast.`,
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
      `Weather for ${formatTime(forecastFixture.weather!.time)}: 29 °C, rain likely (70 %). Open-Meteo weather forecast.`,
    );
  });

  // Review A2 #2: the line names its hour, so it never calls a past hour
  // "this hour" while the page stays open.
  it('the weather line names its hour, even with no values', () => {
    const { container } = show({
      ...forecastFixture,
      weather: {
        ...forecastFixture.weather!,
        temperatureC: null,
        precipitationMm: null,
        precipitationProbability: null,
        cloudCoverPercent: null,
        visibilityM: null,
      },
    });
    expect(container.textContent).toContain(
      `Weather for ${formatTime(forecastFixture.weather!.time)}: no values reported. Open-Meteo weather forecast.`,
    );
    expect(container.textContent).not.toContain('this hour');
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
    expect(container.querySelector('svg[data-air]')).not.toBeNull();
  });

  // Moved from AirReadout: the scene's look follows the 24-hour check.
  it('the scene follows the air check', () => {
    const look = (airCheck: AirAssessment) => {
      const { container, unmount } = show({ ...forecastFixture, airCheck });
      const level = container
        .querySelector('svg[data-air]')
        ?.getAttribute('data-air');
      unmount();
      return level;
    };
    expect(
      look({
        level: 'elevated',
        windowStart: null,
        checks: [
          {
            pollutant: 'PM2_5',
            status: 'above_limit',
            average24h: 72,
            limit: 60,
          },
          {
            pollutant: 'PM10',
            status: 'unknown',
            average24h: null,
            limit: 100,
          },
        ],
      }),
    ).toBe('above');
    expect(look(forecastFixture.airCheck)).toBe('unknown');
  });

  it('never says AQI, safe or healthy', () => {
    for (const airCheck of [within, forecastFixture.airCheck]) {
      const { container, unmount } = show({ ...forecastFixture, airCheck });
      expect(container.textContent).not.toMatch(/\bAQI\b/i);
      expect(container.textContent).not.toMatch(/\bsafe/i);
      expect(container.textContent).not.toMatch(/healthy/i);
      unmount();
    }
  });
});
