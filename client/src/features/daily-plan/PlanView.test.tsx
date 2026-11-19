import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import {
  aiPlanFixture,
  rulesPlanFixture,
  unavailablePlanFixture,
} from '../../test/planFixtures.ts';
import { PlanCard } from './PlanCard.tsx';
import { PlanView } from './PlanView.tsx';

const MODEL_LINE =
  'Model forecast for an area about 45 km wide. Not a station measurement and not the CPCB AQI.';

const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('PlanView', () => {
  afterEach(cleanup);

  it('shows a complete rules plan: made-by, notice first, three topics, no "Your day"', () => {
    const { container } = render(<PlanView plan={rulesPlanFixture} />);

    expect(
      screen.getByText(
        'Made by our rules. AI personalisation is unavailable right now.',
      ),
    ).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Your day' })).toBeNull();
    const topics = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(topics).toEqual([
      'Air notice',
      'Air check',
      'Outdoors and travel',
      'Indoor air',
      'Sustainable swaps',
    ]);
    const notice = screen.getByText(rulesPlanFixture.notices[0].title);
    expect(
      follows(
        notice,
        screen.getByRole('heading', { name: 'Outdoors and travel' }),
      ),
    ).toBe(true);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs[paragraphs.length - 1].textContent).toBe(
      rulesPlanFixture.safetyNote,
    );
  });

  it('shows the AI summary, "Your day" in order and "For you" lines', () => {
    render(<PlanView plan={aiPlanFixture} />);

    expect(screen.getByText(aiPlanFixture.summary!)).toBeDefined();
    const day = screen.getByRole('region', { name: 'Your day' });
    expect(
      within(day)
        .getAllByRole('heading', { level: 4 })
        .map((h) => h.textContent),
    ).toEqual(['Morning', 'At home']);
    expect(
      within(day).getByText(aiPlanFixture.featured[0].forYou!),
    ).toBeDefined();
  });

  it('shows every suggestion text exactly once', () => {
    render(<PlanView plan={aiPlanFixture} />);

    const candidates = [
      ...aiPlanFixture.featured.map((f) => f.candidate),
      ...aiPlanFixture.more,
    ];
    for (const candidate of candidates) {
      expect(screen.getAllByText(candidate.text)).toHaveLength(1);
    }
    const outdoors = screen.getByRole('region', {
      name: 'Outdoors and travel',
    });
    expect(within(outdoors).getByText('In your day: Morning')).toBeDefined();
  });

  it('says when air information is unavailable', () => {
    render(<PlanView plan={unavailablePlanFixture} />);

    expect(
      screen.getByText('Air information is unavailable for this plan.'),
    ).toBeDefined();
    expect(
      screen.getByText(unavailablePlanFixture.notices[0].title),
    ).toBeDefined();
    expect(
      screen.getByText('PM2.5: 24-hour average not available, limit 60 μg/m³'),
    ).toBeDefined();
  });

  it('always says the air check is a model forecast, not a station or the CPCB AQI', () => {
    for (const plan of [rulesPlanFixture, aiPlanFixture]) {
      render(<PlanView plan={plan} />);
      const check = screen.getByRole('region', { name: 'Air check' });
      expect(within(check).getByText(MODEL_LINE)).toBeDefined();
      expect(
        within(check).getByText(/^Open-Meteo model forecast, retrieved /),
      ).toBeDefined();
      cleanup();
    }
  });

  it('shows the empty-topic line', () => {
    const plan: DailyPlan = {
      ...rulesPlanFixture,
      featured: rulesPlanFixture.featured.filter(
        (f) => f.candidate.section !== 'swap',
      ),
    };
    render(<PlanView plan={plan} />);

    const swaps = screen.getByRole('region', { name: 'Sustainable swaps' });
    expect(
      within(swaps).getByText(
        'No suggestions in this area for your answers today.',
      ),
    ).toBeDefined();
  });

  it('explains each card in a closed "Why?" panel', () => {
    const { container } = render(<PlanView plan={rulesPlanFixture} />);

    const panels = container.querySelectorAll('details');
    expect(panels.length).toBeGreaterThan(0);
    expect([...panels].every((panel) => !panel.open)).toBe(true);

    // The outdoor exercise card: a data-driven rule citing both sources.
    const exercise = rulesPlanFixture.featured[0].candidate;
    const card = screen
      .getByRole('heading', { name: exercise.title })
      .closest('article')!;
    const why = within(card).getByText('Why?').closest('details')!;
    expect(within(why).getByText(exercise.reason)).toBeDefined();
    expect(within(why).getByText("today's forecast check")).toBeDefined();
    expect(
      within(why).getByText('Your answer to "Do you exercise outdoors?"'),
    ).toBeDefined();
    const link = within(why).getByRole('link', {
      name: 'Open-Meteo Air Quality API',
    });
    expect(link.getAttribute('href')).toBe(rulesPlanFixture.sources[0].url);

    // General guidance with no source says so.
    const smoke = rulesPlanFixture.featured.find(
      (f) => f.candidate.id === 'indoor.smoke-sources',
    )!.candidate;
    expect(smoke.sourceIds).toEqual([]);
    const smokeCard = screen
      .getByRole('heading', { name: smoke.title })
      .closest('article')!;
    expect(within(smokeCard).getByText('general guidance')).toBeDefined();
    expect(
      within(smokeCard).getByText(
        'No external source; this is general guidance.',
      ),
    ).toBeDefined();
  });

  it('marks only high priority as "Important today"', () => {
    render(<PlanView plan={rulesPlanFixture} />);

    const high = [
      ...rulesPlanFixture.notices,
      ...rulesPlanFixture.featured.map((f) => f.candidate),
    ].filter((c) => c.priority === 'high');
    expect(screen.getAllByText('Important today')).toHaveLength(high.length);
  });

  it('can start with "Why?" open and use a level-3 title', () => {
    const candidate = rulesPlanFixture.featured[0].candidate;
    const { container } = render(
      <PlanCard
        item={{ candidate, forYou: null, period: null, compact: false }}
        sources={rulesPlanFixture.sources}
        level={3}
        openWhy
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: candidate.title }),
    ).toBeDefined();
    expect(container.querySelector('details')?.open).toBe(true);
  });

  // Phase 8 review: a saved plan must not read as today's air.
  it('a saved snapshot says "that day", not "today"', () => {
    const plan: DailyPlan = {
      ...rulesPlanFixture,
      featured: rulesPlanFixture.featured.filter(
        (f) => f.candidate.section !== 'swap',
      ),
    };
    render(<PlanView plan={plan} snapshot />);

    // The rules' own advice text stays unchanged; only our labels change.
    expect(screen.queryByText('Important today')).toBeNull();
    expect(screen.queryByText("today's forecast check")).toBeNull();
    expect(screen.getAllByText('Important that day').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("that day's forecast check").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'No suggestions in this area for your answers that day.',
      ),
    ).toBeDefined();
  });

  it('passes axe for the rules plan and the AI plan', async () => {
    for (const plan of [rulesPlanFixture, aiPlanFixture]) {
      const { container } = render(<PlanView plan={plan} />);
      await expectNoAxeViolations(container);
      cleanup();
    }
  });
});
