import { describe, expect, it } from 'vitest';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import {
  aiPlanFixture,
  rulesPlanFixture,
  unavailablePlanFixture,
} from '../../test/planFixtures.ts';
import {
  basedOn,
  checkText,
  groupPlan,
  inputLabel,
  madeByLine,
} from './planDisplay.ts';

const ids = (plan: DailyPlan) =>
  groupPlan(plan).topics.flatMap((topic) =>
    topic.items.map((item) => item.candidate.id),
  );

describe('groupPlan', () => {
  it('puts every rules-plan suggestion in its topic, in full, with no "Your day"', () => {
    const { yourDay, topics } = groupPlan(rulesPlanFixture);

    expect(yourDay).toEqual([]);
    expect(topics.map((topic) => topic.heading)).toEqual([
      'Outdoors and travel',
      'Indoor air',
      'Sustainable swaps',
    ]);
    expect(ids(rulesPlanFixture).sort()).toEqual(
      rulesPlanFixture.featured.map((f) => f.candidate.id).sort(),
    );
    expect(
      topics.flatMap((topic) => topic.items).every((item) => !item.compact),
    ).toBe(true);
    for (const topic of topics) {
      expect(
        topic.items.every((item) => item.candidate.section === topic.section),
      ).toBe(true);
    }
  });

  it('orders "Your day" by period and drops empty periods', () => {
    const { yourDay } = groupPlan(aiPlanFixture);

    expect(yourDay.map((p) => [p.period, p.label])).toEqual([
      ['morning', 'Morning'],
      ['home', 'At home'],
    ]);
    expect(yourDay[0].items[0]).toMatchObject({
      compact: false,
      forYou: aiPlanFixture.featured[0].forYou,
    });
  });

  it('repeats a "Your day" item compactly in its topic, featured before more', () => {
    const { topics } = groupPlan(aiPlanFixture);
    const [outdoors, indoor, swaps] = topics;

    expect(outdoors.items.map((i) => [i.candidate.id, i.compact])).toEqual([
      ['exercise.indoor-alternative', true],
    ]);
    // The featured purifier (home) leads, compact; `more` follows in full.
    expect(indoor.items.map((i) => [i.candidate.id, i.compact])).toEqual([
      ['indoor.purifier', true],
      ['indoor.ventilation-tradeoff', false],
      ['indoor.cooking-ventilate', false],
      ['indoor.smoke-sources', false],
    ]);
    // A featured item with no period stays in full in its topic.
    expect(swaps.items.map((i) => [i.candidate.id, i.compact])).toEqual([
      ['swap.no-open-burning', false],
      ['swap.fewer-car-trips', false],
    ]);
    expect(outdoors.items[0].period).toBe('morning');
  });

  it('always returns the three topics, even when empty', () => {
    const { topics } = groupPlan({
      ...rulesPlanFixture,
      featured: [],
      more: [],
    });

    expect(topics.map((topic) => [topic.section, topic.items])).toEqual([
      ['action', []],
      ['indoor', []],
      ['swap', []],
    ]);
  });

  it('never shows a notice as a topic item', () => {
    const notice = rulesPlanFixture.notices[0];
    const plan = {
      ...rulesPlanFixture,
      more: [notice],
    };

    expect(ids(plan)).not.toContain(notice.id);
  });
});

describe('madeByLine', () => {
  it('says who made the plan', () => {
    expect(madeByLine(rulesPlanFixture)).toBe(
      'Made by our rules. AI personalisation is unavailable right now.',
    );
    expect(madeByLine(aiPlanFixture)).toBe(
      'Made with AI (gemini-3.8-flash, prompt daily-plan-v1). The advice text and sources come from our fixed rules.',
    );
  });
});

describe('inputLabel', () => {
  it('labels inputs in plain words and never hides an unknown one', () => {
    expect(inputLabel('routine.outdoorExercise')).toBe(
      'Your answer to "Do you exercise outdoors?"',
    );
    expect(inputLabel('householdNeeds.includesChildren')).toBe(
      'Your answer to "Are there children in your home?"',
    );
    expect(inputLabel('air.level')).toBe('the 24-hour forecast check');
    expect(inputLabel('air.PM2_5')).toBe('the PM2.5 24-hour forecast average');
    expect(inputLabel('air.PM10')).toBe('the PM10 24-hour forecast average');
    expect(inputLabel('weather.wind')).toBe('weather.wind');
  });
});

describe('basedOn', () => {
  it('describes the evidence', () => {
    expect(basedOn('data_driven_rule')).toBe("today's forecast check");
    expect(basedOn('general_suggestion')).toBe('general guidance');
  });
});

describe('checkText', () => {
  it('states each check in words', () => {
    const [pm25, pm10] = rulesPlanFixture.air.checks;
    expect(checkText(pm25)).toBe(
      'PM2.5: 24-hour average 71.2 μg/m³, limit 60 μg/m³, above the limit',
    );
    expect(checkText(pm10)).toBe(
      'PM10: 24-hour average 88.4 μg/m³, limit 100 μg/m³, within the limit',
    );
    expect(checkText(unavailablePlanFixture.air.checks[0])).toBe(
      'PM2.5: 24-hour average not available, limit 60 μg/m³',
    );
  });
});
