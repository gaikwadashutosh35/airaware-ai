// Test guide sets, shaped like GET /api/v1/recommendations/guides. Short on
// purpose; the real wording lives in the server's guides.ts.
import type { GuideCard, GuideSet } from '../../../shared/contracts.ts';

const SAFETY_NOTE =
  'General information only, not medical advice. Follow local public-health advisories.';
const EPA = {
  id: 'epa-indoor-pm' as const,
  name: 'Sources of Indoor Particulate Matter (US EPA)',
  url: 'https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm',
};

function guide(
  id: string,
  title: string,
  extra: Partial<GuideCard> = {},
): GuideCard {
  return {
    id,
    section: 'indoor',
    priority: 'medium',
    title,
    text: `${title}: the advice.`,
    reason: `${title}: why it matters.`,
    evidenceType: 'general_suggestion',
    sourceIds: ['epa-indoor-pm'],
    inputsUsed: [],
    ...extra,
  };
}

export const homeGuidesFixture: GuideSet = {
  topic: 'home',
  groups: [
    {
      id: 'cooking',
      heading: 'Cooking and smoke',
      cards: [
        guide(
          'guide.kitchen-exhaust',
          'Use the kitchen exhaust while cooking',
          {
            personalRuleId: 'indoor.cooking-exhaust',
          },
        ),
      ],
    },
    {
      id: 'dust',
      heading: 'Dust and cleaning',
      cards: [guide('guide.damp-cleaning', 'Clean with a damp cloth or mop')],
    },
    {
      id: 'indoor-habits',
      heading: 'Indoor habits',
      cards: [
        guide('guide.smoke-sources', 'Cut indoor smoke at the source', {
          personalRuleId: 'indoor.smoke-sources',
        }),
      ],
    },
    {
      id: 'busy-road',
      heading: 'Near a busy road',
      cards: [
        guide('guide.busy-road', 'Near a busy road, air out at quieter times', {
          personalRuleId: 'home.busy-road',
        }),
      ],
    },
  ],
  sources: [EPA],
  safetyNote: SAFETY_NOTE,
};

export const habitsGuidesFixture: GuideSet = {
  topic: 'habits',
  groups: [
    {
      id: 'commuting',
      heading: 'Daily commuting and vehicle idling',
      cards: [
        guide('guide.no-idling', 'Switch off the engine while you wait', {
          section: 'swap',
          personalRuleId: 'swap.fewer-car-trips',
        }),
      ],
    },
    {
      id: 'waste',
      heading: 'Waste',
      cards: [
        guide('guide.no-open-burning', "Don't burn waste or leaves", {
          section: 'swap',
        }),
      ],
    },
    {
      id: 'cooking',
      heading: 'Cooking',
      cards: [
        guide(
          'guide.cleaner-fuel',
          'Consider a cleaner cooking fuel where possible',
        ),
      ],
    },
    {
      id: 'energy',
      heading: 'Energy use',
      cards: [
        guide('guide.fans-and-ac', 'Use fans first, and keep the AC at 24 °C', {
          section: 'swap',
        }),
      ],
    },
  ],
  sources: [EPA],
  safetyNote: SAFETY_NOTE,
};
