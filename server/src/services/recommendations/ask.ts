import { z } from 'zod';
import type {
  AirAssessment,
  AskAnswer,
  AskTopic,
  FollowUp,
  GuideCard,
  HouseholdContext,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import type { CachedForecast } from '../air-data/cachedForecast.ts';
import { toWriterInput } from '../ai/planOutput.ts';
import { PROMPT_VERSION } from '../ai/prompts.ts';
import { assessAir } from './airCheck.ts';
import { placeSchema, type PlanRequest, type PlanWriter } from './dailyPlan.ts';
import { ASK_GUIDES, guideSet } from './guides.ts';
import { householdContextSchema } from './householdContext.ts';
import { buildPlan } from './plan.ts';
import { buildCandidates } from './rules.ts';

export const ASK_TOPICS = [
  'outdoors',
  'windows',
  'indoor',
  'family',
  'commuting',
  'habits',
] as const satisfies readonly AskTopic[];

// Exactly one of a typed question or a topic (owner decision 1). Zod's
// messages never repeat the input, so a 400 cannot echo the question.
const base = {
  place: placeSchema,
  householdContext: householdContextSchema.optional(),
};
export const askRequestSchema = z.union([
  z.strictObject({ question: z.string().trim().min(1).max(200), ...base }),
  z.strictObject({ topic: z.enum(ASK_TOPICS), ...base }),
]);

// Ask AirAware (Phase 7): which cards answer each topic. The question never
// reaches this file; only its topic does.

const HOME_GUIDES = guideSet('home').groups.flatMap((g) => g.cards);
const HABIT_GUIDES = guideSet('habits').groups.flatMap((g) => g.cards);
const GUIDES = new Map<string, GuideCard>(
  [...ASK_GUIDES, ...HOME_GUIDES, ...HABIT_GUIDES].map((c) => [c.id, c]),
);

// Rules answer personally (when they fire); guides answer in general.
export const TOPIC_CARDS: Record<
  AskTopic,
  { rules: string[]; guides: string[] }
> = {
  outdoors: {
    rules: [
      'exercise.indoor-alternative',
      'exercise.check-conditions',
      'commute.lower-traffic',
    ],
    guides: ['guide.check-forecast', 'guide.away-from-traffic'],
  },
  windows: {
    rules: [
      'indoor.ventilation-tradeoff',
      'indoor.cooking-ventilate',
      'home.busy-road',
    ],
    // guide.busy-road is left out: its twin rule or the yes-gate always
    // hides it here.
    guides: ['guide.ventilate-sources'],
  },
  indoor: {
    rules: [
      'indoor.ventilation-tradeoff',
      'indoor.purifier',
      'indoor.cooking-exhaust',
      'indoor.cooking-ventilate',
      'indoor.cleaner-fuel',
      'indoor.smoke-sources',
      'home.busy-road',
    ],
    guides: HOME_GUIDES.map((c) => c.id),
  },
  family: {
    rules: ['household.extra-caution', 'school.less-roadside-waiting'],
    guides: ['guide.children', 'guide.older-sensitive', 'guide.school-run'],
  },
  commuting: {
    rules: [
      'commute.lower-traffic',
      'school.less-roadside-waiting',
      'swap.fewer-car-trips',
    ],
    guides: ['guide.away-from-traffic', 'guide.no-idling', 'guide.school-run'],
  },
  habits: {
    rules: [
      'swap.fewer-car-trips',
      'swap.no-open-burning',
      'indoor.cleaner-fuel',
    ],
    guides: HABIT_GUIDES.map((c) => c.id),
  },
};

const PRIORITY = { high: 0, medium: 1, low: 2 } as const;

// Up to three cards: the topic's rules that fired for this household, most
// important first, then its guides. Never a notice (the verdict says that).
export function chooseCards(
  topic: AskTopic,
  candidates: RecommendationCandidate[],
  context: HouseholdContext,
): RecommendationCandidate[] {
  const { rules, guides } = TOPIC_CARDS[topic];
  const personal = candidates
    .filter((c) => c.section !== 'notice' && rules.includes(c.id))
    .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
  const shown = new Set(personal.map((c) => c.id));
  // The same three hide rules as My Home (client/src/pages/MyHome.tsx):
  // never a guide beside its twin, or against the person's own answer.
  const general = guides
    .map((id) => GUIDES.get(id)!)
    .filter(
      (card) =>
        !(card.personalRuleId && shown.has(card.personalRuleId)) &&
        !(
          card.id === 'guide.busy-road' && context.home?.nearBusyRoad !== 'yes'
        ) &&
        !(
          card.id === 'guide.kitchen-exhaust' &&
          context.home?.kitchenExhaust === false
        ),
    );
  return [...personal, ...general].slice(0, 3);
}

// Guided chat (spec 2026-11-21 §5.2): the household questions AirAware may
// ask back per topic, in order. Never "may be more sensitive" (Profile only).
export const FOLLOW_UPS: Record<AskTopic, readonly string[]> = {
  outdoors: ['routine.outdoorExercise', 'routine.commuteMode'],
  windows: ['home.nearBusyRoad', 'home.kitchenExhaust'],
  indoor: [
    'home.cookingFuel',
    'home.kitchenExhaust',
    'home.airPurifier',
    'home.nearBusyRoad',
  ],
  family: [
    'householdNeeds.includesChildren',
    'householdNeeds.includesOlderAdults',
    'routine.schoolCommute',
  ],
  commuting: ['routine.commuteMode', 'routine.schoolCommute'],
  habits: ['routine.commuteMode', 'home.cookingFuel'],
};

// Each question's answers as My Profile writes them: 'boolean' is Yes/No.
export const FIELD_VALUES: Record<string, readonly string[] | 'boolean'> = {
  'routine.commuteMode': [
    'walk',
    'cycle',
    'two_wheeler',
    'car',
    'public_transport',
    'work_from_home',
  ],
  'routine.outdoorExercise': 'boolean',
  'routine.schoolCommute': 'boolean',
  'home.nearBusyRoad': ['yes', 'no', 'unknown'],
  'home.cookingFuel': [
    'lpg',
    'electric',
    'biomass',
    'other',
    'prefer_not_to_say',
  ],
  'home.kitchenExhaust': 'boolean',
  'home.airPurifier': 'boolean',
  'householdNeeds.includesChildren': 'boolean',
  'householdNeeds.includesOlderAdults': 'boolean',
};

// The answers with one more given; 'yes'/'no' are true/false for a Yes/No
// question.
export function withAnswer(
  context: HouseholdContext,
  field: string,
  value: string,
): HouseholdContext {
  const [group, key] = field.split('.') as [string, string];
  const groups = context as Record<string, Record<string, unknown> | undefined>;
  const answer = FIELD_VALUES[field] === 'boolean' ? value === 'yes' : value;
  return { ...groups, [group]: { ...groups[group], [key]: answer } };
}

// The topic's unanswered questions whose answers would change today's cards
// (today's air and the three-card cap included). Rules only, no AI call.
export function followUpsFor(
  topic: AskTopic,
  context: HouseholdContext,
  air: AirAssessment,
): FollowUp[] {
  const ids = (c: HouseholdContext) =>
    chooseCards(topic, buildCandidates(c, air), c)
      .map((card) => card.id)
      .join();
  const now = ids(context);
  const groups = context as Record<string, Record<string, unknown> | undefined>;
  return FOLLOW_UPS[topic].flatMap((field) => {
    const [group, key] = field.split('.') as [string, string];
    if (groups[group]?.[key] !== undefined) return [];
    const values = FIELD_VALUES[field];
    const changes = (values === 'boolean' ? ['yes', 'no'] : values!).filter(
      (value) => ids(withAnswer(context, field, value)) !== now,
    );
    return changes.length ? [{ field, changes }] : [];
  });
}

// An Ask summary must never read as a yes or no on safety (spec §7.4). The
// plan's own checks already refuse "safe", "healthy" and numbers.
const VERDICT =
  /(?:^\s*(?:yes|no)\b)|\bgo ahead\b|\b(fine|ok|okay|alright) to\b|\b(good|bad) idea\b/i;

export type Asker = (
  topic: AskTopic | 'medical' | 'out_of_scope',
  request: PlanRequest,
  now: Date,
) => Promise<AskAnswer>;

// Builds an answer from the forecast check, the topic's cards and the
// shared plan writer. It never receives the question: only its topic.
export function createAsker(deps: {
  forecast: CachedForecast;
  write: PlanWriter | null;
}): Asker {
  return async (topic, { place, householdContext = {} }, now) => {
    // A provider failure is not an error here: the answer says air is unknown.
    const series = await deps
      .forecast(place.latitude, place.longitude, now)
      .catch(() => null);
    const air = assessAir(series, now);
    const candidates = buildCandidates(householdContext, air);
    const notices = candidates.filter((c) => c.section === 'notice');
    // Medical and out-of-scope answers show no cards and call no AI.
    const answered = topic !== 'medical' && topic !== 'out_of_scope';
    const cards = answered
      ? chooseCards(topic, candidates, householdContext)
      : [];

    let ai =
      answered && deps.write
        ? await deps.write(toWriterInput(air, [...notices, ...cards]), now)
        : null;
    if (ai && VERDICT.test(ai.output.summary)) {
      console.error('Ask summary failed: verdict');
      ai = null;
    }
    // Our card order; the AI's featured order and "for you" lines are not used.
    const plan = buildPlan({
      label: place.label,
      air,
      forecast: series,
      candidates: [...notices, ...cards],
      ai: ai && { ...ai, promptVersion: PROMPT_VERSION },
    });
    return {
      topic,
      cards,
      summary: plan.summary,
      generatedBy: plan.generatedBy,
      air,
      forecast: plan.forecast,
      notices,
      sources: plan.sources,
      safetyNote: plan.safetyNote,
      followUps: answered ? followUpsFor(topic, householdContext, air) : [],
    };
  };
}
