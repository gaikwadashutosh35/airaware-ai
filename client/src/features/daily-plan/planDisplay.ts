// How a daily plan is laid out on screen (Phase 7 design, "Plan display
// rules"). Pure, so the rules are tested without rendering.
import type {
  AirAssessment,
  DailyPlan,
  PlanPeriod,
  PollutantCheck,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import type { ApiError } from '../../services/api.ts';
import { clockTime } from '../ask/ask.ts';
import { verdictFrom } from '../today/today.ts';
import { FIELDS, fieldId } from './householdFields.ts';

// What Today's plan area shows, for My Home (Phase 8): never a plan Today
// hides. 'none' before a build; 'stale' instead of a plan whose forecast is
// more than an hour old.
export type PlanReport =
  | { kind: 'none' }
  | { kind: 'building' }
  | { kind: 'error'; error: ApiError; retry: () => void }
  | { kind: 'stale' }
  | { kind: 'ready'; plan: DailyPlan };

// Shown with a plan whose forecast is more than an hour old.
export const PLAN_STALE =
  'The forecast behind this plan is more than an hour old.';

export type Topic = 'action' | 'indoor' | 'swap';

export interface PlanItem {
  candidate: RecommendationCandidate;
  forYou: string | null;
  period: PlanPeriod | null;
  // True for a repeat of a "Your day" item: title and its period only.
  compact: boolean;
}

export const PERIODS: ReadonlyArray<readonly [PlanPeriod, string]> = [
  ['morning', 'Morning'],
  ['commute', 'Commute'],
  ['daytime', 'Daytime'],
  ['evening', 'Evening'],
  ['home', 'At home'],
];

export const TOPICS: ReadonlyArray<readonly [Topic, string]> = [
  ['action', 'Outdoors and travel'],
  ['indoor', 'Indoor air'],
  ['swap', 'Sustainable swaps'],
];

// "Your day" holds featured items with a period (AI plans only). Every
// suggestion also sits in its topic, so nothing is lost; one already shown
// in "Your day" repeats there in compact form, so nothing is shown twice in
// full.
export function groupPlan(plan: DailyPlan): {
  yourDay: Array<{ period: PlanPeriod; label: string; items: PlanItem[] }>;
  topics: Array<{ section: Topic; heading: string; items: PlanItem[] }>;
} {
  const featured: PlanItem[] = plan.featured.map(
    ({ candidate, period, forYou }) => ({
      candidate,
      period,
      forYou,
      compact: false,
    }),
  );
  const more: PlanItem[] = plan.more.map((candidate) => ({
    candidate,
    period: null,
    forYou: null,
    compact: false,
  }));

  const yourDay = PERIODS.map(([period, label]) => ({
    period,
    label,
    items: featured.filter((item) => item.period === period),
  })).filter((group) => group.items.length > 0);

  const topics = TOPICS.map(([section, heading]) => ({
    section,
    heading,
    items: [
      ...featured.map((item) => ({ ...item, compact: item.period !== null })),
      ...more,
    ].filter((item) => item.candidate.section === section),
  }));

  return { yourDay, topics };
}

export function madeByLine(
  plan: Pick<DailyPlan, 'generatedBy' | 'model' | 'promptVersion'>,
): string {
  return plan.generatedBy === 'ai'
    ? `Made with AI (${plan.model}, prompt ${plan.promptVersion}). The advice text and sources come from our fixed rules.`
    : 'Made by our rules. AI personalisation is unavailable right now.';
}

// A saved plan speaks of the day it was made for, never "today".
export function basedOn(
  evidence: RecommendationCandidate['evidenceType'],
  snapshot = false,
): string {
  if (evidence !== 'data_driven_rule') return 'general guidance';
  return snapshot ? "that day's forecast check" : "today's forecast check";
}

const AIR_INPUTS: Record<string, string> = {
  'air.level': 'the 24-hour forecast check',
  'air.PM2_5': 'the PM2.5 24-hour forecast average',
  'air.PM10': 'the PM10 24-hour forecast average',
};

// An unknown path is shown as it is, never hidden.
export function inputLabel(path: string): string {
  const field = FIELDS.find((f) => fieldId(f) === path);
  if (field) return `Your answer to "${field.label}"`;
  return AIR_INPUTS[path] ?? path;
}

export function checkText(check: PollutantCheck): string {
  const name = check.pollutant === 'PM2_5' ? 'PM2.5' : 'PM10';
  const limit = `limit ${check.limit} μg/m³`;
  if (check.average24h === null || check.status === 'unknown') {
    return `${name}: 24-hour average not available, ${limit}`;
  }
  const status =
    check.status === 'above_limit' ? 'above the limit' : 'within the limit';
  return `${name}: 24-hour average ${check.average24h} μg/m³, ${limit}, ${status}`;
}

// Factual words for the air level, never reassurance.
export const LEVEL_TAG = {
  elevated: 'Above the limit',
  not_elevated: 'Within the limit',
  unknown: 'No data',
} as const;

// A plan built without a forecast says so, word for word.
export const NO_AIR = 'Air information is unavailable for this plan.';

// The air a plan used, for where no verdict is on the page (Phase 10 final
// review): never an air-based card without its kind, source and time. An
// incomplete forecast gives no verdict, so it says so, as Today does.
export function planAirLine(
  air: AirAssessment,
  forecast: NonNullable<DailyPlan['forecast']>,
): string {
  if (air.level === 'unknown') return NO_AIR;
  return `Today: ${verdictFrom(air).title} · Model forecast · ${forecast.provider} · updated ${clockTime(forecast.retrievedAt)}`;
}
