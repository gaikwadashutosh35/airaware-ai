import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import {
  aiPlanFixture,
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
const PLAN_STALE = 'The forecast behind this plan is more than an hour old.';
const SAVED = 'Saved on this browser. This is the plan as saved.';
const LIMIT = 'You can keep up to 20 saved plans. Delete one to save another.';
const SAVE_FAILED = "Saving isn't available right now.";
const TOP = 'Consider an indoor alternative for exercise';

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

// Lets a scheduled build start and its reply settle.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

type Props = ComponentProps<typeof DailyPlanSection>;

function renderSection(props: Partial<Props> = {}) {
  const onSaved = vi.fn();
  const all = (more: Partial<Props>) => (
    <DailyPlanSection
      place={place}
      context={{}}
      now={at}
      active
      onSaved={onSaved}
      {...props}
      {...more}
    />
  );
  const utils = render(all({}));
  return {
    ...utils,
    onSaved,
    update: (more: Partial<Props>) => utils.rerender(all(more)),
  };
}

const saveButton = () => screen.getByRole('button', { name: 'Save plan' });

// The plan builds by itself: wait until it is shown.
async function build() {
  await screen.findByText(RULES_MADE_BY);
}

beforeEach(() => {
  session.available = true;
  session.currentToken.mockResolvedValue(null);
  session.tokenForSave.mockResolvedValue('tok');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('DailyPlanSection', () => {
  it('waits for a place', async () => {
    const spy = routeFetch(() => planReply());
    renderSection({ place: null });
    await settle();

    expect(screen.getByText('Choose a place first.')).toBeDefined();
    expect(calls(spy, PLAN_PATH)).toHaveLength(0);
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

    expect(await screen.findByText(LOADING)).toBeDefined();
    expect(screen.getByText('Finding your recommendation…')).toBeDefined();
    reply(planReply());
    expect(await screen.findByText(RULES_MADE_BY)).toBeDefined();
    expect(screen.queryByText(LOADING)).toBeNull();
  });

  // Review Focus 1.
  it('builds once when Today opens', async () => {
    const spy = routeFetch(() => planReply());
    const { update } = renderSection({ active: false });
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(0);

    update({ active: true });
    await build();
    // To My Profile and back.
    update({ active: false });
    update({ active: true });
    await settle();

    expect(calls(spy, PLAN_PATH)).toHaveLength(1);
  });

  // Review Focus 1.
  it('rebuilds once after answers change', async () => {
    const answers = { home: { airPurifier: true } };
    const spy = routeFetch(() => planReply());
    const { update } = renderSection();
    await build();

    // The answers change on My Profile, while Today is hidden.
    update({ active: false, context: answers });
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(1);

    update({ active: true, context: answers });
    await waitFor(() => expect(calls(spy, PLAN_PATH)).toHaveLength(2));
    await build();
    await settle();

    expect(calls(spy, PLAN_PATH)).toHaveLength(2);
    const [, init] = calls(spy, PLAN_PATH)[1]!;
    expect(JSON.parse(init?.body as string).householdContext).toEqual(answers);
  });

  // Review Focus 1: at most one build an hour, by the device's clock.
  it('rebuilds once the plan is more than an hour old', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at);
    const spy = routeFetch(() => planReply(unavailablePlanFixture));
    const { update } = renderSection();
    await build();

    vi.setSystemTime(minutesAfter(at, 59));
    update({ now: minutesAfter(at, 59) });
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(1);

    vi.setSystemTime(minutesAfter(at, 62));
    update({ now: minutesAfter(at, 62) });
    await waitFor(() => expect(calls(spy, PLAN_PATH)).toHaveLength(2));
    await build();
    await settle();

    expect(calls(spy, PLAN_PATH)).toHaveLength(2);
    expect(screen.queryByText(PLAN_STALE)).toBeNull();
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

    expect(
      await screen.findByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(RULES_MADE_BY)).toBeDefined();
    expect(calls(spy, PLAN_PATH)).toHaveLength(2);
  });

  it('a plan error offers Try again, never an automatic retry', async () => {
    const spy = routeFetch(() => errorReply(500, 'INTERNAL_ERROR'));
    renderSection();

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: "We couldn't build your recommendation.",
      }),
    ).toBeDefined();
    expect(
      screen.getByText('Something went wrong building your plan.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(1);
  });

  // Final review, Important 2 and 3: who made it and the safety note stay
  // in view, not only inside "See your full day".
  it('says who made it and gives the safety note beside the card', async () => {
    routeFetch(() => planReply());
    const { unmount } = renderSection();
    await build();

    const rules = screen.getByText(
      `Made by our rules. ${rulesPlanFixture.safetyNote}`,
    );
    expect(rules.closest('details')).toBeNull();
    unmount();

    vi.restoreAllMocks();
    routeFetch(() => planReply(aiPlanFixture));
    renderSection();
    const ai = await screen.findByText(
      `Made with AI. ${aiPlanFixture.safetyNote}`,
    );
    expect(ai.closest('details')).toBeNull();
  });

  it('shows only the top card, with Why this recommendation?', async () => {
    routeFetch(() => planReply());
    const { container } = renderSection();
    await build();

    const shown = [...container.querySelectorAll('article')].filter(
      (card) => !card.closest('details'),
    );
    expect(shown).toHaveLength(1);
    expect(
      within(shown[0]!).getByRole('heading', { level: 3 }).textContent,
    ).toBe(TOP);
    expect(
      within(shown[0]!).getByText('Why this recommendation?'),
    ).toBeDefined();
  });

  it('the full day is folded and keeps Save plan', async () => {
    routeFetch(() => planReply());
    renderSection();
    await build();

    const fullDay = screen.getByText('See your full day').closest('details')!;
    expect(fullDay.open).toBe(false);
    expect(
      within(fullDay).getByText('Plan for Pune, Maharashtra'),
    ).toBeDefined();
    expect(within(fullDay).getByText('Save plan')).toBeDefined();
    expect(within(fullDay).queryByText('Air notice')).toBeNull();
    expect(within(fullDay).queryByText('Air check')).toBeNull();
  });

  // The full day hides the air check, so a plan without air data says so
  // beside the card.
  it('says beside the card when the plan has no air data', async () => {
    routeFetch(() => planReply(unavailablePlanFixture));
    const { unmount } = renderSection();
    await build();

    const line = screen.getByText(
      'Air information is unavailable for this plan.',
    );
    expect(line.closest('details')).toBeNull();
    unmount();

    vi.restoreAllMocks();
    routeFetch(() => planReply());
    renderSection();
    await build();
    expect(
      screen.queryByText('Air information is unavailable for this plan.'),
    ).toBeNull();
  });

  it('says when no card fits the answers', async () => {
    routeFetch(() =>
      planReply({ ...rulesPlanFixture, featured: [], more: [] }),
    );
    renderSection();

    expect(
      await screen.findByText('No suggestions for your answers today.'),
    ).toBeDefined();
  });

  // The forecast can pass an hour before the plan does: it is marked.
  it('says the plan is old once its forecast passes an hour', async () => {
    routeFetch(() => planReply());
    const { update } = renderSection();
    await build();
    expect(screen.queryByText(PLAN_STALE)).toBeNull();

    // 17:05 + 61 min.
    update({ now: new Date('2026-11-17T18:06:00Z') });

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

  it('counts the hour from the save', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at);
    const spy = routeFetch((path) =>
      path === PLAN_PATH
        ? planReply(unavailablePlanFixture)
        : savedReply(unavailablePlanFixture),
    );
    const { update } = renderSection();
    await build();

    vi.setSystemTime(minutesAfter(at, 30));
    fireEvent.click(saveButton());
    await screen.findByText(SAVED);

    vi.setSystemTime(minutesAfter(at, 61));
    update({ now: minutesAfter(at, 61) });
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(1);
    expect(screen.getByText(SAVED)).toBeDefined();

    vi.setSystemTime(minutesAfter(at, 91));
    update({ now: minutesAfter(at, 91) });
    await waitFor(() => expect(calls(spy, PLAN_PATH)).toHaveLength(2));
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

  // Final review #1: a rebuild during a save could leave "Saved" under an
  // unsaved plan.
  it('rebuilds only after a save finishes', async () => {
    const spy = routeFetch((path) =>
      path === PLAN_PATH ? planReply() : savedReply(rulesPlanFixture),
    );
    let signIn!: (token: string) => void;
    session.tokenForSave.mockReturnValue(
      new Promise<string>((resolve) => (signIn = resolve)),
    );
    const { update } = renderSection();
    await build();

    fireEvent.click(saveButton());
    update({ context: { home: { airPurifier: true } } });
    await settle();
    expect(calls(spy, PLAN_PATH)).toHaveLength(1);

    signIn('tok');
    await waitFor(() => expect(calls(spy, PLAN_PATH)).toHaveLength(2));
    await build();
    expect(screen.queryByText(SAVED)).toBeNull();
    expect(saveButton()).toBeDefined();
  });

  // Final review #2: deleting the plan just saved ends the "Saved" claim.
  it('drops the saved claim when that saved plan is deleted', async () => {
    routeFetch((path) =>
      path === PLAN_PATH ? planReply() : savedReply(rulesPlanFixture),
    );
    const { update } = renderSection();
    await build();
    fireEvent.click(saveButton());
    await screen.findByText(SAVED);

    update({ deletedPlanId: 'other' });
    expect(screen.getByText(SAVED)).toBeDefined();

    update({ deletedPlanId: 'p1' });
    expect(screen.queryByText(SAVED)).toBeNull();
    expect(saveButton()).toBeDefined();
  });

  // Final review #4: one live region that stays, so building and the
  // finished plan are both announced.
  it('announces building and the finished plan in one live region', async () => {
    let reply!: (response: Response) => void;
    routeFetch(() => new Promise<Response>((resolve) => (reply = resolve)));
    renderSection();
    const status = screen.getByRole('status');

    await waitFor(() => expect(status.textContent).toBe(LOADING));
    reply(planReply());
    await screen.findByText(RULES_MADE_BY);

    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('Your plan is ready.');
  });

  it('passes axe with a plan shown', async () => {
    routeFetch(() => planReply());
    const { container } = renderSection();
    await build();

    await expectNoAxeViolations(container);
  });
});
