import { describe, expect, it } from 'vitest';
import type { AirAssessment, DailyPlan } from '../../../../shared/contracts.ts';
import { LIMITATIONS } from '../air-quality/limitations.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { aiPlanFixture, rulesPlanFixture } from '../../test/planFixtures.ts';
import {
  greeting,
  mergedLimitations,
  topRecommendation,
  verdictFrom,
} from './today.ts';

const at = (h: number, m: number) => new Date(2026, 10, 20, h, m);
const check = (
  pollutant: 'PM2_5' | 'PM10',
  status: 'above_limit' | 'within_limit',
) => ({ pollutant, status, average24h: 50, limit: 60 }) as const;

describe('today helpers', () => {
  it('greets by device time', () => {
    expect(greeting(at(4, 59))).toBe('Good evening');
    expect(greeting(at(5, 0))).toBe('Good morning');
    expect(greeting(at(11, 59))).toBe('Good morning');
    expect(greeting(at(12, 0))).toBe('Good afternoon');
    expect(greeting(at(16, 59))).toBe('Good afternoon');
    expect(greeting(at(17, 0))).toBe('Good evening');
  });

  it('the verdict uses the rule titles and plain words', () => {
    const within: AirAssessment = {
      level: 'not_elevated',
      windowStart: null,
      checks: [check('PM2_5', 'within_limit'), check('PM10', 'within_limit')],
    };
    expect(verdictFrom(within)).toEqual({
      title: "Forecast within India's 24-hour limits",
      explanation:
        'Fine and coarse particles are forecast below the national daily limits for the next 24 hours.',
      caveat:
        'Being within the national limit does not mean the air is clean or free of risk.',
    });
    const both = verdictFrom({
      level: 'elevated',
      windowStart: null,
      checks: [check('PM2_5', 'above_limit'), check('PM10', 'above_limit')],
    });
    expect(both.title).toBe("Forecast above India's 24-hour limit");
    expect(both.explanation).toBe(
      'Fine particles (PM2.5) and coarse particles (PM10) are forecast above the national daily limit for the next 24 hours.',
    );
    expect(both.caveat).toBeNull();
    expect(
      verdictFrom({ level: 'unknown', windowStart: null, checks: [] }),
    ).toEqual({
      title: 'Air information unavailable',
      explanation:
        "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day.",
      caveat: null,
    });
  });

  it('an elevated PM10 alone is named alone', () => {
    expect(
      verdictFrom({
        level: 'elevated',
        windowStart: null,
        checks: [check('PM2_5', 'within_limit'), check('PM10', 'above_limit')],
      }).explanation,
    ).toBe(
      'Coarse particles (PM10) are forecast above the national daily limit for the next 24 hours.',
    );
  });

  it('prefers a featured card', () => {
    const top = topRecommendation(aiPlanFixture);
    expect(top?.candidate.id).toBe(aiPlanFixture.featured[0]!.candidate.id);
    expect(top?.forYou).toBe(aiPlanFixture.featured[0]!.forYou);
  });

  it('skips the air notice', () => {
    const top = topRecommendation(rulesPlanFixture);
    expect(top).not.toBeNull();
    expect(top!.candidate.section).not.toBe('notice');
    expect(top!.candidate.id).toBe(
      // Rules plans list their actions in featured, with no period.
      rulesPlanFixture.featured.find((f) => f.candidate.section !== 'notice')!
        .candidate.id,
    );
  });

  it('null when only notices', () => {
    const onlyNotices: DailyPlan = {
      ...rulesPlanFixture,
      featured: [],
      more: [],
    };
    expect(topRecommendation(onlyNotices)).toBeNull();
  });

  it("limitations are distinct and keep the server's words", () => {
    const merged = mergedLimitations(forecastFixture.limitations);
    for (const line of forecastFixture.limitations) {
      expect(merged).toContain(line);
    }
    expect(new Set(merged).size).toBe(merged.length);
    expect(merged).not.toContain(
      'Forecasts are model estimates for an area about 45 km wide, not station measurements.',
    );
    expect(merged).not.toContain('We do not calculate the CPCB National AQI.');
    expect(merged).toContain(
      'AI personalisation can be unavailable; plans then use our fixed rules only.',
    );
  });

  it("limitations without a forecast are the app's own", () => {
    expect(mergedLimitations([])).toEqual([...LIMITATIONS]);
  });
});
