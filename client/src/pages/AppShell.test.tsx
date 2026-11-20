/// <reference types="node" />
import { readFileSync } from 'node:fs';
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
import { rulesPlanFixture } from '../test/planFixtures.ts';
import AppShell from './AppShell.tsx';

type ForecastResponder = (latitude: string | null) => Promise<Response>;

const FORECAST_STALE =
  'Not current: retrieved more than an hour ago. Reload for the latest forecast.';

function urlOf(input: RequestInfo | URL): URL {
  const href =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return new URL(href, 'http://localhost');
}

// Answers any other path (plans, saved data); undefined = not handled.
type OtherResponder = (
  url: URL,
  init?: RequestInit,
) => Promise<Response> | undefined;

function routeFetch(forecast: ForecastResponder, other?: OtherResponder) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = urlOf(input);
    if (url.pathname === '/api/v1/locations/search') {
      return Promise.resolve(Response.json({ data: searchFixture }));
    }
    if (url.pathname === '/api/v1/air-quality/sources') {
      return Promise.resolve(Response.json({ data: sourcesFixture }));
    }
    return other?.(url, init) ?? forecast(url.searchParams.get('latitude'));
  });
}

const session = vi.hoisted(() => ({
  available: false,
  currentToken: vi.fn<() => Promise<string | null>>(),
  tokenForSave: vi.fn<() => Promise<string>>(),
}));

// Saving stays off unless a test switches it on.
vi.mock('../lib/supabase.ts', () => ({
  get savingAvailable() {
    return session.available;
  },
  currentToken: () => session.currentToken(),
  tokenForSave: () => session.tokenForSave(),
  forgetSession: () => Promise.resolve(),
}));

const RULES_MADE_BY =
  'Made by our rules. AI personalisation is unavailable right now.';

