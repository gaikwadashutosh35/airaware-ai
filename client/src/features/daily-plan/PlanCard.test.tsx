import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { rulesPlanFixture } from '../../test/planFixtures.ts';
import { PlanCard } from './PlanCard.tsx';

afterEach(cleanup);

const candidate = rulesPlanFixture.featured[0]!.candidate;
const card = (flat?: boolean) =>
  render(
    <PlanCard
      item={{ candidate, period: null, forYou: null, compact: false }}
      sources={rulesPlanFixture.sources}
      level={3}
      flat={flat}
    />,
  );

describe('PlanCard', () => {
  it('a flat card drops its box', async () => {
    const { container, unmount } = card(true);
    const flat = container.querySelector('article')!;
    expect(flat.classList.contains('border-t')).toBe(true);
    expect(flat.classList.contains('rounded-lg')).toBe(false);
    expect(flat.classList.contains('p-4')).toBe(false);
    await expectNoAxeViolations(container);
    unmount();

    const boxed = card().container.querySelector('article')!;
    expect(boxed.className).toBe(
      'flex flex-col gap-2 rounded-lg border border-rule p-4',
    );
  });
});
