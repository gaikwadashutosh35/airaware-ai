import { describe, expect, it } from 'vitest';
import type { AirAssessment } from '../../../../shared/contracts.ts';
import type { ModelForecast } from '../air-data/openMeteo.ts';
import { HIGH_IDS, candidates, elevated, valid } from '../ai/fixtures.ts';
import { SAFETY_NOTE, buildPlan } from './plan.ts';
import { SOURCE_REFERENCES, buildCandidates } from './rules.ts';

const unknown: AirAssessment = {
  level: 'unknown',
  windowStart: null,
  checks: [
    { pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 },
    { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 },
  ],
};
const forecast: ModelForecast = {
  provider: 'Open-Meteo',
  sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
  dataKind: 'model_forecast',
  modelResolution: 'CAMS global, about 40 km',
  retrievedAt: '2026-11-18T10:05:00.000Z',
  units: { PM2_5: '\u03bcg/m\u00b3' },
  hours: [{ time: '2026-11-18T10:00:00.000Z', values: { PM2_5: 80 } }],
  limitations: ['A model forecast, not a measurement.'],
};
const order = [
  'household.extra-caution',
  ...HIGH_IDS.filter((id) => id !== 'household.extra-caution'),
];
const output = {
  summary: valid().summary,
  featured: order.map((id, i) => ({
    id,
    period: i === 0 ? ('evening' as const) : ('daytime' as const),
    forYou: `Line for ${id}.`,
  })),
};
const base = {
  label: 'Pune, Maharashtra',
  air: elevated,
  forecast,
  candidates,
};
const rules = buildPlan({ ...base, ai: null });
const ai = buildPlan({
  ...base,
  ai: { output, model: 'gemini-test', promptVersion: 'daily-plan-v1' },
});
const actions = candidates.filter((c) => c.section !== 'notice');

describe('buildPlan', () => {
  it('rules-only plan', () => {
    expect(rules.generatedBy).toBe('rules');
    expect(rules.model).toBeNull();
    expect(rules.promptVersion).toBeNull();
    expect(rules.summary).toBeNull();
    expect(rules.notices).toEqual(
      candidates.filter((c) => c.section === 'notice'),
    );
    expect(rules.featured).toEqual(
      actions.map((candidate) => ({ candidate, period: null, forYou: null })),
    );
    expect(rules.more).toEqual([]);
    expect(rules.place).toEqual({ label: 'Pune, Maharashtra' });
  });

  it("AI plan keeps Gemini's order", () => {
    expect(ai.generatedBy).toBe('ai');
    expect(ai.model).toBe('gemini-test');
    expect(ai.promptVersion).toBe('daily-plan-v1');
    expect(ai.summary).toBe(valid().summary);
    expect(ai.featured.map((f) => f.candidate.id)).toEqual(order);
    expect(ai.featured[0]).toMatchObject({
      period: 'evening',
      forYou: 'Line for household.extra-caution.',
    });
    expect(ai.more).toEqual(actions.filter((c) => !order.includes(c.id)));
  });

  it('notices are always all there', () => {
    expect(rules.notices.map((c) => c.id)).toEqual(['air.elevated']);
    expect(ai.notices.map((c) => c.id)).toEqual(['air.elevated']);
  });

  it("featured candidates are the rules' own text", () => {
    for (const f of [...ai.featured, ...rules.featured]) {
      expect(f.candidate).toEqual(
        candidates.find((c) => c.id === f.candidate.id),
      );
    }
  });

  it('sources are only those cited', () => {
    expect(rules.sources).toEqual([
      { id: 'open-meteo', ...SOURCE_REFERENCES['open-meteo'] },
      { id: 'cpcb-naaqs-2009', ...SOURCE_REFERENCES['cpcb-naaqs-2009'] },
    ]);
    const plan = buildPlan({
      ...base,
      air: unknown,
      candidates: buildCandidates({}, unknown),
      ai: null,
    });
    expect(plan.sources).toEqual([]);
  });

  it('forecast metadata without hours', () => {
    expect(Object.keys(rules.forecast ?? {}).sort()).toEqual([
      'dataKind',
      'limitations',
      'modelResolution',
      'provider',
      'retrievedAt',
      'sourceUrl',
    ]);
    expect(
      buildPlan({ ...base, forecast: null, ai: null }).forecast,
    ).toBeNull();
  });

  it('safety note', () => {
    expect(SAFETY_NOTE).toBe(
      'General information only, not medical advice. Follow local public-health advisories.',
    );
    expect(rules.safetyNote).toBe(SAFETY_NOTE);
    expect(ai.safetyNote).toBe(SAFETY_NOTE);
  });
});
