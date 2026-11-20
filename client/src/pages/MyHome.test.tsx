import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlanReport } from '../features/daily-plan/planDisplay.ts';
import { ApiError } from '../services/api.ts';
import type { DailyPlan, HouseholdContext } from '../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { homeGuidesFixture } from '../test/guideFixtures.ts';
import { aiPlanFixture, rulesPlanFixture } from '../test/planFixtures.ts';
import { MyHome } from './MyHome.tsx';

const GUIDES = '/api/v1/recommendations/guides?topic=home';

function routeGuides(reply: () => Promise<Response>) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input) =>
      input === GUIDES
        ? reply()
        : Promise.reject(new Error('unexpected request')),
    );
}
const guidesOk = () =>
  Promise.resolve(Response.json({ data: homeGuidesFixture }));

function show(
  plan: DailyPlan | null = rulesPlanFixture,
  context: HouseholdContext = {},
) {
  const today: PlanReport = plan ? { kind: 'ready', plan } : { kind: 'none' };
  return render(<MyHome today={today} context={context} />);
}

// The plan's indoor cards, in its order.
const PLAN_INDOOR = [
  'Ventilate for indoor sources, not by habit',
  'Run your air purifier where people spend most time',
  'Ventilate the kitchen while cooking',
  'Cut indoor smoke at the source',
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MyHome', () => {
  it("today's indoor cards come first, with Why it matters", async () => {
    routeGuides(guidesOk);
    show();
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'My Home' }),
    ).toBeDefined();
    const today = screen.getByRole('region', {
      name: 'Today, for your home',
    });
    expect(
      within(today)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(PLAN_INDOOR);
    expect(within(today).getAllByText('Why it matters')).toHaveLength(4);
    const ways = screen.getByRole('heading', {
      level: 2,
      name: 'Ways to improve indoor air',
    });
    expect(
      today.compareDocumentPosition(ways) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // Review Focus 2.
  it('without a plan, only the guides show', async () => {
    routeGuides(guidesOk);
    show(null);

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Indoor habits' }),
    ).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: 'Today, for your home' }),
    ).toBeNull();
  });

  // Review Focus 2, with a plan shaped like the server's: no answers and a
  // day within the limits still give one indoor card (smoke at the source).
  it('no answers, within the limits: one card today, its twin hidden', async () => {
    routeGuides(guidesOk);
    const quiet: DailyPlan = {
      ...rulesPlanFixture,
      air: { ...rulesPlanFixture.air, level: 'not_elevated' },
      featured: rulesPlanFixture.featured.filter((f) =>
        ['indoor.smoke-sources', 'swap.no-open-burning'].includes(
          f.candidate.id,
        ),
      ),
      more: [],
    };
    show(quiet);
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    const today = screen.getByRole('region', {
      name: 'Today, for your home',
    });
    expect(
      within(today)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Cut indoor smoke at the source']);
    expect(screen.queryByRole('heading', { name: 'Indoor habits' })).toBeNull();
    for (const group of ['Cooking and smoke', 'Dust and cleaning']) {
      expect(
        screen.getByRole('heading', { level: 3, name: group }),
      ).toBeDefined();
    }
  });

  // Review Focus 1.
  it('a personal card hides its general twin', async () => {
    routeGuides(guidesOk);
    show();
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    // The plan shows indoor.smoke-sources, so its guide twin goes, and the
    // group it leaves empty goes with it.
    expect(screen.getAllByText('Cut indoor smoke at the source')).toHaveLength(
      1,
    );
    expect(screen.queryByRole('heading', { name: 'Indoor habits' })).toBeNull();
  });

  // Final review, Important 2.
  it("says who made today's cards", async () => {
    routeGuides(guidesOk);
    show(aiPlanFixture);
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    const today = screen.getByRole('region', {
      name: 'Today, for your home',
    });
    expect(
      within(today).getByText(`Made with AI. ${aiPlanFixture.safetyNote}`),
    ).toBeDefined();
  });

  // Final review, finding 3: a guide must not contradict the person's answer.
  it('no kitchen exhaust hides the exhaust guide', async () => {
    routeGuides(guidesOk);
    const { unmount } = show(null);
    expect(
      await screen.findByText('Use the kitchen exhaust while cooking'),
    ).toBeDefined();
    unmount();

    show(null, { home: { kitchenExhaust: false } });
    await screen.findByRole('heading', { name: 'Dust and cleaning' });
    expect(
      screen.queryByText('Use the kitchen exhaust while cooking'),
    ).toBeNull();
  });

  it('Near a busy road shows only after a yes', async () => {
    routeGuides(guidesOk);
    const { unmount } = show(null);
    await screen.findByRole('heading', { name: 'Cooking and smoke' });
    expect(
      screen.queryByRole('heading', { name: 'Near a busy road' }),
    ).toBeNull();
    unmount();

    show(null, { home: { nearBusyRoad: 'yes' } });
    expect(
      await screen.findByRole('heading', { name: 'Near a busy road' }),
    ).toBeDefined();
  });

  // Review Focus 3.
  it("a guides error keeps today's cards", async () => {
    let fail = true;
    const spy = routeGuides(() =>
      fail
        ? Promise.resolve(
            Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'x' } },
              { status: 500 },
            ),
          )
        : guidesOk(),
    );
    show();

    expect(
      await screen.findByRole('heading', {
        name: "We couldn't load the guides",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole('region', { name: 'Today, for your home' }),
    ).toBeDefined();
    // Final review, Important 2: the safety note stays with today's cards.
    expect(
      screen.getByText(`Made by our rules. ${rulesPlanFixture.safetyNote}`),
    ).toBeDefined();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Cooking and smoke' }),
    ).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("says today's suggestions are on their way, then announces them", async () => {
    routeGuides(guidesOk);
    const { rerender } = render(
      <MyHome today={{ kind: 'building' }} context={{}} />,
    );

    const today = screen.getByRole('region', { name: 'Today, for your home' });
    expect(
      within(today).getByText("Finding today's suggestions…"),
    ).toBeDefined();
    const status = screen.getByRole('status');
    expect(status.textContent).toBe("Finding today's suggestions…");

    rerender(
      <MyHome today={{ kind: 'ready', plan: rulesPlanFixture }} context={{}} />,
    );
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe("Today's suggestions are ready.");
    await screen.findByRole('heading', { name: 'Cooking and smoke' });
  });

  it('a failed build offers Try again, keeping focus in the section', async () => {
    routeGuides(guidesOk);
    const retry = vi.fn();
    render(
      <MyHome
        today={{
          kind: 'error',
          error: new ApiError(429, 'RATE_LIMITED', 'x'),
          retry,
        }}
        context={{}}
      />,
    );
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: "We couldn't get today's suggestions",
      }),
    ).toBeDefined();
    expect(
      screen.getByText('Too many requests. Try again in a minute.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Today, for your home' }),
    );
  });

  it('Try again on the guides keeps focus on their heading', async () => {
    let fail = true;
    routeGuides(() =>
      fail
        ? Promise.resolve(
            Response.json(
              { error: { code: 'INTERNAL_ERROR', message: 'x' } },
              { status: 500 },
            ),
          )
        : guidesOk(),
    );
    show(null);
    await screen.findByRole('heading', {
      name: "We couldn't load the guides",
    });

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Ways to improve indoor air' }),
    );
    await screen.findByRole('heading', { name: 'Cooking and smoke' });
  });

  it('shows the loading state', () => {
    routeGuides(() => new Promise<Response>(() => {}));
    show();

    expect(screen.getByText('Loading guides')).toBeDefined();
  });

  it('passes axe', async () => {
    routeGuides(guidesOk);
    const { container } = show();
    await screen.findByRole('heading', { name: 'Cooking and smoke' });

    await expectNoAxeViolations(container);
  });
});
