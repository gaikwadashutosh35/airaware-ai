import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AirAssessment,
  ForecastData,
} from '../../../../shared/contracts.ts';
import { formatTime } from '../air-quality/forecast.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { TodayLead, TodayLeadLoading } from './TodayLead.tsx';
import { verdictFrom } from './today.ts';

afterEach(cleanup);

const elevated: AirAssessment = {
  level: 'elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'above_limit', average24h: 78, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 45, limit: 100 },
  ],
};

const within: AirAssessment = {
  level: 'not_elevated',
  windowStart: '2026-11-17T17:00:00.000Z',
  checks: [
    { pollutant: 'PM2_5', status: 'within_limit', average24h: 43, limit: 60 },
    { pollutant: 'PM10', status: 'within_limit', average24h: 45, limit: 100 },
  ],
};

function show(
  data: ForecastData = forecastFixture,
  stale = false,
  onReload?: () => void,
) {
  return render(
    <main>
      <TodayLead data={data} stale={stale} onReload={onReload} />
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
    // The meaning sentence moved into "Air quality details" (B1).
    expect(container.textContent).not.toContain(
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
      `Model forecast · Open-Meteo · retrieved ${time}`,
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
        name: 'Air information unavailable',
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

  // B1: within the limit the card is short; the sentence moves into the details.
  it('the meaning sentence is off the card when within, on it otherwise', () => {
    const { container, unmount } = show({
      ...forecastFixture,
      airCheck: within,
    });
    expect(container.textContent).not.toContain(
      verdictFrom(within).explanation,
    );
    unmount();
    for (const airCheck of [forecastFixture.airCheck, elevated]) {
      const view = show({ ...forecastFixture, airCheck });
      expect(view.container.textContent).toContain(
        verdictFrom(airCheck).explanation,
      );
      view.unmount();
    }
  });

  it('the banner sentence is exactly the sentence, with one reload button', () => {
    const onReload = vi.fn();
    const { container } = show(
      { ...forecastFixture, airCheck: within },
      true,
      onReload,
    );
    const banner = container.querySelector('[data-part="stale-banner"]')!;
    expect(banner.querySelector('p')?.textContent).toBe(
      'Not current: retrieved more than an hour ago. Reload for the latest forecast.',
    );
    const button = screen.getByRole('button', { name: 'Reload forecast' });
    expect(banner.contains(button)).toBe(true);
    fireEvent.click(button);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('there is no reload button without onReload', () => {
    show({ ...forecastFixture, airCheck: within }, true);
    expect(screen.queryByRole('button')).toBeNull();
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

  // Backdrop design §5.4: the app backdrop owns the scene now; the
  // weather line, the scene's words, leads the card.
  it('the lead card draws no scene', () => {
    const { container } = show(forecastFixture);
    expect(container.querySelector('svg')).toBeNull();
    expect(
      container.querySelector('section')?.firstElementChild?.textContent,
    ).toMatch(/^Weather for /);
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

describe('TodayLeadLoading', () => {
  it('says what it waits for, in view, with grey bars hidden from readers', () => {
    const { container } = render(
      <main>
        <TodayLeadLoading />
      </main>,
    );
    const section = container.querySelector('section')!;
    expect(section.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading forecast…').className).not.toContain(
      'sr-only',
    );
    const bars = container.querySelectorAll('[aria-hidden="true"]');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });
});
