import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForecastSeries } from '../../../shared/contracts.ts';
import { formatTime } from '../features/air-quality/forecast.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import {
  forecastFixture,
  searchFixture,
  sourcesFixture,
} from '../test/fixtures.ts';
import Dashboard from './Dashboard.tsx';

type ForecastResponder = (latitude: string | null) => Promise<Response>;

const FORECAST_STALE =
  'Retrieved more than an hour ago. Reload for the latest forecast.';

function urlOf(input: RequestInfo | URL): URL {
  const href =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return new URL(href, 'http://localhost');
}

function routeFetch(forecast: ForecastResponder) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = urlOf(input);
    if (url.pathname === '/api/v1/locations/search') {
      return Promise.resolve(Response.json({ data: searchFixture }));
    }
    if (url.pathname === '/api/v1/air-quality/sources') {
      return Promise.resolve(Response.json({ data: sourcesFixture }));
    }
    return forecast(url.searchParams.get('latitude'));
  });
}

function ok(series: ForecastSeries = forecastFixture) {
  return () => Promise.resolve(Response.json({ data: series }));
}

function forecastCalls(fetchSpy: ReturnType<typeof routeFetch>) {
  return fetchSpy.mock.calls.filter(
    ([input]) => urlOf(input).pathname === '/api/v1/air-quality/forecast',
  );
}

