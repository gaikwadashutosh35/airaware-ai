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
const SAVED = 'Saved to your anonymous account. This is the plan as saved.';
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
  const onPlan = vi.fn();
  const all = (more: Partial<Props>) => (
    <DailyPlanSection
      place={place}
      context={{}}
      now={at}
      active
      verdictLevel="elevated"
      forecastCurrent
      onSaved={onSaved}
      onPlan={onPlan}
      {...props}
      {...more}
    />
  );
  const utils = render(all({}));
  return {
    ...utils,
    onSaved,
    onPlan,
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
  // B5: the plan names its air only when the verdict on screen does not.
  it('names the air the plan used when no verdict is shown', async () => {
    routeFetch(() => planReply());
    renderSection({ verdictLevel: null });
    await build();

    expect(
      screen.getByText(
        /^Today: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved /,
      ),
    ).toBeDefined();
  });

  it('names the air the plan used when the verdict shows another level', async () => {
    routeFetch(() => planReply());
    renderSection({ verdictLevel: 'not_elevated' });
    await build();

    expect(
      screen.getByText(
        /^Today: Forecast above India's 24-hour limit · Model forecast · Open-Meteo · retrieved /,
      ),
    ).toBeDefined();
  });

  it('leaves the air to the verdict when the levels match', async () => {
    routeFetch(() => planReply());
    renderSection({ verdictLevel: 'elevated' });
    await build();

    expect(
      screen.queryByText(/ · Model forecast · Open-Meteo · retrieved /),
    ).toBeNull();
  });

  // B2: no answers, no "For you" line on the top card.
  it('shows no For you line without answers, and one with answers', async () => {
    routeFetch(() => planReply(aiPlanFixture));
    const first = renderSection({ context: {} });
    await screen.findAllByText(/^Made with AI/);
    // Only the top card: "See your full day" keeps its own lines.
    const card = () => within(document.querySelector('article')!);
    expect(card().queryByText(/For you:/)).toBeNull();
    first.unmount();
    renderSection({ context: { routine: { outdoorExercise: true } } });
    await screen.findAllByText(/^Made with AI/);
    expect(card().getByText(/For you:/)).toBeDefined();
  });

  // A11: a failed build says the forecast on the page still holds.
  it('says the forecast is still up to date when the plan fails and it is', async () => {
    routeFetch(() => errorReply(500, 'INTERNAL_ERROR'));
    renderSection({ forecastCurrent: true });
    const alert = await screen.findByRole('alert');
    const line = screen.getByText(
      'Your forecast on this page is still up to date.',
    );
    expect(alert.contains(line)).toBe(false);
    expect(
      alert.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('never says the forecast is up to date when it is not, or the plan works', async () => {
    routeFetch(() => errorReply(500, 'INTERNAL_ERROR'));
    const { unmount } = renderSection({ forecastCurrent: false });
    await screen.findByRole('alert');
    expect(screen.queryByText(/still up to date/)).toBeNull();
    unmount();
    cleanup();
    routeFetch(() => planReply());
    renderSection({ forecastCurrent: true });
    await build();
    expect(screen.queryByText(/still up to date/)).toBeNull();
  });

  // TD-10: only READY is screen-reader-only; everything else stays visible.
  it('hides only the ready line, in the one live region', async () => {
    let reply!: (response: Response) => void;
    routeFetch((path) =>
      path === PLAN_PATH
        ? new Promise<Response>((resolve) => (reply = resolve))
        : savedReply(rulesPlanFixture),
    );
    renderSection();
    const status = screen.getByRole('status');
    await waitFor(() => expect(status.textContent).toBe(LOADING));
    expect(status.className).not.toContain('sr-only');
    reply(planReply());
    await build();
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('Your plan is ready.');
    expect(status.className).toContain('sr-only');
    fireEvent.click(saveButton());
    await screen.findByText(SAVED);
    expect(screen.getByRole('status')).toBe(status);
    expect(status.className).not.toContain('sr-only');
  });

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

  // My Home shows the plan's indoor cards (Phase 8).
  it('reports each finished plan, and nothing for a new place', async () => {
    const saved = { ...rulesPlanFixture, place: { label: 'Saved label' } };
    routeFetch((path) =>
      path === PLAN_PATH ? planReply() : savedReply(saved),
    );
    // A new place mounts a fresh section.
    const { onPlan } = renderSection();
    expect(onPlan).toHaveBeenNthCalledWith(1, { kind: 'none' });

    await build();
    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith({
        kind: 'ready',
        plan: rulesPlanFixture,
      }),
    );

    fireEvent.click(saveButton());
    await screen.findByText(SAVED);
    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith({ kind: 'ready', plan: saved }),
    );
  });

  // Final review, Important 1: My Home must not show a plan Today hides.
  // My Home shows these states too (Phase 8 minors).
  it('reports building, then an error whose retry builds again', async () => {
    let builds = 0;
    let fail!: () => void;
    const spy = routeFetch(() =>
      ++builds === 2
        ? // A request that takes a moment, then fails.
          new Promise<Response>(
            (resolve) => (fail = () => resolve(errorReply(500, 'x'))),
          )
        : planReply(),
    );
    const { onPlan, update } = renderSection();
    await build();

    update({ context: { home: { airPurifier: true } } });
    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith({ kind: 'building' }),
    );
    fail();
    await screen.findByRole('heading', {
      name: "We couldn't build your recommendation.",
    });
    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'error' }),
      ),
    );

    const report = onPlan.mock.lastCall?.[0] as { retry: () => void };
    act(() => report.retry());
    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith({
        kind: 'ready',
        plan: rulesPlanFixture,
      }),
    );
    expect(calls(spy, PLAN_PATH)).toHaveLength(3);
  });

  // Never the plan itself once its forecast is stale; My Home says why.
  it('reports stale once the forecast behind the plan is stale', async () => {
    routeFetch(() => planReply());
    const { onPlan, update } = renderSection();
    await build();

    // 17:05 + 61 min.
    update({ now: new Date('2026-11-17T18:06:00Z') });

    await waitFor(() =>
      expect(onPlan).toHaveBeenLastCalledWith({ kind: 'stale' }),
    );
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

  // "Try again" disappears as the build starts: focus stays in the section.
  it('keeps focus in the section after Try again', async () => {
    let first = true;
    routeFetch(() => {
      if (!first) return planReply();
      first = false;
      return errorReply(500, 'INTERNAL_ERROR');
    });
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Your recommendation for today' }),
    );
    await build();
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

  it('shows only the top card, with Why?', async () => {
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
    expect(within(shown[0]!).getByText('Why?').textContent).toBe(
      `Why? (${TOP})`,
    );
    expect(screen.queryByText('Why this recommendation?')).toBeNull();
  });

  // Owner (27 Nov): the full day starts open (in its scroll box); its
  // summary can still fold it.
  it('the full day starts open and keeps Save plan', async () => {
    routeFetch(() => planReply());
    renderSection();
    await build();

    const fullDay = screen.getByText('See your full day').closest('details')!;
    expect(fullDay.open).toBe(true);
    expect(
      within(fullDay).getByText('Plan for Pune, Maharashtra'),
    ).toBeDefined();
    expect(within(fullDay).getByText('Save plan')).toBeDefined();
    expect(within(fullDay).queryByText('Air notice')).toBeNull();
    expect(within(fullDay).queryByText('Air check')).toBeNull();
  });

  // Owner (27 Nov): with the full day open, Save plan is outlined, so Today
  // keeps one teal-filled control (G-05).
  it('Save plan is outlined, not filled', async () => {
    routeFetch(() => planReply());
    renderSection();
    await build();

    const save = screen.getByRole('button', { name: 'Save plan' });
    expect(save.className).not.toContain('bg-primary');
    expect(save.className).toContain('border');
    expect(save.className).toContain('min-h-11');
  });

  // Owner (27 Nov): opened, the full day stretched the card down the page;
  // it now scrolls in a box of limited height.
  it('the full day scrolls inside a box of limited height', async () => {
    routeFetch(() => planReply());
    renderSection();
    await build();

    const fullDay = screen.getByText('See your full day').closest('details')!;
    const body = fullDay.querySelector(':scope > div')!;
    expect(body.className).toMatch(/\bmax-h-/);
    expect(body.className).toContain('overflow-y-auto');
    expect(within(body as HTMLElement).getByText('Save plan')).toBeDefined();
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

  // F-01: the note by Save plan says an account is created and where the
  // plan goes, never that it stays in the browser.
  it('says saving a plan creates an anonymous account', async () => {
    routeFetch(() => planReply());
    renderSection();
    await build();

    expect(
      screen.getByText(
        "Saving creates an anonymous account (no email or name). Your plan is stored on AirAware's database host, and this browser keeps the sign-in. Delete it any time in My Profile. Clearing this browser's data loses access but does not delete it.",
      ),
    ).toBeDefined();
    expect(screen.queryByText(/on this browser only/)).toBeNull();
  });

  // Save plan shares the 10-a-minute limit with plans and Ask answers.
  it('explains a rate-limited save', async () => {
    routeFetch((path) =>
      path === PLAN_PATH ? planReply() : errorReply(429, 'RATE_LIMITED'),
    );
    renderSection();
    await build();

    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
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

    // A later, unrelated delete must not bring the claim back.
    update({ deletedPlanId: 'other' });
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
