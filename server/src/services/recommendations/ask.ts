import { z } from 'zod';
import type {
  AirAssessment,
  AskAnswer,
  AskHistoryItem,
  AskTopic,
  FollowUp,
  GuideCard,
  HouseholdContext,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import type { CachedForecast } from '../air-data/cachedForecast.ts';
import { ASK_TOPICS, VERDICT } from '../ai/askOutput.ts';
import type { AskWriter } from '../ai/askWriter.ts';
import { toWriterInput } from '../ai/planOutput.ts';
import { ASK_PROMPT_VERSION, PROMPT_VERSION } from '../ai/prompts.ts';
import { assessAir } from './airCheck.ts';
import { placeSchema, type PlanRequest, type PlanWriter } from './dailyPlan.ts';
import { ASK_GUIDES, guideSet } from './guides.ts';
import { householdContextSchema } from './householdContext.ts';
import { buildPlan } from './plan.ts';
import { buildCandidates } from './rules.ts';

export { ASK_TOPICS };

// Exactly one of a typed question or a topic (owner decision 1). Zod's
// messages never repeat the input, so a 400 cannot echo the question.
const base = {
  place: placeSchema,
  householdContext: householdContextSchema.optional(),
};
export const askRequestSchema = z.union([
  z.strictObject({
    question: z.string().trim().min(1).max(200),
    history: z
      .array(
        z.strictObject({
          question: z.string().trim().min(1).max(200),
          cardIds: z.array(z.string().min(1).max(60)).max(3),
        }),
      )
      .max(2)
      .optional(),
    ...base,
  }),
  z.strictObject({ topic: z.enum(ASK_TOPICS), ...base }),
]);

// Ask AirAware (Phase 7): which cards answer each topic. A typed question
// reaches only the Ask writer (J26), never the plan writer.

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

// The topic's rules that fired for this household, most important first,
// then its guides. Never a notice (the verdict says that).
export function rankCards(
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
  return [...personal, ...general];
}

// Up to three cards for the topic.
export function chooseCards(
  topic: AskTopic,
  candidates: RecommendationCandidate[],
  context: HouseholdContext,
): RecommendationCandidate[] {
  return rankCards(topic, candidates, context).slice(0, 3);
}

// Every card any topic could show: what Claude may pick from.
export function eligibleCards(
  candidates: RecommendationCandidate[],
  context: HouseholdContext,
): RecommendationCandidate[] {
  const byId = new Map<string, RecommendationCandidate>();
  for (const topic of ASK_TOPICS) {
    for (const c of rankCards(topic, candidates, context)) byId.set(c.id, c);
  }
  return [...byId.values()];
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

// The typed question and the last few exchanges, for the Ask writer only.
export interface AskQuestion {
  text: string;
  history: AskHistoryItem[];
}

export type Asker = (
  topic: AskTopic | 'medical' | 'out_of_scope',
  request: PlanRequest,
  now: Date,
  question?: AskQuestion,
) => Promise<AskAnswer>;

// Builds an answer from the forecast check and the topic's cards. A typed
// question goes to the Ask writer (Claude) and nowhere else; the plan writer
// only ever sees the topic.
export function createAsker(deps: {
  forecast: CachedForecast;
  write: PlanWriter | null;
  askWriter?: AskWriter | null;
}): Asker {
  return async (topic, { place, householdContext = {} }, now, question) => {
    // A provider failure is not an error here: the answer says air is unknown.
    const series = await deps
      .forecast(place.latitude, place.longitude, now)
      .catch(() => null);
    const air = assessAir(series, now);
    const candidates = buildCandidates(householdContext, air);
    const notices = candidates.filter((c) => c.section === 'notice');

    // One place builds the plan and the answer, for rules and Claude alike.
    const assemble = (
      t: AskTopic | 'medical' | 'out_of_scope',
      cards: RecommendationCandidate[],
      ai: Parameters<typeof buildPlan>[0]['ai'],
      followUps: FollowUp[],
    ): AskAnswer => {
      // Our card order; the AI's featured order and "for you" lines are not used.
      const plan = buildPlan({
        label: place.label,
        air,
        forecast: series,
        candidates: [...notices, ...cards],
        ai,
      });
      return {
        topic: t,
        cards,
        summary: plan.summary,
        generatedBy: plan.generatedBy,
        air,
        forecast: plan.forecast,
        notices,
        sources: plan.sources,
        safetyNote: plan.safetyNote,
        followUps,
      };
    };

    // The rules answer for a topic; also the fallback and the out-of-scope one.
    const rulesAnswer = async (
      t: AskTopic | 'medical' | 'out_of_scope',
      usePlanWriter: boolean,
    ): Promise<AskAnswer> => {
      // Medical and out-of-scope answers show no cards and call no AI.
      const answered = t !== 'medical' && t !== 'out_of_scope';
      const cards = answered
        ? chooseCards(t, candidates, householdContext)
        : [];
      let ai =
        answered && usePlanWriter && deps.write
          ? await deps.write(toWriterInput(air, [...notices, ...cards]), now)
          : null;
      if (ai && VERDICT.test(ai.output.summary)) {
        console.error('Ask summary failed: verdict');
        ai = null;
      }
      return assemble(
        t,
        cards,
        ai && { ...ai, promptVersion: PROMPT_VERSION },
        answered ? followUpsFor(t, householdContext, air) : [],
      );
    };

    if (!question || !deps.askWriter || topic === 'medical')
      return rulesAnswer(topic, true);

    const eligible = eligibleCards(candidates, householdContext);
    const title = (id: string) =>
      candidates.find((c) => c.section !== 'notice' && c.id === id)?.title ??
      GUIDES.get(id)?.title;
    const result = await deps.askWriter(
      {
        ...toWriterInput(air, eligible),
        forecast: series && {
          provider: series.provider,
          dataKind: series.dataKind,
          limitations: series.limitations,
        },
        question: question.text,
        earlier: question.history.map((h) => ({
          question: h.question,
          cards: h.cardIds.flatMap((id) => title(id) ?? []),
        })),
      },
      new Set(eligible.map((c) => c.id)),
      now,
    );
    if (!result) return rulesAnswer(topic, false);
    const { output, model } = result;
    if (output.scope === 'out_of_scope')
      return rulesAnswer('out_of_scope', false);

    const byId = new Map(eligible.map((c) => [c.id, c]));
    const cards = output.cardIds.map((id) => byId.get(id)!);
    return assemble(
      output.topic,
      cards,
      {
        output: { summary: output.answer, featured: [] },
        model,
        promptVersion: ASK_PROMPT_VERSION,
      },
      cards.length ? followUpsFor(output.topic, householdContext, air) : [],
    );
  };
}
