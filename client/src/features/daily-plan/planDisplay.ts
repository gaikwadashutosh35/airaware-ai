// How a daily plan is laid out on screen (Phase 7 design, "Plan display
// rules"). Pure, so the rules are tested without rendering.
import type {
  DailyPlan,
  PlanPeriod,
  PollutantCheck,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import { FIELDS, fieldId } from './householdFields.ts';

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

export function basedOn(
  evidence: RecommendationCandidate['evidenceType'],
): string {
  return evidence === 'data_driven_rule'
    ? "today's forecast check"
    : 'general guidance';
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
