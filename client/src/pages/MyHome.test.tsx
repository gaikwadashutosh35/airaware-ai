import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DailyPlan, HouseholdContext } from '../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { homeGuidesFixture } from '../test/guideFixtures.ts';
import { rulesPlanFixture } from '../test/planFixtures.ts';
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
  return render(<MyHome plan={plan} context={context} />);
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

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Cooking and smoke' }),
    ).toBeDefined();
    expect(spy).toHaveBeenCalledTimes(2);
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
