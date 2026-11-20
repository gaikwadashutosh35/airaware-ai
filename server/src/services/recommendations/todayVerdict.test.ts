// Today's verdict repeats the rules' air notice: its title and, when the
// forecast is within the limits, the caveat's first sentence, word for word.
import { describe, expect, it } from 'vitest';
import type { AirAssessment } from '../../../../shared/contracts.ts';
import { verdictFrom } from '../../../../client/src/features/today/today.ts';
import { buildCandidates } from './rules.ts';

function assessment(level: AirAssessment['level']): AirAssessment {
  const known = level !== 'unknown';
  return {
    level,
    windowStart: known ? '2026-11-19T00:00:00.000Z' : null,
    checks: [
      {
        pollutant: 'PM2_5',
        status: !known
          ? 'unknown'
          : level === 'elevated'
            ? 'above_limit'
            : 'within_limit',
        average24h: known ? (level === 'elevated' ? 75 : 40) : null,
        limit: 60,
      },
      {
        pollutant: 'PM10',
        status: known ? 'within_limit' : 'unknown',
        average24h: known ? 80 : null,
        limit: 100,
      },
    ],
  };
}

describe("Today's verdict", () => {
  it("uses the air notice's own title and caveat", () => {
    for (const level of ['elevated', 'not_elevated', 'unknown'] as const) {
      const air = assessment(level);
      const notice = buildCandidates({}, air).find(
        (c) => c.section === 'notice',
      );
      const verdict = verdictFrom(air);

      expect(verdict.title).toBe(notice?.title);
      if (verdict.caveat) {
        expect(notice?.caveat?.startsWith(verdict.caveat)).toBe(true);
      }
    }
  });
});
