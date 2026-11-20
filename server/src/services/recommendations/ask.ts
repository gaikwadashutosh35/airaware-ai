import type {
  AskTopic,
  GuideCard,
  HouseholdContext,
  RecommendationCandidate,
} from '../../../../shared/contracts.ts';
import { ASK_GUIDES, guideSet } from './guides.ts';

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
