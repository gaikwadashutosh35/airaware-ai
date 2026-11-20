import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { homeGuidesFixture } from '../../test/guideFixtures.ts';
import { GuideGroups } from './GuideGroups.tsx';

afterEach(cleanup);

describe('GuideGroups', () => {
  it('puts each group at the given level, its cards one below', () => {
    const { unmount } = render(
      <GuideGroups set={homeGuidesFixture} level={3} />,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Cooking and smoke' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'Use the kitchen exhaust while cooking',
      }),
    ).toBeDefined();
    unmount();

    render(<GuideGroups set={homeGuidesFixture} level={2} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Cooking and smoke' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Use the kitchen exhaust while cooking',
      }),
    ).toBeDefined();
  });

  it("names each card's disclosure Why it matters", () => {
    render(<GuideGroups set={homeGuidesFixture} level={2} />);

    expect(screen.getAllByText('Why it matters')).toHaveLength(4);
    expect(screen.queryByText('Why?')).toBeNull();
    expect(screen.getAllByText('general guidance').length).toBe(4);
  });

  it('ends with the safety note', () => {
    const { container } = render(
      <GuideGroups set={homeGuidesFixture} level={2} />,
    );

    expect(container.lastElementChild?.lastElementChild?.textContent).toBe(
      homeGuidesFixture.safetyNote,
    );
  });

  it('leaves out a group whose cards are all hidden', () => {
    render(
      <GuideGroups
        set={homeGuidesFixture}
        level={2}
        hide={(card) => card.id === 'guide.damp-cleaning'}
      />,
    );

    expect(
      screen.queryByRole('heading', { name: 'Dust and cleaning' }),
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Indoor habits' }),
    ).toBeDefined();
  });

  it('passes axe', async () => {
    const { container } = render(
      <GuideGroups set={homeGuidesFixture} level={2} />,
    );
    await expectNoAxeViolations(container);
  });
});