function planRoutes(
  plan: () => Promise<Response> = () =>
    Promise.resolve(Response.json({ data: rulesPlanFixture })),
): OtherResponder {
  return (url, init) => {
    if (url.pathname === '/api/v1/recommendations/daily-plan') return plan();
    if (url.pathname === '/api/v1/profile/preferences') {
      return Promise.resolve(Response.json({ data: null }));
    }
    if (url.pathname === '/api/v1/account' && init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return undefined;
  };
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function buildPlan() {
  fireEvent.click(screen.getByRole('button', { name: 'Build my daily plan' }));
  await flush();
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

describe('AppShell', () => {
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
    session.available = false;
    session.currentToken.mockReset().mockResolvedValue(null);
    session.tokenForSave.mockReset().mockResolvedValue('tok');
  });

  it('asks for a place before loading any forecast', async () => {
    const fetchSpy = routeFetch(ok());
    const { container } = render(<AppShell />);
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

  it('the no-place card focuses the search', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByText(
        'Search for a place or use your location to see its air-quality forecast.',
      ),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Search for a place' }));
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    );

    await choosePlace();
    expect(
      screen.queryByRole('button', { name: 'Search for a place' }),
    ).toBeNull();
  });

  it('shows the labelled model forecast for the chosen place', async () => {
    routeFetch(ok());
    const { container } = render(<AppShell />);

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
    render(<AppShell />);

    await choosePlace();

    expect(screen.getByTestId('metric-PM10').textContent).toContain('No value');
  });

  it('leads with PM2.5 as the headline figure', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();

    const lead = document.querySelector('[data-lead]');
    // The headline figure lives in the air readout (Phase A redesign).
    expect(lead).toBe(screen.getByTestId('readout-pm25'));
    expect(lead?.textContent).toContain('PM2.5');
    expect(lead?.textContent).toContain('48');
    expect(lead?.textContent).toContain('μg/m³');
  });

  it('has no headline figure when the model has no PM2.5', async () => {
    const series = structuredClone(forecastFixture);
    delete series.units.PM2_5;
    for (const hour of series.hours) delete hour.values.PM2_5;
    routeFetch(ok(series));
    render(<AppShell />);

    await choosePlace();

    expect(document.querySelector('[data-lead]')).toBeNull();
    expect(screen.getByTestId('metric-PM10').textContent).toContain('52.4');
  });

  it('lists every hour in the forecast table', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();

    // The hourly table, by its caption (the pollutant table is a second one).
    const table = screen.getByRole('table', {
      name: 'Hourly model forecast from Open-Meteo',
    });
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
    render(<AppShell />);
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
    const { container } = render(<AppShell />);

    await choosePlace();

    // Statements that the CPCB AQI is not shown, and the CPCB source's
    // name, are the only allowed mentions; longest first.
    const text = [
      'We do not calculate the CPCB National AQI',
      'Not the CPCB National AQI',
      'CPCB National AQI',
    ].reduce(
      (rest, allowed) => rest.replaceAll(allowed, ''),
      container.textContent ?? '',
    );
    expect(text).not.toMatch(/\bAQI\b/);
  });

  it('the Change button moves focus to the place search', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();
    fireEvent.click(screen.getByRole('button', { name: 'Change place' }));

    expect(document.activeElement).toBe(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    );
  });

  it('air comes before the plan in reading order', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();

    const readout = screen.getByRole('heading', { name: 'Model forecast' });
    const nextDays = screen.getByRole('heading', {
      name: 'Your city, the next two days',
    });
    const plan = screen.getByRole('heading', { name: 'Your daily plan' });
    expect(
      readout.compareDocumentPosition(nextDays) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      nextDays.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the forecast limitations once, in the sources panel', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();

    const matches = screen.getAllByText('Not the CPCB National AQI.');
    expect(matches).toHaveLength(1);
    expect(
      screen
        .getByRole('region', { name: 'Sources and limitations' })
        .contains(matches[0]),
    ).toBe(true);
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
    const { container } = render(<AppShell />);

    await choosePlace();
    expect(screen.getByText('Forecast provider unavailable.')).toBeDefined();
    vi.useRealTimers();
    await expectNoAxeViolations(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T17:30:00Z'));

    fail = false;
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    // Final review C1: the button unmounts, so focus moves to the place
    // heading instead of falling back to the page top.
    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        level: 2,
        name: 'Air quality: Pune, Maharashtra',
      }),
    );
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
    render(<AppShell />);

    await choosePlace();

    expect(
      screen.getByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('blames the connection, not the provider, when offline', async () => {
    routeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<AppShell />);

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
    render(<AppShell />);
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
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Open-Meteo.com');
    expect(footer.textContent).toContain('CC BY 4.0');
  });

  it('links to the privacy page from the footer', () => {
    routeFetch(ok());
    render(<AppShell />);

    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer)
        .getByRole('link', { name: 'Privacy' })
        .getAttribute('href'),
    ).toBe('/privacy');
  });

  it('skip link comes first and targets main', () => {
    routeFetch(ok());
    render(<AppShell />);

    const skip = screen.getAllByRole('link')[0]!;
    expect(skip.textContent).toBe('Skip to content');
    const target = document.querySelector(skip.getAttribute('href')!);
    expect(target?.tagName).toBe('MAIN');
  });

  it('keeps the forecast when moving between pages', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole('link', { name: 'My Profile' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'My Profile' }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Today' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByRole('heading', { name: 'Model forecast' }),
    ).toBeDefined();
    expect(forecastCalls(fetchSpy)).toHaveLength(1);
  });

  it('the head allows safe areas and a navy theme colour', () => {
    const html = readFileSync('index.html', 'utf8').replace(/\s+/g, ' ');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('<meta name="theme-color" content="#080f1c" />');
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
    render(<AppShell />);

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
    render(<AppShell />);

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

  it('builds the plan from the answers on screen without saving them', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();

    fireEvent.change(screen.getByLabelText('Do you have an air purifier?'), {
      target: { value: 'yes' },
    });
    await buildPlan();

    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();
    const post = fetchSpy.mock.calls.find(
      ([input]) =>
        urlOf(input).pathname === '/api/v1/recommendations/daily-plan',
    );
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      householdContext: { home: { airPurifier: true } },
    });
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });

  it('clears the shown plan when a new place is chosen', async () => {
    routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace(0);
    await buildPlan();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();

    await choosePlace(1);

    expect(screen.queryByText(RULES_MADE_BY)).toBeNull();
  });

  // Review Focus 2.
  it('never shows an old place plan under a new place', async () => {
    let reply: (response: Response) => void = () => {};
    routeFetch(
      ok(),
      planRoutes(
        () =>
          new Promise((resolve) => {
            reply = resolve;
          }),
      ),
    );
    render(<AppShell />);
    await choosePlace(0);
    fireEvent.click(
      screen.getByRole('button', { name: 'Build my daily plan' }),
    );

    await choosePlace(1);
    await act(async () => {
      reply(Response.json({ data: rulesPlanFixture }));
    });
    await flush();

    expect(screen.queryByText(RULES_MADE_BY)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Build my daily plan' }),
    ).toHaveProperty('disabled', false);
    expect(
      screen.queryByText('Building your plan. This can take up to 30 seconds.'),
    ).toBeNull();
  });

  // Review Focus 1 (the plan area part).
  it('clears the shown plan after "Delete everything"', async () => {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await buildPlan();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await flush();

    expect(screen.getByText('Deleted. Nothing is saved now.')).toBeDefined();
    expect(screen.queryByText(RULES_MADE_BY)).toBeNull();
  });

  // A session with one saved plan (Delhi); deleting the account ends it.
  function withSavedPlan(): OtherResponder {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    const saved = {
      id: 'p1',
      savedAt: '2026-11-17T10:00:00.000Z',
      plan: { ...rulesPlanFixture, place: { label: 'Delhi' } },
    };
    const plans = planRoutes();
    return (url, init) => {
      if (url.pathname === '/api/v1/account') {
        session.currentToken.mockResolvedValue(null);
      }
      if (url.pathname === '/api/v1/plans') {
        return Promise.resolve(
          Response.json({
            data: [{ id: 'p1', savedAt: saved.savedAt, placeLabel: 'Delhi' }],
          }),
        );
      }
      if (url.pathname === '/api/v1/plans/p1') {
        return Promise.resolve(Response.json({ data: saved }));
      }
      return plans(url, init);
    };
  }

  async function openSavedPlan() {
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /^Open/ }));
    await flush();
    expect(screen.getByText('Plan for Delhi')).toBeDefined();
  }

  // Review Focus 1.
  it('hides the list and closes the snapshot after "Delete everything"', async () => {
    routeFetch(ok(), withSavedPlan());
    render(<AppShell />);
    await openSavedPlan();
    expect(screen.getByRole('heading', { name: 'Saved plans' })).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await flush();

    expect(screen.getByText('Deleted. Nothing is saved now.')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Saved plans' })).toBeNull();
    expect(screen.queryByText('Plan for Delhi')).toBeNull();
  });

  it('closes a snapshot when a new place is chosen', async () => {
    routeFetch(ok(), withSavedPlan());
    render(<AppShell />);
    await openSavedPlan();

    await choosePlace();

    expect(screen.queryByText('Plan for Delhi')).toBeNull();
    expect(screen.queryByText(/This is a snapshot/)).toBeNull();
  });

  it('opens the place given in the address without moving focus', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C+Maharashtra&lat=18.52&lon=73.86',
    );
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
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
    render(<AppShell />);

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
    render(<AppShell />);

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
