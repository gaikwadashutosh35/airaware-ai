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
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ForecastSeries } from '../../../shared/contracts.ts';
import {
  formatDateTime,
  formatTime,
} from '../features/air-quality/forecast.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { stubDialog } from '../test/dialog.ts';
import {
  forecastFixture,
  searchFixture,
  sourcesFixture,
} from '../test/fixtures.ts';
import {
  habitsGuidesFixture,
  homeGuidesFixture,
} from '../test/guideFixtures.ts';
import { aiAskFixture } from '../test/askFixtures.ts';
import { rulesPlanFixture } from '../test/planFixtures.ts';
import { verdictFrom } from '../features/today/today.ts';
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
    const answer = other?.(url, init);
    if (answer) return answer;
    if (url.pathname === '/api/v1/recommendations/guides') {
      return Promise.resolve(
        Response.json({
          data:
            url.searchParams.get('topic') === 'habits'
              ? habitsGuidesFixture
              : homeGuidesFixture,
        }),
      );
    }
    // Today builds a plan by itself: a rules plan unless a test says otherwise.
    if (url.pathname === '/api/v1/recommendations/daily-plan') {
      return Promise.resolve(Response.json({ data: rulesPlanFixture }));
    }
    // Ask answers too, so its POST never falls through to forecast JSON.
    if (url.pathname === '/api/v1/assistant/answer') {
      return Promise.resolve(Response.json({ data: aiAskFixture }));
    }
    return forecast(url.searchParams.get('latitude'));
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

// The plan builds by itself once Today shows a place: let it finish.
async function buildPlan() {
  await flush();
}

function ok(series: ForecastSeries = forecastFixture) {
  return () => Promise.resolve(Response.json({ data: series }));
}

function planPosts(fetchSpy: ReturnType<typeof routeFetch>) {
  return fetchSpy.mock.calls.filter(
    ([input]) => urlOf(input).pathname === '/api/v1/recommendations/daily-plan',
  );
}

function askPosts(fetchSpy: ReturnType<typeof routeFetch>) {
  return fetchSpy.mock.calls.filter(
    ([input]) => urlOf(input).pathname === '/api/v1/assistant/answer',
  );
}

const askBody = (call: Parameters<typeof fetch> | undefined) =>
  JSON.parse(call![1]!.body as string) as Record<string, unknown>;

function forecastCalls(fetchSpy: ReturnType<typeof routeFetch>) {
  return fetchSpy.mock.calls.filter(
    ([input]) => urlOf(input).pathname === '/api/v1/air-quality/forecast',
  );
}

const WELCOME_1 = 'Where should we check air quality?';

