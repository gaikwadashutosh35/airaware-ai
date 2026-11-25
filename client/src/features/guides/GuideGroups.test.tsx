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

  it("names each card's disclosure Why?", () => {
    render(<GuideGroups set={homeGuidesFixture} level={2} />);

    expect(screen.getAllByText('Why?')).toHaveLength(4);
    expect(screen.queryByText('Why it matters')).toBeNull();
    expect(screen.getAllByText('general guidance').length).toBe(4);
  });

  // F-25: groups are grid items on the container's column tracks; a group
  // spans as many columns as it has cards, as far as they fit.
  it('a group spans as many columns as it has cards, up to three', () => {
    const card = homeGuidesFixture.groups[0]!.cards[0]!;
    const group = (id: string, count: number) => ({
      id,
      heading: id,
      cards: Array.from({ length: count }, (_, i) => ({
        ...card,
        id: `${id}-${i}`,
        title: `${id} ${i}`,
      })),
    });
    render(
      <GuideGroups
        set={{
          ...homeGuidesFixture,
          groups: [group('one', 1), group('two', 2), group('three', 3)],
        }}
        level={2}
      />,
    );
    const section = (name: string) =>
      screen.getByRole('heading', { name }).closest('section')!;

    for (const [name, two, three] of [
      ['one', false, false],
      ['two', true, false],
      ['three', true, true],
    ] as const) {
      const classes = section(name).classList;
      expect(classes.contains('@min-[41rem]:col-span-2')).toBe(two);
      expect(classes.contains('@min-[62rem]:col-span-3')).toBe(three);
      expect(classes.contains('grid-cols-subgrid')).toBe(true);
      // The card row takes any spare height, so card tops line up.
      expect(classes.contains('grid-rows-[auto_1fr]')).toBe(true);
      expect(
        screen
          .getByRole('heading', { name })
          .classList.contains('col-span-full'),
      ).toBe(true);
    }
    const note = screen.getByText(homeGuidesFixture.safetyNote);
    expect(note.classList.contains('col-span-full')).toBe(true);
    expect(note.parentElement!.classList.contains('@container')).toBe(true);
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
