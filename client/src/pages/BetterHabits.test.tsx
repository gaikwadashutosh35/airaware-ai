import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../test/axe.ts';
import { habitsGuidesFixture } from '../test/guideFixtures.ts';
import { BetterHabits } from './BetterHabits.tsx';

const GUIDES = '/api/v1/recommendations/guides?topic=habits';

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
  Promise.resolve(Response.json({ data: habitsGuidesFixture }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BetterHabits', () => {
  it('shows the four habit groups in order, with Why it matters', async () => {
    routeGuides(guidesOk);
    render(<BetterHabits />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Better Habits' }),
    ).toBeDefined();
    await screen.findByRole('heading', { level: 2, name: 'Waste' });
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'Daily commuting and vehicle idling',
      'Waste',
      'Cooking',
      'Energy use',
    ]);
    expect(screen.getAllByText('Why it matters')).toHaveLength(4);
    expect(screen.getByText(habitsGuidesFixture.safetyNote)).toBeDefined();
  });

  it('no card states a savings figure', async () => {
    routeGuides(guidesOk);
    const { container } = render(<BetterHabits />);
    await screen.findByRole('heading', { level: 2, name: 'Waste' });

    for (const card of container.querySelectorAll('article')) {
      expect(card.textContent).not.toMatch(/%|per cent|\bkg\b|tonne/i);
    }
  });

  it('an error offers Try again', async () => {
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
    render(<BetterHabits />);

    expect(
      await screen.findByRole('heading', {
        name: "We couldn't load the guides",
      }),
    ).toBeDefined();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    // The button goes with the error card: focus stays on the page heading.
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 1, name: 'Better Habits' }),
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Waste' }),
    ).toBeDefined();
  });

  it('shows the loading state', () => {
    routeGuides(() => new Promise<Response>(() => {}));
    render(<BetterHabits />);

    expect(screen.getByText('Loading guides')).toBeDefined();
  });

  it('passes axe', async () => {
    routeGuides(guidesOk);
    const { container } = render(<BetterHabits />);
    await screen.findByRole('heading', { level: 2, name: 'Waste' });

    await expectNoAxeViolations(container);
  });
});
