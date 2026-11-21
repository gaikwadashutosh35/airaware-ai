import { describe, expect, it } from 'vitest';
import type { PlanOutput } from './planOutput.ts';
import { PLAN_OUTPUT_JSON_SCHEMA, checkPlanOutput } from './planOutput.ts';
import { candidates, input, valid } from './fixtures.ts';

function withSummary(summary: string): PlanOutput {
  return { ...valid(), summary };
}
function withIds(ids: string[]): PlanOutput {
  const base = valid().featured[0]!;
  return { ...valid(), featured: ids.map((id) => ({ ...base, id })) };
}
const highIds = valid().featured.map((f) => f.id);

describe('toWriterInput', () => {
  it('toWriterInput drops times and labels pollutants', () => {
    expect(input.air).not.toHaveProperty('windowStart');
    expect(input.air.checks.map((c) => c.pollutant)).toEqual(['PM2.5', 'PM10']);
    for (const c of input.candidates) {
      expect(Object.keys(c).sort()).toEqual([
        'id',
        'priority',
        'reason',
        'section',
        'text',
        'title',
      ]);
    }
    expect(input.candidates).toHaveLength(candidates.length);
  });
});

describe('checkPlanOutput', () => {
  it('a valid answer passes', () => {
    expect(checkPlanOutput(valid(), input)).toBeNull();
  });

  it('summary length', () => {
    expect(checkPlanOutput(withSummary('a'.repeat(19)), input)).toBe('length');
    expect(checkPlanOutput(withSummary('a'.repeat(301)), input)).toBe('length');
    const short = valid();
    short.featured[0]!.forYou = 'a'.repeat(9);
    expect(checkPlanOutput(short, input)).toBe('length');
  });

  it('ids must match exactly', () => {
    const ids = highIds.map((id) =>
      id === 'commute.lower-traffic' ? 'Commute.lower-traffic ' : id,
    );
    expect(checkPlanOutput(withIds(ids), input)).toBe('ids');
  });

  it('ids must be candidates, unique, non-notice, 1 to 8', () => {
    const extras = [
      'indoor.purifier',
      'indoor.cooking-ventilate',
      'indoor.cleaner-fuel',
      'indoor.smoke-sources',
    ];
    expect(
      checkPlanOutput(withIds([...highIds, 'exercise.run-faster']), input),
    ).toBe('ids');
    expect(checkPlanOutput(withIds([...highIds, highIds[0]!]), input)).toBe(
      'ids',
    );
    expect(checkPlanOutput(withIds([...highIds, 'air.elevated']), input)).toBe(
      'ids',
    );
    expect(checkPlanOutput(withIds([]), input)).toBe('ids');
    expect(checkPlanOutput(withIds([...highIds, ...extras]), input)).toBe(
      'ids',
    );
    expect(
      checkPlanOutput(withIds([...highIds, ...extras.slice(0, 3)]), input),
    ).toBeNull();
  });

  it('every high-priority action is featured', () => {
    const ids = highIds.filter((id) => id !== 'household.extra-caution');
    expect(checkPlanOutput(withIds(ids), input)).toBe('ids');
  });

  it('numbers must come from the input', () => {
    const base = valid().summary;
    expect(
      checkPlanOutput(
        withSummary(`${base} PM2.5 averages 72.4 over 24-hour.`),
        input,
      ),
    ).toBeNull();
    expect(checkPlanOutput(withSummary(`${base} About 15 more.`), input)).toBe(
      'numbers',
    );
    const hours = valid();
    hours.featured[0]!.forYou = 'Keep outdoor time under 3 hours today.';
    expect(checkPlanOutput(hours, input)).toBe('numbers');
  });

  it('banned wording', () => {
    const banned = [
      'safe',
      'Safety',
      'guaranteed',
      'healthy',
      'risk-free',
      'no risk',
      'diagnosis',
      'treatment',
      'cure',
      'medical',
      'prescribed',
      'symptoms',
      'asthma',
      'COPD',
      'inhaler',
      'AQI',
      'https://x.y',
      'www.x.y',
      'always open',
      'close all windows',
      '%',
    ];
    for (const word of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${word}`), input),
        word,
      ).toBe('wording');
    }
  });

  // Final review I1: safety, health and condition wording the first list missed.
  it('banned wording covers comparatives, conditions and the AQI name', () => {
    const banned = [
      'Indoor exercise is the safer choice.',
      'Home is the safest place.',
      'Outdoor air is unsafe.',
      'A healthier day starts indoors.',
      'Children with breathing problems should stay in.',
      'Anyone with trouble breathing should rest.',
      'Anyone with lung or heart conditions should rest.',
      'This matters for respiratory comfort.',
      'People with allergies should take care.',
      'Bronchitis can flare up.',
      'Pregnant members should rest.',
      'Heart disease is a concern.',
      'Avoid illness today.',
      'Above the air quality index limit.',
    ];
    for (const sentence of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${sentence}`), input),
        sentence,
      ).toBe('wording');
    }
  });

  // Final review I2: a within-limit day is not clean or free of risk.
  it('banned wording covers reassurance about the air', () => {
    const banned = [
      'Risk is low risk today.',
      'There is little risk today.',
      'Minimal risk for outdoor plans.',
      'Enjoy the clean air.',
      'The air is clean today.',
      'It is a good day for a run.',
      'Good air all day.',
      'Air quality is good today.',
      // Phase 10 final review: the same rule bans "bad air".
      'Expect bad air in the evening.',
    ];
    for (const sentence of banned) {
      expect(
        checkPlanOutput(withSummary(`${valid().summary} ${sentence}`), input),
        sentence,
      ).toBe('wording');
    }
  });

  it('legitimate echoes of the rules still pass', () => {
    expect(
      checkPlanOutput(
        withSummary(
          'Check local conditions and follow local public-health advisories over the next 24 hours.',
        ),
        input,
      ),
    ).toBeNull();
  });

  // Final review I3: numbers written as words, or reused with a new unit.
  it('number words and units must come from the input', () => {
    const summaries = [
      `${valid().summary} PM2.5 is nearly twice the national limit.`,
      `${valid().summary} Keep outdoor time under 60 minutes.`,
      `${valid().summary} Go out before 10am.`,
      `${valid().summary} Stay within 5 km of home.`,
    ];
    for (const summary of summaries) {
      expect(checkPlanOutput(withSummary(summary), input), summary).toBe(
        'numbers',
      );
    }
    const twoHours = valid();
    twoHours.featured[0]!.forYou = 'Keep outdoor time to about two hours.';
    expect(checkPlanOutput(twoHours, input)).toBe('numbers');
  });
});

describe('PLAN_OUTPUT_JSON_SCHEMA', () => {
  it('the JSON schema has the three fields', () => {
    const schema = PLAN_OUTPUT_JSON_SCHEMA as {
      properties: {
        summary: unknown;
        featured: { items: { properties: { period: { enum: string[] } } } };
      };
    };
    expect(schema.properties.summary).toBeDefined();
    expect(schema.properties.featured.items.properties.period.enum).toEqual([
      'morning',
      'commute',
      'daytime',
      'evening',
      'home',
    ]);
  });
});
