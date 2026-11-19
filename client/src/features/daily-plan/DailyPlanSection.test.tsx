import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import { formatDateTime } from '../air-quality/forecast.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import {
  rulesPlanFixture,
  unavailablePlanFixture,
} from '../../test/planFixtures.ts';
import { DailyPlanSection } from './DailyPlanSection.tsx';

const session = vi.hoisted(() => ({
  available: true,
  currentToken: vi.fn<() => Promise<string | null>>(),
  tokenForSave: vi.fn<() => Promise<string>>(),
}));

vi.mock('../../lib/supabase.ts', () => ({
  get savingAvailable() {
    return session.available;
  },
  currentToken: () => session.currentToken(),
  tokenForSave: () => session.tokenForSave(),
  forgetSession: () => Promise.resolve(),
}));

const PLAN_PATH = '/api/v1/recommendations/daily-plan';
const RULES_MADE_BY =
  'Made by our rules. AI personalisation is unavailable right now.';
const LOADING = 'Building your plan. This can take up to 30 seconds.';
const CHANGED = 'Your answers changed. Build the plan again to use them.';
const PLAN_STALE =
  'This plan was built more than an hour ago. Build it again for the latest forecast.';
const SAVED = 'Saved on this browser. This is the plan as saved.';
const LIMIT = 'You can keep up to 20 saved plans. Delete one to save another.';
const SAVE_FAILED = "Saving isn't available right now.";

const place = {
  label: 'Pune, Maharashtra',
  latitude: 18.51957,
  longitude: 73.85535,
};
// The fixture's forecast was retrieved at 17:05.
const at = new Date('2026-11-17T17:30:00Z');
const minutesAfter = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

type Handler = (
  path: string,
  init?: RequestInit,
) => Response | Promise<Response>;

function routeFetch(handler: Handler) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) =>
      Promise.resolve(handler(typeof input === 'string' ? input : '', init)),
    );
}

const planReply = (plan: DailyPlan = rulesPlanFixture) =>
  Response.json({ data: plan });
const errorReply = (status: number, code: string) =>
  Response.json({ error: { code, message: 'x' } }, { status });
const savedReply = (plan: DailyPlan, savedAt = at.toISOString()) =>
  Response.json({ data: { id: 'p1', savedAt, plan } }, { status: 201 });

const calls = (spy: ReturnType<typeof routeFetch>, path: string) =>
  spy.mock.calls.filter(([input]) => input === path);

type Props = ComponentProps<typeof DailyPlanSection>;

function renderSection(props: Partial<Props> = {}) {
  const onSaved = vi.fn();
  const onBackToToday = vi.fn();
  const all = (more: Partial<Props>) => (
    <DailyPlanSection
      place={place}
      context={{}}
      now={at}
      onSaved={onSaved}
      opened={null}
      onBackToToday={onBackToToday}
      {...props}
      {...more}
    />
  );
  const utils = render(all({}));
  return {
    ...utils,
    onSaved,
    onBackToToday,
    update: (more: Partial<Props>) => utils.rerender(all(more)),
  };
}

const BANNER = (savedAt: string) =>
  `Saved plan from ${formatDateTime(savedAt)}. This is a snapshot, not current air information.`;
const snapshot = {
  id: 'p1',
  savedAt: '2026-11-18T10:40:00.000Z',
  plan: { ...rulesPlanFixture, place: { label: 'Delhi' } },
};

const buildButton = () =>
  screen.getByRole('button', { name: 'Build my daily plan' });
const saveButton = () => screen.getByRole('button', { name: 'Save plan' });

async function build() {
  fireEvent.click(buildButton());
  await screen.findByText(RULES_MADE_BY);
}

