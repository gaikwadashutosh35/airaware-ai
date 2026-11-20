// Today's plain-words pieces (Phase 6). Pure, so the copy is tested without
// rendering. Verdict titles are the existing rule titles (spec §8).
import type { AirAssessment, DailyPlan } from '../../../../shared/contracts.ts';
import { APP_LIMITATIONS, LIMITATIONS } from '../air-quality/limitations.ts';
import type { PlanItem } from '../daily-plan/planDisplay.ts';

export function greeting(
  at: Date,
): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const hour = at.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const NAMES = {
  PM2_5: 'fine particles (PM2.5)',
  PM10: 'coarse particles (PM10)',
} as const;

export function verdictFrom(check: AirAssessment): {
  title: string;
  explanation: string;
  caveat: string | null;
} {
  if (check.level === 'not_elevated') {
    return {
      title: "Forecast within India's 24-hour limits",
      explanation:
        'Fine and coarse particles are forecast below the national daily limits for the next 24 hours.',
      caveat:
        'Being within the national limit does not mean the air is clean or free of risk.',
    };
  }
  if (check.level === 'elevated') {
    const above = check.checks
      .filter((c) => c.status === 'above_limit')
      .map((c) => NAMES[c.pollutant])
      .join(' and ');
    return {
      title: "Forecast above India's 24-hour limit",
      explanation: `${above.charAt(0).toUpperCase()}${above.slice(1)} are forecast above the national daily limit for the next 24 hours.`,
      caveat: null,
    };
  }
  return {
    title: 'Live air information unavailable',
    explanation:
      "We could not get a complete 24-hour forecast for this place, so there's no advice about today's air. The suggestions below apply on any day.",
    caveat: null,
  };
}

// The AI plan's first featured action, else the rules' first action; never a
// notice (the verdict already says it).
export function topRecommendation(plan: DailyPlan): PlanItem | null {
  const featured = plan.featured.find(
    (item) => item.candidate.section !== 'notice',
  );
  if (featured) {
    return {
      candidate: featured.candidate,
      period: featured.period,
      forYou: featured.forYou,
      compact: false,
    };
  }
  const more = plan.more.find((candidate) => candidate.section !== 'notice');
  return more
    ? { candidate: more, period: null, forYou: null, compact: false }
    : null;
}

// The forecast's own limitations, word for word, plus the app's lines no
// forecast line covers; without a forecast, the app's full list.
export function mergedLimitations(
  forecastLimitations: readonly string[],
): string[] {
  return forecastLimitations.length
    ? [...forecastLimitations, ...APP_LIMITATIONS]
    : [...LIMITATIONS];
}
