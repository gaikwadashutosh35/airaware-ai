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
