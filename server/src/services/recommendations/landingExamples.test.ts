// The landing page's example cards must be the rules' own output, word for
// word: the page shows them as "Example from our rules."
import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import {
  LANDING_EXAMPLES,
  LANDING_SOURCES,
} from '../../../../client/src/pages/landingExamples.ts';
import { SOURCE_REFERENCES, buildCandidates } from './rules.ts';

const HOUSEHOLD: HouseholdContext = {
  routine: { outdoorExercise: true, commuteMode: 'car' },
  home: { kitchenExhaust: true, airPurifier: true },
};

function assessment(level: 'elevated' | 'not_elevated'): AirAssessment {
  const above = level === 'elevated';
  return {
    level,
    windowStart: '2026-11-19T00:00:00.000Z',
    checks: [
      {
        pollutant: 'PM2_5',
        status: above ? 'above_limit' : 'within_limit',
        average24h: above ? 75 : 40,
        limit: 60,
      },
      {
        pollutant: 'PM10',
        status: 'within_limit',
        average24h: 80,
        limit: 100,
      },
    ],
  };
}

// The air level each example was generated for.
const LEVEL: Record<string, 'elevated' | 'not_elevated'> = {
  'exercise.check-conditions': 'not_elevated',
  'indoor.cooking-exhaust': 'elevated',
  'swap.fewer-car-trips': 'elevated',
  'indoor.purifier': 'elevated',
};

describe('landing examples', () => {
  it('shows the chapters in order with chapter 6 open', () => {
    expect(LANDING_EXAMPLES.map((e) => [e.candidate.id, e.openWhy])).toEqual([
      ['exercise.check-conditions', false],
      ['indoor.cooking-exhaust', false],
      ['swap.fewer-car-trips', false],
      ['indoor.purifier', true],
    ]);
  });

  it('the landing examples are real rule output, word for word', () => {
    for (const example of LANDING_EXAMPLES) {
      const level = LEVEL[example.candidate.id];
      expect(level).toBeDefined();
      const real = buildCandidates(HOUSEHOLD, assessment(level!)).find(
        (c) => c.id === example.candidate.id,
      );
      expect(example.candidate).toEqual(real);
    }
  });

  // The registry also holds the guide library's sources (Phase 8), so the
  // landing lists exactly the ones its examples cite, word for word.
  it("the landing sources are the rules' sources", () => {
    const cited = new Set(
      LANDING_EXAMPLES.flatMap((example) => example.candidate.sourceIds),
    );
    expect(LANDING_SOURCES.map((source) => source.id).sort()).toEqual(
      [...cited].sort(),
    );
    for (const source of LANDING_SOURCES) {
      expect(source).toEqual({
        id: source.id,
        ...SOURCE_REFERENCES[source.id],
      });
    }
  });
});