async function choosePlace(optionIndex = 0) {
  const input = screen.getByRole('combobox', {
    name: 'Search for a city or area in India',
  });
  fireEvent.change(input, { target: { value: 'Pune' } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  for (let i = 0; i <= optionIndex; i++) {
    fireEvent.keyDown(input, { key: 'ArrowDown' });
  }
  fireEvent.keyDown(input, { key: 'Enter' });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T17:30:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    Reflect.deleteProperty(navigator, 'geolocation');
  });

  it('asks for a place before loading any forecast', async () => {
    const fetchSpy = routeFetch(ok());
    const { container } = render(<Dashboard />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByText(
        'Search for a place or use your location to see its air-quality forecast.',
      ),
    ).toBeDefined();
    expect(forecastCalls(fetchSpy)).toHaveLength(0);
    vi.useRealTimers();
    await expectNoAxeViolations(container);
  });

  it('shows the labelled model forecast for the chosen place', async () => {
    routeFetch(ok());
    const { container } = render(<Dashboard />);

    await choosePlace();

    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Air quality: Pune, Maharashtra',
    });
    expect(document.activeElement).toBe(heading);
    expect(screen.getAllByText('Model forecast').length).toBeGreaterThan(0);
    const pm25 = screen.getByTestId('metric-PM2_5');
    expect(pm25.textContent).toContain('48');
    expect(pm25.textContent).toContain('μg/m³');
    expect(
      screen.getByText(`Values for ${formatTime('2026-11-17T17:00:00.000Z')}`),
    ).toBeDefined();
    expect(
      screen.getByText('Official CPCB observation unavailable'),
    ).toBeDefined();
    expect(
      screen.getByText(
        `Model run time not reported by the provider. Retrieved ${formatTime(forecastFixture.retrievedAt)}.`,
      ),
    ).toBeDefined();
    expect(container.textContent).toContain('Open-Meteo.com');
    vi.useRealTimers();
    await expectNoAxeViolations(container);
  });

  it('prints "No value" for a missing hourly value', async () => {
    const series = structuredClone(forecastFixture);
    series.hours[0]!.values.PM10 = null;
    routeFetch(ok(series));
    render(<Dashboard />);

    await choosePlace();

    expect(screen.getByTestId('metric-PM10').textContent).toContain('No value');
  });

  it('leads with PM2.5 as the headline figure', async () => {
    routeFetch(ok());
    render(<Dashboard />);

    await choosePlace();

    const lead = document.querySelector('[data-lead]');
    expect(lead).toBe(screen.getByTestId('metric-PM2_5'));
    expect(lead?.textContent).toContain('PM2.5');
    expect(lead?.textContent).toContain('48');
    expect(lead?.textContent).toContain('μg/m³');
  });

  it('has no headline figure when the model has no PM2.5', async () => {
    const series = structuredClone(forecastFixture);
    delete series.units.PM2_5;
    for (const hour of series.hours) delete hour.values.PM2_5;
    routeFetch(ok(series));
    render(<Dashboard />);

    await choosePlace();

    expect(document.querySelector('[data-lead]')).toBeNull();
    expect(screen.getByTestId('metric-PM10').textContent).toContain('52.4');
  });

  it('lists every hour in the forecast table', async () => {
    routeFetch(ok());
    render(<Dashboard />);

    await choosePlace();

    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Time',
      'PM2.5 (μg/m³)',
      'PM10 (μg/m³)',
      'NO₂ (μg/m³)',
      'SO₂ (μg/m³)',
      'O₃ (μg/m³)',
      'CO (μg/m³)',
    ]);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(3);
  });

  it('says the forecast is old once it passes an hour, without a reload', async () => {
    routeFetch(ok());
    render(<Dashboard />);
    await choosePlace();
    expect(screen.queryByText(FORECAST_STALE)).toBeNull();

    // The fixture was retrieved at 17:05; 17:30 + 36 min = 18:06.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(36 * 60_000);
    });

    expect(screen.getByText(FORECAST_STALE)).toBeDefined();
    // The figures stay at load time.
    expect(
      screen.getByText(
        `Values for ${formatTime(forecastFixture.hours[0].time)}`,
      ),
    ).toBeDefined();
  });

  it('never shows an AQI number', async () => {
    routeFetch(ok());
    const { container } = render(<Dashboard />);

    await choosePlace();

    const text = (container.textContent ?? '').replaceAll(
      'Not the CPCB National AQI',
      '',
    );
    expect(text).not.toMatch(/\bAQI\b/);
  });

  it('offers a retry when the provider fails', async () => {
    let fail = true;
    routeFetch(() =>
      Promise.resolve(
        fail
          ? Response.json(
              {
                error: {
                  code: 'PROVIDER_ERROR',
                  message: 'Data provider unavailable.',
                },
              },
              { status: 502 },
            )
          : Response.json({ data: forecastFixture }),
      ),
    );
    const { container } = render(<Dashboard />);

    await choosePlace();
    expect(screen.getByText('Forecast provider unavailable.')).toBeDefined();
    vi.useRealTimers();
    await expectNoAxeViolations(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T17:30:00Z'));

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId('metric-PM2_5').textContent).toContain('48');
  });

  it('explains a rate limit', async () => {
    routeFetch(() =>
      Promise.resolve(
        Response.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Try again in a minute.',
            },
          },
          { status: 429 },
        ),
      ),
    );
    render(<Dashboard />);

    await choosePlace();

    expect(
      screen.getByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('blames the connection, not the provider, when offline', async () => {
    routeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<Dashboard />);

    await choosePlace();

    expect(
      screen.getByText('Could not reach AirAware. Check your connection.'),
    ).toBeDefined();
  });

  it('shows the coordinates the forecast is for', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Delhi&lat=19.08&lon=72.88',
    );
    routeFetch(ok());
    render(<Dashboard />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Forecast location: 19.08, 72.88')).toBeDefined();
  });

  it('credits Open-Meteo even when the source list fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: { code: 'INTERNAL_ERROR', message: 'x' } },
        {
          status: 500,
        },
      ),
    );
    render(<Dashboard />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Open-Meteo.com');
    expect(footer.textContent).toContain('CC BY 4.0');
  });

  it('ignores a late device location after the user picked a place', async () => {
    let succeed: (p: {
      coords: { latitude: number; longitude: number };
    }) => void = () => {};
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: typeof succeed) => {
          succeed = success;
        },
      },
      configurable: true,
    });
    routeFetch(ok());
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await choosePlace();
    await act(async () => {
      succeed({ coords: { latitude: 18.519571, longitude: 73.855347 } });
    });

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Air quality: Pune, Maharashtra',
      }),
    ).toBeDefined();
    expect(window.location.search).toContain('place=Pune');
  });

  it('never shows an old place forecast under a new place', async () => {
    let resolveFirst: (response: Response) => void = () => {};
    const other = structuredClone(forecastFixture);
    other.hours[0]!.values.PM2_5 = 99;
    routeFetch((latitude) =>
      latitude === '18.52'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(Response.json({ data: other })),
    );
    render(<Dashboard />);

    await choosePlace(0);
    await choosePlace(1);
    await act(async () => {
      resolveFirst(Response.json({ data: forecastFixture }));
    });

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Air quality: Puneta, Rajasthan',
      }),
    ).toBeDefined();
    expect(screen.getByTestId('metric-PM2_5').textContent).toContain('99');
    expect(screen.getByTestId('metric-PM2_5').textContent).not.toContain('48');
  });

  it('opens the place given in the address without moving focus', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C+Maharashtra&lat=18.52&lon=73.86',
    );
    const fetchSpy = routeFetch(ok());
    render(<Dashboard />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Air quality: Pune, Maharashtra',
    });
    expect(document.activeElement).not.toBe(heading);
    const call = forecastCalls(fetchSpy)[0];
    expect(urlOf(call![0]).searchParams.get('latitude')).toBe('18.52');
  });

  it('puts a searched place in the address', async () => {
    routeFetch(ok());
    render(<Dashboard />);

    await choosePlace();

    expect(window.location.search).toBe(
      '?place=Pune%2C+Maharashtra&lat=18.52&lon=73.86',
    );
  });

  it('keeps a device location out of the address', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C+Maharashtra&lat=18.52&lon=73.86',
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (
          success: (p: {
            coords: { latitude: number; longitude: number };
          }) => void,
        ) => success({ coords: { latitude: 18.519571, longitude: 73.855347 } }),
      },
      configurable: true,
    });
    routeFetch(ok());
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(window.location.search).toBe('');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Air quality: Near you (approximate)',
      }),
    ).toBeDefined();
  });
});