async function choosePlace(optionIndex = 0, { skipWelcome = true } = {}) {
  // Let a saved-answers check and any redirect settle first.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  // Without a place the app opens Welcome; once a place is set, the search
  // lives in the place dialog.
  const onWelcome = screen.queryByRole('heading', {
    level: 1,
    name: WELCOME_1,
  });
  if (
    !onWelcome &&
    !screen.queryByRole('combobox', {
      name: 'Search for a city or area in India',
    })
  ) {
    fireEvent.click(
      screen.getByRole('button', { name: /^(Change place: |Choose a place$)/ }),
    );
  }
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
  if (onWelcome && skipWelcome) {
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

async function goTo(name: string) {
  fireEvent.click(screen.getByRole('link', { name }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('AppShell', () => {
  beforeAll(stubDialog);

  beforeEach(() => {
    // jsdom has no scrolling; navigation scrolls to the top.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
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

  // Phase 5: with no place, Welcome replaces the old no-place card.
  it('with no place and no session, Today sends you to Welcome', async () => {
    const before = window.history.length;
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(window.location.pathname).toBe('/app/welcome');
    expect(window.history.length).toBe(before);
    expect(
      screen.getByRole('heading', { level: 1, name: WELCOME_1 }),
    ).toBeDefined();
    expect(forecastCalls(fetchSpy)).toHaveLength(0);
    vi.useRealTimers();
    await expectNoAxeViolations(document.body);
  });

  it('shows the labelled model forecast for the chosen place', async () => {
    routeFetch(ok());
    const { container } = render(<AppShell />);

    await choosePlace();

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Today in Pune, Maharashtra',
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
      screen.getByText('Official CPCB observations are not connected yet.'),
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
    expect(screen.getByText(FORECAST_STALE).closest('details')).toBeNull();
    // The figures stay at load time.
    expect(
      screen.getByText(
        `Values for ${formatTime(forecastFixture.hours[0].time)}`,
      ),
    ).toBeDefined();
  });

  // Owner's call: the verdict refreshes when the plan does, so both rest
  // on the same forecast.
  it('reloads the forecast once it is an hour old, while Today shows', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await flush();
    const forecasts = forecastCalls(fetchSpy).length;
    expect(planPosts(fetchSpy)).toHaveLength(1);

    // Away on My Profile, nothing reloads.
    await goTo('My Profile');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60_000);
    });
    expect(forecastCalls(fetchSpy)).toHaveLength(forecasts);

    await goTo('Today');
    await flush();
    expect(forecastCalls(fetchSpy)).toHaveLength(forecasts + 1);
    expect(planPosts(fetchSpy)).toHaveLength(2);

    // Once, not again a few minutes later.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(forecastCalls(fetchSpy)).toHaveLength(forecasts + 1);
  });

  // Backdrop design §5.2 and §5.5.
  const ABOVE: typeof forecastFixture = {
    ...forecastFixture,
    airCheck: {
      level: 'elevated',
      windowStart: forecastFixture.hours[0]!.time,
      checks: [
        {
          pollutant: 'PM2_5',
          status: 'above_limit',
          average24h: 72.4,
          limit: 60,
        },
        {
          pollutant: 'PM10',
          status: 'within_limit',
          average24h: 80,
          limit: 100,
        },
      ],
    },
  };
  const backdrop = () => document.querySelector('[data-air]');
  const note = () => screen.queryByText(/^Background: model forecast/);

  it('the backdrop is neutral before a place is chosen', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await flush();
    expect(window.location.pathname).toBe('/app/welcome');
    expect(backdrop()?.getAttribute('data-air')).toBe('unknown');
    expect(note()).toBeNull();
  });

  it('the backdrop follows the forecast on every page', async () => {
    routeFetch(ok(ABOVE), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await flush();
    const root = backdrop();
    expect(root?.getAttribute('data-air')).toBe('above');
    expect(note()?.textContent).toBe(
      'Background: model forecast for Pune, Maharashtra. Above the limit.',
    );
    expect(note()?.closest('footer')).not.toBeNull();

    // A page with no other air words still names the level.
    await goTo('Better Habits');
    expect(backdrop()).toBe(root);
    expect(note()?.textContent).toBe(
      'Background: model forecast for Pune, Maharashtra. Above the limit.',
    );
  });

  it('the hourly reload keeps the backdrop and its note', async () => {
    let calls = 0;
    routeFetch(
      () => (++calls === 1 ? ok(ABOVE)() : new Promise<Response>(() => {})),
      planRoutes(),
    );
    render(<AppShell />);
    await choosePlace();
    await flush();
    expect(backdrop()?.getAttribute('data-air')).toBe('above');

    // An hour on, Today reloads; the new forecast never arrives here.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60_000);
    });
    await flush();
    expect(calls).toBe(2);
    expect(backdrop()?.getAttribute('data-air')).toBe('above');
    expect(note()?.textContent).toMatch(/ Not current\.$/);
  });

  // The backdrop review: My Home rebuilds its plan hourly, so its sky
  // reloads with it and never contradicts the plan's air words.
  it('the hourly reload refreshes the backdrop on My Home too', async () => {
    let calls = 0;
    routeFetch(() => (++calls === 1 ? ok(ABOVE)() : ok()()), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await flush();
    await goTo('My Home');
    expect(backdrop()?.getAttribute('data-air')).toBe('above');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60_000);
    });
    await flush();
    expect(calls).toBe(2);
    expect(backdrop()?.getAttribute('data-air')).toBe('unknown');
    // The fixture's retrievedAt is fixed, so it also reads "Not current."
    expect(note()?.textContent).toMatch(
      /^Background: model forecast for Pune, Maharashtra\. No data\./,
    );
  });

  // Final review: weather over an hour past its hour stops drawing on a
  // page that never reloads; the air look stays, marked "Not current.".
  it('old weather leaves the backdrop on a page that never reloads', async () => {
    routeFetch(ok(ABOVE), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await flush();
    await goTo('Better Habits');
    expect(backdrop()?.getAttribute('data-clouds')).toBe('1');
    expect(backdrop()?.getAttribute('data-air')).toBe('above');

    // The fixture's weather is for 17:00; 17:30 + 91 min = 19:01.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(91 * 60_000);
    });
    expect(backdrop()?.getAttribute('data-clouds')).toBe('0');
    expect(backdrop()?.getAttribute('data-air')).toBe('above');
    expect(note()?.textContent).toMatch(/ Not current\.$/);
  });

  // Final review: on My Home, a plan rebuilt on a newer forecast than the
  // backdrop's reloads the backdrop once, so the sky and the plan's air
  // words rest on the same data. Never a loop, even when the reload
  // brings back the older forecast.
  it('My Home reloads the sky once when its plan rests on a newer forecast', async () => {
    const newer = {
      ...rulesPlanFixture,
      forecast: {
        ...rulesPlanFixture.forecast!,
        retrievedAt: '2026-11-17T17:20:00.000Z',
      },
    };
    const fetchSpy = routeFetch(
      ok(),
      planRoutes(() => Promise.resolve(Response.json({ data: newer }))),
    );
    render(<AppShell />);
    await choosePlace();
    await flush();
    const before = forecastCalls(fetchSpy).length;

    await goTo('My Home');
    await flush();
    expect(forecastCalls(fetchSpy)).toHaveLength(before + 1);
    await flush();
    await flush();
    expect(forecastCalls(fetchSpy)).toHaveLength(before + 1);
  });

  // Review: two cache misses at once stamp times seconds apart; those are
  // the same model run, so no reload.
  it('My Home keeps the sky when its plan is only seconds newer', async () => {
    const seconds = {
      ...rulesPlanFixture,
      forecast: {
        ...rulesPlanFixture.forecast!,
        retrievedAt: '2026-11-17T17:05:30.000Z',
      },
    };
    const fetchSpy = routeFetch(
      ok(),
      planRoutes(() => Promise.resolve(Response.json({ data: seconds }))),
    );
    render(<AppShell />);
    await choosePlace();
    await flush();
    const before = forecastCalls(fetchSpy).length;

    await goTo('My Home');
    await flush();
    expect(forecastCalls(fetchSpy)).toHaveLength(before);
  });

  it('a failed forecast leaves a neutral backdrop', async () => {
    routeFetch(
      () =>
        Promise.resolve(
          Response.json(
            { error: { code: 'PROVIDER_ERROR', message: 'Provider down.' } },
            { status: 502 },
          ),
        ),
      planRoutes(),
    );
    render(<AppShell />);
    await choosePlace();
    await flush();
    expect(backdrop()?.getAttribute('data-air')).toBe('unknown');
    expect(note()).toBeNull();
  });

  // Final review: the old place's look never shows under a new place.
  it('a new place starts from the silhouette, never the old look', async () => {
    let calls = 0;
    let release: (response: Response) => void = () => {};
    routeFetch(
      () =>
        ++calls === 1
          ? ok(ABOVE)()
          : new Promise<Response>((resolve) => {
              release = resolve;
            }),
      planRoutes(),
    );
    render(<AppShell />);
    await choosePlace(0);
    await flush();
    expect(backdrop()?.getAttribute('data-air')).toBe('above');

    await choosePlace(1);
    expect(calls).toBe(2);
    expect(backdrop()?.getAttribute('data-air')).toBe('loading');
    expect(note()).toBeNull();

    await act(async () => {
      release(Response.json({ data: forecastFixture }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(backdrop()?.getAttribute('data-air')).toBe('unknown');
    expect(note()).not.toBeNull();
  });

  // Final review: a reload that fails drops the old look and its note.
  it('a failed hourly reload leaves a neutral backdrop', async () => {
    let calls = 0;
    routeFetch(
      () =>
        ++calls === 1
          ? ok(ABOVE)()
          : Promise.resolve(
              Response.json(
                {
                  error: { code: 'PROVIDER_ERROR', message: 'Provider down.' },
                },
                { status: 502 },
              ),
            ),
      planRoutes(),
    );
    render(<AppShell />);
    await choosePlace();
    await flush();
    expect(backdrop()?.getAttribute('data-air')).toBe('above');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60_000);
    });
    await flush();
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(backdrop()?.getAttribute('data-air')).toBe('unknown');
    expect(note()).toBeNull();
  });

  it('never shows an AQI number', async () => {
    routeFetch(ok());
    const { container } = render(<AppShell />);

    await choosePlace();

    // Statements that the CPCB AQI is not shown, and the CPCB source's
    // name, are the only allowed mentions; longest first.
    const text = [
      'We do not calculate the CPCB National AQI',
      "We don't calculate an AQI",
      'Not the CPCB National AQI',
      'CPCB National AQI',
    ].reduce(
      (rest, allowed) => rest.replaceAll(allowed, ''),
      container.textContent ?? '',
    );
    expect(text).not.toMatch(/\bAQI\b/);
  });

  it('Today hides the search once a place is set; Change place opens the dialog', async () => {
    routeFetch(ok());
    const { container } = render(<AppShell />);

    await choosePlace();
    expect(
      screen.queryByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Change place: / }));

    expect(container.querySelector('dialog')?.open).toBe(true);
    expect(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeDefined();
  });

  it('choosing a place in the dialog closes it and loads that place', async () => {
    routeFetch(ok());
    const { container } = render(<AppShell />);
    await choosePlace(0);
    const first = screen.getByRole('heading', {
      level: 1,
      name: /^Today in /,
    }).textContent;

    await choosePlace(1);

    expect(container.querySelector('dialog')?.open).toBe(false);
    expect(
      screen.getByRole('heading', { level: 1, name: /^Today in / }).textContent,
    ).not.toBe(first);
    expect(
      screen.getByRole('button', { name: /^Change place: / }).textContent,
    ).not.toContain(first!.replace('Today in ', ''));
  });

  it('reads verdict, recommendation, help, ask, then the details', async () => {
    routeFetch(ok());
    render(<AppShell />);

    await choosePlace();
    await flush();

    const order = [
      screen.getByRole('heading', {
        level: 2,
        name: verdictFrom(forecastFixture.airCheck).title,
      }),
      screen.getByRole('heading', { name: 'Your recommendation for today' }),
      screen.getByRole('heading', { name: 'What would you like help with?' }),
      screen.getByRole('heading', { name: 'Ask AirAware anything' }),
      screen.getByRole('heading', { name: 'Air quality details' }),
      screen.getByText('Your city, the next two days'),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(
      screen.getByText('Your city, the next two days').closest('details'),
    ).not.toBeNull();
  });

  it('the ask box opens Ask with the question kept out of the address', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace();

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Ask about your air, home or day' }),
      { target: { value: 'Should I run the purifier tonight?' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await flush();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ask AirAware' }),
    ).toBeDefined();
    expect(window.location.href).not.toMatch(/purifier/i);
  });

  // Phase 7: Today hands questions and topics to Ask.
  // Guided chat (Task 4): an answer given in Ask counts everywhere.
  const offering = {
    ...aiAskFixture,
    topic: 'outdoors' as const,
    followUps: [{ field: 'routine.outdoorExercise', changes: ['yes'] }],
  };
  const offeringRoutes: Parameters<typeof routeFetch>[1] = (url) =>
    url.pathname === '/api/v1/assistant/answer'
      ? Promise.resolve(Response.json({ data: offering }))
      : undefined;
  const exerciseQuestion = () =>
    screen.queryByRole('group', { name: 'Do you exercise outdoors?' });

  it("an answer given in Ask reaches My Profile and Today's plan", async () => {
    const fetchSpy = routeFetch(ok(), offeringRoutes);
    render(<AppShell />);
    await choosePlace();
    await goTo('Ask AirAware');
    fireEvent.click(screen.getByRole('button', { name: 'Outdoor activities' }));
    await flush();

    fireEvent.click(
      within(exerciseQuestion()!).getByRole('button', { name: 'Yes' }),
    );
    await flush();
    expect(screen.getByText('You answered: Yes.')).toBeDefined();

    await goTo('My Profile');
    expect(
      screen.getByLabelText<HTMLSelectElement>('Do you exercise outdoors?')
        .value,
    ).toBe('yes');
    await goTo('Today');
    await flush();
    const last = planPosts(fetchSpy).at(-1);
    expect(JSON.parse(last![1]!.body as string)).toMatchObject({
      householdContext: { routine: { outdoorExercise: true } },
    });
  });

  // Review Focus 2, through the shell: saved answers that arrive after an
  // answer given in Ask fill in around it and never undo it.
  it('a late saved-answers load keeps an answer given in Ask', async () => {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    window.history.replaceState(
      null,
      '',
      '/app/ask?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    let release!: () => void;
    const fetchSpy = routeFetch(ok(), (url, init) =>
      url.pathname === '/api/v1/profile/preferences'
        ? new Promise((resolve) => {
            release = () =>
              resolve(
                Response.json({
                  data: {
                    context: {
                      routine: { outdoorExercise: false, commuteMode: 'car' },
                    },
                    place: null,
                    updatedAt: 'x',
                  },
                }),
              );
          })
        : offeringRoutes!(url, init),
    );
    render(<AppShell />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Outdoor activities' }));
    await flush();
    fireEvent.click(
      within(exerciseQuestion()!).getByRole('button', { name: 'Yes' }),
    );
    await flush();

    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flush();

    await goTo('My Profile');
    expect(
      screen.getByLabelText<HTMLSelectElement>('Do you exercise outdoors?')
        .value,
    ).toBe('yes');
    expect(
      screen.getByLabelText<HTMLSelectElement>(
        'How do you usually travel to work or college?',
      ).value,
    ).toBe('car');
    await goTo('Today');
    await flush();
    const last = planPosts(fetchSpy).at(-1);
    expect(JSON.parse(last![1]!.body as string)).toMatchObject({
      householdContext: {
        routine: { outdoorExercise: true, commuteMode: 'car' },
      },
    });
  });

  // Review Focus 4.
  it('a question back disappears once My Profile answers it', async () => {
    routeFetch(ok(), offeringRoutes);
    render(<AppShell />);
    await choosePlace();
    await goTo('Ask AirAware');
    fireEvent.click(screen.getByRole('button', { name: 'Outdoor activities' }));
    await flush();
    expect(exerciseQuestion()).not.toBeNull();

    await goTo('My Profile');
    fireEvent.change(screen.getByLabelText('Do you exercise outdoors?'), {
      target: { value: 'no' },
    });
    await goTo('Ask AirAware');

    expect(exerciseQuestion()).toBeNull();
  });

  // Final review: with a thread already there, a question from Today lands
  // at the end; its heading takes focus, so it is in view and announced.
  it('a question from Today, after earlier ones, takes focus on Ask', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace();
    await goTo('Ask AirAware');
    fireEvent.click(screen.getByRole('button', { name: 'Outdoor activities' }));
    await flush();
    await goTo('Today');

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Ask about your air, home or day' }),
      { target: { value: 'Should I run the purifier tonight?' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await flush();

    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        level: 2,
        name: 'You asked: Should I run the purifier tonight?',
      }),
    );
  });

  it("Today's ask box asks once, and the answer shows on Ask", async () => {
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
    await choosePlace();

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Ask about your air, home or day' }),
      { target: { value: 'Should I run the purifier tonight?' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await flush();

    expect(askPosts(fetchSpy)).toHaveLength(1);
    expect(askBody(askPosts(fetchSpy)[0])).toMatchObject({
      question: 'Should I run the purifier tonight?',
    });
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'You asked: Should I run the purifier tonight?',
      }),
    ).toBeDefined();
    expect(screen.getByText(aiAskFixture.summary!)).toBeDefined();
  });

  it('"Outdoor activities" on Today asks that topic; the address keeps only the place', async () => {
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
    await choosePlace();
    const search = window.location.search;

    fireEvent.click(screen.getByRole('link', { name: /^Outdoor activities/ }));
    await flush();

    expect(window.location.pathname).toBe('/app/ask');
    expect(window.location.search).toBe(search);
    expect(askPosts(fetchSpy)).toHaveLength(1);
    expect(askBody(askPosts(fetchSpy)[0])).toMatchObject({
      topic: 'outdoors',
    });
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'You asked: Outdoor activities',
      }),
    ).toBeDefined();
  });

  it('an answer still coming finishes after leaving Ask', async () => {
    let reply: (response: Response) => void = () => {};
    routeFetch(ok(), (url) =>
      url.pathname === '/api/v1/assistant/answer'
        ? new Promise((resolve) => {
            reply = resolve;
          })
        : undefined,
    );
    render(<AppShell />);
    await choosePlace();
    await goTo('Ask AirAware');
    fireEvent.click(screen.getByRole('button', { name: 'Indoor air' }));

    await goTo('My Home');
    await act(async () => {
      reply(Response.json({ data: aiAskFixture }));
    });
    await flush();
    await goTo('Ask AirAware');

    expect(screen.getByText(aiAskFixture.summary!)).toBeDefined();
  });

  it('a new place clears the answers', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace();
    await goTo('Ask AirAware');
    fireEvent.click(screen.getByRole('button', { name: 'Indoor air' }));
    await flush();
    expect(
      screen.getByRole('heading', { level: 2, name: 'You asked: Indoor air' }),
    ).toBeDefined();

    await choosePlace(1);

    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'You asked: Indoor air',
      }),
    ).toBeNull();
  });

  // Review Focus 1: a typed question goes only into the Ask POST body.
  it('a typed question stays out of the address, history, storage and other requests', async () => {
    const MARKER = 'zq7marker';
    const fetchSpy = routeFetch(ok());
    render(<AppShell />);
    await choosePlace();
    const send = (text: string) => {
      fireEvent.change(
        screen.getByRole('textbox', {
          name: 'Ask about your air, home or day',
        }),
        { target: { value: text } },
      );
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    };

    send(`walk ${MARKER} today`); // from Today
    await flush();
    send(`windows ${MARKER}`); // on Ask
    await flush();

    expect(askPosts(fetchSpy)).toHaveLength(2);
    expect(window.location.href).not.toContain(MARKER);
    expect(JSON.stringify(window.history.state)).not.toContain(MARKER);
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)!;
        expect(key + storage.getItem(key)).not.toContain(MARKER);
      }
    }
    for (const [input, init] of fetchSpy.mock.calls) {
      const url = urlOf(input);
      expect(url.href).not.toContain(MARKER);
      if (url.pathname !== '/api/v1/assistant/answer') {
        // The app sends JSON strings only.
        expect(typeof init?.body === 'string' ? init.body : '').not.toContain(
          MARKER,
        );
      }
    }
    for (const field of document.querySelectorAll('input[name]')) {
      expect((field as HTMLInputElement).value).not.toContain(MARKER);
    }
  });

  it('reloads the forecast once it is an hour old, while Ask shows', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await flush();
    await goTo('Ask AirAware');
    const forecasts = forecastCalls(fetchSpy).length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61 * 60_000);
    });
    await flush();

    expect(forecastCalls(fetchSpy)).toHaveLength(forecasts + 1);
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
        level: 1,
        name: 'Today in Pune, Maharashtra',
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

  it('no coordinates outside the details', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Delhi&lat=19.08&lon=72.88',
    );
    routeFetch(ok());
    const { container } = render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const copy = container.cloneNode(true) as HTMLElement;
    for (const details of copy.querySelectorAll('details')) details.remove();
    expect(copy.textContent).not.toContain('19.08');
  });

  // The tab says what the nav and the H1 say.
  it('names the tab Today', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace();

    expect(document.title).toBe('Today | AirAware AI');
  });

  it('greets and names the place in the H1', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Today in Pune, Maharashtra');
    expect(
      screen.getByText(/^Good (morning|afternoon|evening)$/),
    ).toBeDefined();
  });

  it('a forecast error keeps the recommendation', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(
      () =>
        Promise.resolve(
          Response.json(
            { error: { code: 'PROVIDER_ERROR', message: 'Provider down.' } },
            { status: 502 },
          ),
        ),
      planRoutes(),
    );
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await buildPlan();

    expect(
      screen.getByRole('heading', { name: "We couldn't load the forecast" }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Your recommendation for today',
      }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Consider an indoor alternative for exercise',
      }),
    ).toBeDefined();
    // Phase 10 final review: no verdict on the page, so the plan names the
    // air it used.
    expect(
      screen.getByText(
        /^Today: Forecast .* · Model forecast · Open-Meteo · retrieved /,
      ),
    ).toBeDefined();
  });

  it('with the verdict shown, the plan leaves the air to it', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    // The verdict and the plan rest on the same level (B5).
    routeFetch(
      () =>
        Promise.resolve(
          Response.json({
            data: { ...forecastFixture, airCheck: rulesPlanFixture.air },
          }),
        ),
      planRoutes(),
    );
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await buildPlan();

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Consider an indoor alternative for exercise',
      }),
    ).toBeDefined();
    expect(
      screen.queryByText(
        /^Today: Forecast .* · Model forecast · Open-Meteo · retrieved /,
      ),
    ).toBeNull();
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

  it('Today has no household form', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace();

    expect(
      screen.queryByRole('heading', { name: 'Your household (optional)' }),
    ).toBeNull();
    await goTo('My Profile');
    expect(
      screen.getByRole('heading', { name: 'Your household (optional)' }),
    ).toBeDefined();
  });

  it('answers survive leaving My Profile', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await goTo('My Profile');
    fireEvent.change(screen.getByLabelText('Do you exercise outdoors?'), {
      target: { value: 'yes' },
    });

    await goTo('Today');
    await goTo('My Profile');

    expect(
      (screen.getByLabelText('Do you exercise outdoors?') as HTMLSelectElement)
        .value,
    ).toBe('yes');
  });

  // Final review, Critical 1: the shell keeps the plan (spec §5).
  // Final review, Important 1: a returning user's reload built with no
  // answers, then again once the saved ones arrived.
  it('a returning user builds once, with the saved answers', async () => {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    const saved = { routine: { outdoorExercise: true } };
    const fetchSpy = routeFetch(ok(), (url) =>
      url.pathname === '/api/v1/profile/preferences'
        ? new Promise((resolve) => {
            // A network round trip.
            setTimeout(
              () =>
                resolve(
                  Response.json({
                    data: { context: saved, place: null, updatedAt: 'x' },
                  }),
                ),
              200,
            );
          })
        : undefined,
    );
    render(<AppShell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await flush();

    const posts = planPosts(fetchSpy);
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0]?.[1]?.body as string).householdContext).toEqual(
      saved,
    );
  });

  it('/app/habits shows Better Habits', async () => {
    window.history.replaceState(null, '', '/app/habits');
    routeFetch(ok());
    render(<AppShell />);
    await flush();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Better Habits' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Energy use' }),
    ).toBeDefined();
    expect(
      screen.queryByText('This part of AirAware is on its way.'),
    ).toBeNull();
  });

  it('/app/home shows My Home, not the placeholder', async () => {
    window.history.replaceState(
      null,
      '',
      '/app/home?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await flush();
    await flush();

    expect(
      screen.getByRole('heading', { level: 1, name: 'My Home' }),
    ).toBeDefined();
    expect(
      screen.queryByText('This part of AirAware is on its way.'),
    ).toBeNull();
    // Today's plan reaches My Home.
    expect(
      screen.getByRole('region', { name: 'Today, for your home' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Cooking and smoke' }),
    ).toBeDefined();
  });

  // Phase 8: My Home shows today's indoor cards, so it builds the plan too.
  it('My Home builds the plan once', async () => {
    window.history.replaceState(
      null,
      '',
      '/app/home?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await flush();
    await flush();
    expect(planPosts(fetchSpy)).toHaveLength(1);

    await goTo('Today');
    await flush();
    expect(planPosts(fetchSpy)).toHaveLength(1);
  });

  it('a built plan survives leaving Today', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await buildPlan();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();

    await goTo('My Profile');
    await goTo('Today');

    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();
    expect(
      fetchSpy.mock.calls.filter(
        ([input]) =>
          urlOf(input).pathname === '/api/v1/recommendations/daily-plan',
      ),
    ).toHaveLength(1);
  });

  it('a plan still building finishes after leaving Today', async () => {
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
    await choosePlace();

    await goTo('Better Habits');
    await act(async () => {
      reply(Response.json({ data: rulesPlanFixture }));
    });
    await flush();
    await goTo('Today');

    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();
  });

  // Final review, Important 2: a remount reloaded saved answers over a cleared one.
  it('My Profile loads saved answers once', async () => {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await goTo('My Profile');
    await flush();

    await goTo('Today');
    await goTo('My Profile');
    await flush();

    expect(
      fetchSpy.mock.calls.filter(
        ([input]) => urlOf(input).pathname === '/api/v1/profile/preferences',
      ),
    ).toHaveLength(1);
  });

  // Final review, Important 1.
  it('after Back, the address names the place shown', async () => {
    routeFetch(ok());
    render(<AppShell />);
    await choosePlace(0);
    const first = window.location.search;
    await goTo('My Profile');
    await choosePlace(1);
    const second = window.location.search;
    expect(second).not.toBe(first);

    // Back lands on the older entry, which still holds the first place.
    act(() => {
      window.history.pushState(null, '', '/app' + first);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe(second);
  });

  it('the logo goes to /app and keeps the place', () => {
    window.history.replaceState(
      null,
      '',
      '/app/ask?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    const header = screen.getByRole('banner');
    expect(
      within(header)
        .getByRole('link', { name: 'AirAware AI' })
        .getAttribute('href'),
    ).toBe('/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86');
  });

  it('header order is the logo, the place chip, then the navigation', () => {
    routeFetch(ok());
    render(<AppShell />);
    const header = screen.getByRole('banner');
    const logo = within(header).getByRole('link', { name: 'AirAware AI' });
    const chip = within(header).getByRole('button', {
      name: /^(Change place: |Choose a place$)/,
    });
    const nav = within(header).getByRole('navigation', { name: 'Main' });
    expect(
      logo.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      chip.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('an unknown app page becomes Today for the same place, by replace', () => {
    window.history.replaceState(
      null,
      '',
      '/app/nope?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    const before = window.history.length;
    routeFetch(ok());
    render(<AppShell />);

    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe(
      '?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    expect(window.history.length).toBe(before);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today in Pune, Maharashtra',
      }),
    ).toBeDefined();
  });

  it('reads the place on any app path', async () => {
    window.history.replaceState(
      null,
      '',
      '/app/profile?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    expect(
      screen.getByRole('button', { name: 'Change place: Pune, Maharashtra' }),
    ).toBeDefined();

    await goTo('Today');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today in Pune, Maharashtra',
      }),
    ).toBeDefined();
  });

  const SAVED_PUNE = {
    label: 'Pune, Maharashtra',
    latitude: 18.52,
    longitude: 73.86,
  };

  // A session whose saved preferences are `saved`; PUT bodies are recorded.
  function withSaved(saved: unknown, puts: unknown[] = []): OtherResponder {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    const plans = planRoutes();
    return (url, init) => {
      if (url.pathname === '/api/v1/profile/preferences') {
        if (init?.method === 'PUT') {
          const body = JSON.parse(init.body as string);
          puts.push(body);
          return Promise.resolve(
            Response.json({
              data: { context: {}, place: null, updatedAt: 'x', ...body },
            }),
          );
        }
        return Promise.resolve(Response.json({ data: saved }));
      }
      if (url.pathname === '/api/v1/plans') {
        return Promise.resolve(Response.json({ data: [] }));
      }
      return plans(url, init);
    };
  }

  it('a remembered place opens Today without Welcome', async () => {
    window.history.replaceState(null, '', '/app');
    routeFetch(
      ok(),
      withSaved({ context: {}, place: SAVED_PUNE, updatedAt: 'x' }),
    );
    render(<AppShell />);
    await flush();

    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toContain('place=Pune');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today in Pune, Maharashtra',
      }),
    ).toBeDefined();
  });

  it('Welcome starts from the saved answers', async () => {
    routeFetch(
      ok(),
      withSaved({
        context: { routine: { outdoorExercise: true } },
        place: null,
        updatedAt: 'x',
      }),
    );
    render(<AppShell />);
    await flush();
    await choosePlace(0, { skipWelcome: false });

    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Outdoor exercise',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it('finishing with Remember saves the answers and the searched place', async () => {
    const puts: unknown[] = [];
    routeFetch(ok(), withSaved(null, puts));
    session.currentToken.mockResolvedValue(null);
    render(<AppShell />);
    await flush();
    await choosePlace(0, { skipWelcome: false });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Outdoor exercise' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Remember on this device' }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'See my air' }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(session.tokenForSave).toHaveBeenCalledTimes(1);
    expect(puts).toEqual([
      {
        context: { routine: { outdoorExercise: true } },
        place: SAVED_PUNE,
      },
    ]);
    expect(window.location.pathname).toBe('/app');
  });

  it('a device location is never saved', async () => {
    const puts: unknown[] = [];
    routeFetch(ok(), withSaved(null, puts));
    session.currentToken.mockResolvedValue(null);
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
    render(<AppShell />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Remember on this device' }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'See my air' }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(puts).toEqual([{ context: {} }]);
    expect(window.location.search).toBe('');
  });

  it('a new searched place replaces the remembered one', async () => {
    const puts: unknown[] = [];
    window.history.replaceState(null, '', '/app');
    routeFetch(
      ok(),
      withSaved({ context: {}, place: SAVED_PUNE, updatedAt: 'x' }, puts),
    );
    render(<AppShell />);
    await flush();
    await choosePlace(1);
    await flush();

    expect(puts).toEqual([
      {
        place: { label: 'Puneta, Rajasthan', latitude: 26.3, longitude: 76.29 },
      },
    ]);
  });

  it('Forget this place clears it', async () => {
    const puts: unknown[] = [];
    window.history.replaceState(null, '', '/app');
    routeFetch(
      ok(),
      withSaved({ context: {}, place: SAVED_PUNE, updatedAt: 'x' }, puts),
    );
    render(<AppShell />);
    await flush();
    await goTo('My Profile');
    expect(
      screen.getByText('Remembered place: Pune, Maharashtra'),
    ).toBeDefined();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Forget this place' }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(puts).toEqual([{ place: null }]);
    expect(
      screen.getByText('This place is no longer remembered.'),
    ).toBeDefined();
  });

  it('the invite opens Welcome at step 2; Not now hides it', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await flush();

    fireEvent.click(
      screen.getByRole('link', { name: 'Make it personal: 2 quick questions' }),
    );
    expect(window.location.pathname).toBe('/app/welcome');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'What does your typical day look like?',
      }),
    ).toBeDefined();

    await goTo('Today');
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(
      screen.queryByRole('link', {
        name: 'Make it personal: 2 quick questions',
      }),
    ).toBeNull();
  });

  // Phase 6 proof: on a 320×640 phone the invite pushed the verdict off the
  // first screen. Today answers "How is my air?" first.
  it('the verdict and recommendation come before the invite', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await flush();

    const invite = screen.getByRole('link', {
      name: 'Make it personal: 2 quick questions',
    });
    for (const before of [
      screen.getByRole('heading', {
        level: 2,
        name: verdictFrom(forecastFixture.airCheck).title,
      }),
      screen.getByRole('heading', { name: 'Your recommendation for today' }),
    ]) {
      expect(
        before.compareDocumentPosition(invite) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  // B8: the invite is a quiet outlined link after the help choices.
  it('the invite sits after the help choices and is not a filled button', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await flush();

    const invite = screen.getByRole('link', {
      name: 'Make it personal: 2 quick questions',
    });
    expect(invite.className).not.toContain('bg-primary');
    expect(invite.className).toContain('border-text-dark');
    const help = screen.getByRole('heading', {
      name: 'What would you like help with?',
    });
    const ask = screen.getByRole('heading', { name: 'Ask AirAware anything' });
    expect(
      help.compareDocumentPosition(invite) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      invite.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // ST-01a: one tap, one forecast request, focus on the place heading.
  it('"Reload forecast" reloads once and moves focus to the heading', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    const spy = routeFetch(ok());
    render(<AppShell />);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(36 * 60_000);
    });
    const forecasts = () =>
      spy.mock.calls.filter(
        ([input]) => urlOf(input).pathname === '/api/v1/air-quality/forecast',
      ).length;
    const before = forecasts();

    fireEvent.click(screen.getByRole('button', { name: 'Reload forecast' }));

    expect(forecasts()).toBe(before + 1);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today in Pune, Maharashtra',
      }),
    );
  });

  // Final review, Important 1: a remount reloaded saved answers over Welcome's.
  it('answers cleared in Welcome stay cleared', async () => {
    const fetchSpy = routeFetch(
      ok(),
      withSaved({
        context: { routine: { outdoorExercise: true } },
        place: null,
        updatedAt: 'x',
      }),
    );
    render(<AppShell />);
    await flush();
    await choosePlace(0, { skipWelcome: false });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Outdoor exercise' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'See my air' }));
      await vi.advanceTimersByTimeAsync(0);
    });
    await goTo('My Profile');
    await flush();

    expect(
      (screen.getByLabelText('Do you exercise outdoors?') as HTMLSelectElement)
        .value,
    ).toBe('');
    expect(
      fetchSpy.mock.calls.filter(
        ([input, init]) =>
          urlOf(input).pathname === '/api/v1/profile/preferences' &&
          init?.method !== 'PUT',
      ),
    ).toHaveLength(1);
  });

  // Final review, Important 2.
  it('Welcome opened at its own address starts from the saved answers', async () => {
    window.history.replaceState(
      null,
      '',
      '/app/welcome?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(
      ok(),
      withSaved({
        context: { routine: { outdoorExercise: true } },
        place: null,
        updatedAt: 'x',
      }),
    );
    render(<AppShell />);
    await flush();

    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Outdoor exercise',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  // Final review, Important 3.
  it('after Welcome, focus lands on the place heading', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86',
    );
    routeFetch(ok());
    render(<AppShell />);
    await flush();
    fireEvent.click(
      screen.getByRole('link', { name: 'Make it personal: 2 quick questions' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today in Pune, Maharashtra',
      }),
    );
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
        level: 1,
        name: 'Today in Pune, Maharashtra',
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
        level: 1,
        name: 'Today in Puneta, Rajasthan',
      }),
    ).toBeDefined();
    expect(screen.getByTestId('metric-PM2_5').textContent).toContain('99');
    expect(screen.getByTestId('metric-PM2_5').textContent).not.toContain('48');
  });

  it('builds the plan from the answers on screen without saving them', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();

    await goTo('My Profile');
    fireEvent.change(screen.getByLabelText('Do you have an air purifier?'), {
      target: { value: 'yes' },
    });
    await goTo('Today');
    await buildPlan();

    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();
    // Once on arrival, once more after the answers changed.
    const posts = planPosts(fetchSpy);
    expect(posts).toHaveLength(2);
    expect(JSON.parse(posts[1]?.[1]?.body as string)).toEqual({
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      householdContext: { home: { airPurifier: true } },
    });
    expect(session.tokenForSave).not.toHaveBeenCalled();
  });

  it('builds afresh for a new place', async () => {
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace(0);
    await buildPlan();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();

    await choosePlace(1);
    await buildPlan();

    const posts = planPosts(fetchSpy);
    expect(posts).toHaveLength(2);
    const label = (i: number) =>
      JSON.parse(posts[i]?.[1]?.body as string).place.label;
    expect(label(1)).not.toBe(label(0));
  });

  // Review Focus 2.
  it('never shows an old place plan under a new place', async () => {
    const replies: Array<(response: Response) => void> = [];
    routeFetch(
      ok(),
      planRoutes(
        () =>
          new Promise((resolve) => {
            replies.push(resolve);
          }),
      ),
    );
    render(<AppShell />);
    await choosePlace(0);

    await choosePlace(1);
    await act(async () => {
      replies[0]!(Response.json({ data: rulesPlanFixture }));
    });
    await flush();

    expect(screen.queryByText(RULES_MADE_BY)).toBeNull();
    // The new place's own plan is still on its way.
    expect(replies).toHaveLength(2);
    expect(
      screen.getByText('Building your plan. This can take up to 30 seconds.'),
    ).toBeDefined();
  });

  it('a plan error offers Try again and keeps the verdict', async () => {
    routeFetch(
      ok(),
      planRoutes(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'INTERNAL_ERROR', message: 'x' } },
            { status: 500 },
          ),
        ),
      ),
    );
    render(<AppShell />);
    await choosePlace();
    await buildPlan();

    expect(
      screen.getByRole('heading', {
        name: "We couldn't build your recommendation.",
      }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: verdictFrom(forecastFixture.airCheck).title,
      }),
    ).toBeDefined();
  });

  // Review Focus 1 (the plan area part).
  it('starts the plan afresh after "Delete everything"', async () => {
    session.available = true;
    session.currentToken.mockResolvedValue('tok');
    const fetchSpy = routeFetch(ok(), planRoutes());
    render(<AppShell />);
    await choosePlace();
    await buildPlan();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();

    await goTo('My Profile');
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete my saved data' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await flush();

    expect(screen.getByText('Deleted. Nothing is saved now.')).toBeDefined();
    expect(planPosts(fetchSpy)).toHaveLength(1);
    await goTo('Today');
    await buildPlan();
    expect(planPosts(fetchSpy)).toHaveLength(2);
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
        return Promise.resolve(
          init?.method === 'DELETE'
            ? new Response(null, { status: 204 })
            : Response.json({ data: saved }),
        );
      }
      return plans(url, init);
    };
  }

  // My Profile lists saved plans; opening one shows it there (spec §7.7).
  async function openSavedPlan() {
    await goTo('My Profile');
    fireEvent.click(screen.getByRole('button', { name: /^Open/ }));
    await flush();
    expect(window.location.pathname).toBe('/app/profile');
    expect(screen.getByText('Plan for Delhi')).toBeDefined();
  }
  const SNAPSHOT = `Saved plan from ${formatDateTime('2026-11-17T10:00:00.000Z')}. This is a snapshot, not current air information.`;

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
    expect(screen.queryByText(SNAPSHOT)).toBeNull();
  });

  it('Open shows the saved plan inside My Profile with Close', async () => {
    routeFetch(ok(), withSavedPlan());
    render(<AppShell />);
    await openSavedPlan();

    const banner = screen.getByText(SNAPSHOT);
    expect(document.activeElement?.contains(banner)).toBe(true);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    // Today never holds a saved plan.
    expect(screen.queryByRole('button', { name: 'Back to today' })).toBeNull();
  });

  it("Close returns focus to the plan's Open button", async () => {
    routeFetch(ok(), withSavedPlan());
    render(<AppShell />);
    await openSavedPlan();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText(SNAPSHOT)).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /^Open/ }),
    );
  });

  it('deleting the open plan closes it', async () => {
    routeFetch(ok(), withSavedPlan());
    render(<AppShell />);
    await openSavedPlan();

    fireEvent.click(screen.getByRole('button', { name: /^Delete ?plan for/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    await flush();

    expect(screen.queryByText(SNAPSHOT)).toBeNull();
    expect(screen.queryByText('Plan for Delhi')).toBeNull();
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
      level: 1,
      name: 'Today in Pune, Maharashtra',
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

    // With a place set, "Use my location" is in the place dialog.
    fireEvent.click(screen.getByRole('button', { name: /^Change place: / }));
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(window.location.search).toBe('');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Today near you (approximate)',
      }),
    ).toBeDefined();
  });
});