beforeEach(() => {
  session.available = true;
  session.currentToken.mockResolvedValue(null);
  session.tokenForSave.mockResolvedValue('tok');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('DailyPlanSection', () => {
  it('needs a place first', () => {
    renderSection({ place: null });

    const button = buildButton();
    expect(button).toHaveProperty('disabled', true);
    const hint = document.getElementById(
      button.getAttribute('aria-describedby') ?? '',
    );
    expect(hint?.textContent).toBe('Choose a place first.');
  });

  it('sends the place with 2 decimals and the answers on screen', async () => {
    const spy = routeFetch(() => planReply());
    renderSection({ context: { home: { airPurifier: true } } });

    await build();

    const [, init] = calls(spy, PLAN_PATH)[0]!;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      householdContext: { home: { airPurifier: true } },
    });
  });

  it('shows the loading status, then the plan', async () => {
    let reply!: (response: Response) => void;
    routeFetch(() => new Promise<Response>((resolve) => (reply = resolve)));
    renderSection();

    fireEvent.click(buildButton());

    expect(screen.getByRole('status').textContent).toBe(LOADING);
    reply(planReply());
    expect(await screen.findByText(RULES_MADE_BY)).toBeDefined();
    expect(screen.queryByText(LOADING)).toBeNull();
  });

  // Review Focus 3.
  it('sends one request for a double click', async () => {
    const spy = routeFetch(() => planReply());
    renderSection();

    fireEvent.click(buildButton());
    fireEvent.click(buildButton());
    await screen.findByText(RULES_MADE_BY);

    expect(calls(spy, PLAN_PATH)).toHaveLength(1);
  });

  it('never creates an account to build a plan', async () => {
    routeFetch(() => planReply());
    renderSection();

    await build();

    expect(session.tokenForSave).not.toHaveBeenCalled();
    expect(session.currentToken).not.toHaveBeenCalled();
  });

  it('explains a rate limit and retries', async () => {
    let first = true;
    const spy = routeFetch(() => {
      if (!first) return planReply();
      first = false;
      return errorReply(429, 'RATE_LIMITED');
    });
    renderSection();

    fireEvent.click(buildButton());
    expect(
      await screen.findByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(RULES_MADE_BY)).toBeDefined();
    expect(calls(spy, PLAN_PATH)).toHaveLength(2);
  });

  it('uses plan wording for other errors', async () => {
    routeFetch(() => errorReply(500, 'INTERNAL_ERROR'));
    renderSection();

    fireEvent.click(buildButton());

    expect(
      await screen.findByText('Something went wrong building your plan.'),
    ).toBeDefined();
  });

  it('says when the answers changed since the plan was built', async () => {
    routeFetch(() => planReply());
    const { update } = renderSection({ context: {} });
    await build();
    expect(screen.queryByText(CHANGED)).toBeNull();

    update({ context: { home: { airPurifier: true } } });
    expect(screen.getByText(CHANGED)).toBeDefined();

    update({ context: {} });
    expect(screen.queryByText(CHANGED)).toBeNull();
  });

  it('says the plan is old once its forecast passes an hour', async () => {
    routeFetch(() => planReply());
    const { update } = renderSection();
    await build();
    expect(screen.queryByText(PLAN_STALE)).toBeNull();

    // 17:05 + 61 min.
    update({ now: new Date('2026-11-17T18:06:00Z') });

    expect(screen.getByText(PLAN_STALE)).toBeDefined();
    expect(buildButton()).toHaveProperty('disabled', false);
  });

  it('falls back to the build time when the plan has no forecast', async () => {
    routeFetch(() => planReply(unavailablePlanFixture));
    const start = new Date();
    const { update } = renderSection({ now: start });
    await build();
    expect(screen.queryByText(PLAN_STALE)).toBeNull();

    update({ now: minutesAfter(start, 59) });
    expect(screen.queryByText(PLAN_STALE)).toBeNull();
    update({ now: minutesAfter(start, 62) });
    expect(screen.getByText(PLAN_STALE)).toBeDefined();
  });

  it('saves the plan the server returns', async () => {
    const saved = {
      ...rulesPlanFixture,
      place: { label: 'Saved label' },
    };
    const spy = routeFetch((path) =>
      path === PLAN_PATH ? planReply() : savedReply(saved),
    );
    const { onSaved } = renderSection();
    await build();

    fireEvent.click(saveButton());

    expect(await screen.findByText(SAVED)).toBeDefined();
    expect(session.tokenForSave).toHaveBeenCalledTimes(1);
    const [, init] = calls(spy, '/api/v1/plans')[0]!;
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
    expect(JSON.parse(init?.body as string)).toEqual({
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      householdContext: {},
    });
    expect(screen.getByText(/Saved label/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Save plan' })).toBeNull();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('treats a saved plan as old an hour after it was saved', async () => {
    const start = new Date();
    routeFetch((path) =>
      path === PLAN_PATH
        ? planReply(unavailablePlanFixture)
        : savedReply(unavailablePlanFixture, start.toISOString()),
    );
    const { update } = renderSection({ now: start });
    await screen.findByRole('button', { name: 'Build my daily plan' });
    fireEvent.click(buildButton());
    await screen.findByText(RULES_MADE_BY);
    fireEvent.click(saveButton());
    await screen.findByText(SAVED);

    update({ now: minutesAfter(start, 61) });

    expect(screen.getByText(PLAN_STALE)).toBeDefined();
  });

  // Review Focus 3.
  it('sends one save for a double click', async () => {
    const spy = routeFetch((path) =>
      path === PLAN_PATH ? planReply() : savedReply(rulesPlanFixture),
    );
    renderSection();
    await build();

    fireEvent.click(saveButton());
    fireEvent.click(saveButton());
    await screen.findByText(SAVED);

    expect(calls(spy, '/api/v1/plans')).toHaveLength(1);
  });

  it('explains the 20-plan limit', async () => {
    routeFetch((path) =>
      path === PLAN_PATH ? planReply() : errorReply(409, 'LIMIT_REACHED'),
    );
    renderSection();
    await build();

    fireEvent.click(saveButton());

    expect(await screen.findByText(LIMIT)).toBeDefined();
    expect(screen.queryByText(SAVED)).toBeNull();
  });

  it('never claims a save that failed', async () => {
    routeFetch((path) =>
      path === PLAN_PATH ? planReply() : errorReply(503, 'SAVE_UNAVAILABLE'),
    );
    renderSection();
    await build();

    fireEvent.click(saveButton());
    expect(await screen.findByText(SAVE_FAILED)).toBeDefined();
    expect(screen.queryByText(SAVED)).toBeNull();

    session.tokenForSave.mockRejectedValue(new Error('sign-in failed'));
    fireEvent.click(saveButton());
    await waitFor(() => expect(session.tokenForSave).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(SAVE_FAILED)).toBeDefined();
    expect(screen.queryByText(SAVED)).toBeNull();
  });

  it('says when saving is not set up', async () => {
    session.available = false;
    routeFetch(() => planReply());
    renderSection();
    await build();

    expect(saveButton()).toHaveProperty('disabled', true);
    expect(screen.getByText("Saving isn't set up on this site.")).toBeDefined();
  });

  // Review Focus 4.
  it('shows a saved plan under the snapshot banner, focused', () => {
    // Long after it was saved: a snapshot never shows the stale line.
    renderSection({ opened: snapshot, now: new Date('2026-11-19T12:00:00Z') });

    const banner = screen.getByText(BANNER(snapshot.savedAt));
    expect(document.activeElement?.contains(banner)).toBe(true);
    expect(screen.getByText('Plan for Delhi')).toBeDefined();
    expect(screen.getByText(RULES_MADE_BY)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Save plan' })).toBeNull();
    expect(screen.queryByText(PLAN_STALE)).toBeNull();
  });

  // Review Focus 4.
  it('brings the live plan back after "Back to today"', async () => {
    routeFetch(() => planReply());
    const { update, onBackToToday } = renderSection();
    await build();
    expect(screen.getByText('Plan for Pune, Maharashtra')).toBeDefined();

    update({ opened: snapshot });
    expect(screen.queryByText('Plan for Pune, Maharashtra')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to today' }));
    expect(onBackToToday).toHaveBeenCalledTimes(1);

    update({ opened: null });
    expect(screen.getByText('Plan for Pune, Maharashtra')).toBeDefined();
    expect(saveButton()).toBeDefined();
  });

  it('passes axe with a plan shown', async () => {
    routeFetch(() => planReply());
    const { container } = renderSection();
    await build();

    await expectNoAxeViolations(container);
  });
});
