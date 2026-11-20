import type {
  GuideCard,
  GuideGroup,
  GuideTopic,
  GuideSet,
  RecommendationCandidate,
  SourceReferenceId,
} from '../../../../shared/contracts.ts';
import { SAFETY_NOTE } from './plan.ts';
import { SOURCE_REFERENCES } from './rules.ts';

// The guide library (decision G1 A): general advice for any day, with a
// neutral reason and cited sources. Wording is fixed by
// docs/superpowers/specs/2026-11-20-guide-library.md; change it there first
// (DATA_GOVERNANCE.md §8). Guide cards never enter a daily plan.

type Draft = Pick<
  RecommendationCandidate,
  'section' | 'title' | 'text' | 'reason' | 'caveat' | 'sourceIds'
> & { id: string; personalRuleId?: string };

function card(draft: Draft): GuideCard {
  return {
    ...draft,
    priority: 'medium',
    evidenceType: 'general_suggestion',
    inputsUsed: [],
  };
}

const KITCHEN_EXHAUST = card({
  id: 'guide.kitchen-exhaust',
  personalRuleId: 'indoor.cooking-exhaust',
  section: 'indoor',
  title: 'Use the kitchen exhaust while cooking',
  text: 'Switch the exhaust or chimney on before you start cooking and leave it running for a few minutes after.',
  reason:
    'Cooking gives off smoke and fine particles, and removing them where they start comes first.',
  caveat: 'Some kitchen hoods recirculate air instead of venting it outside.',
  sourceIds: ['epa-indoor-pm', 'mohfw-air-advisory-2025'],
});

const CLEANER_FUEL = card({
  id: 'guide.cleaner-fuel',
  personalRuleId: 'indoor.cleaner-fuel',
  section: 'indoor',
  title: 'Consider a cleaner cooking fuel where possible',
  text: 'Wood, dung or crop waste fires make a lot of indoor smoke. Where it is practical, cooking with LPG or electricity cuts this smoke at the source.',
  reason:
    'Cooking with wood, dung, crop waste, coal or kerosene is a major cause of household air pollution.',
  caveat:
    'Until then, good kitchen ventilation and keeping others away from the stove help.',
  sourceIds: ['who-household-air', 'mohfw-air-advisory-2025'],
});

const VENTILATE_SOURCES = card({
  id: 'guide.ventilate-sources',
  section: 'indoor',
  title: 'Air out while you cook or burn incense',
  text: 'Open windows or switch on an exhaust fan while you cook or burn incense or candles. When the air outside is poor, keep windows open for shorter spells.',
  reason:
    'Fresh air carries indoor smoke away, but on polluted days it also brings outdoor particles in.',
  caveat:
    'There is no single rule for windows: it depends on what is happening indoors and outside.',
  sourceIds: ['mohfw-air-advisory-2025', 'epa-indoor-pm'],
});

const DAMP_CLEANING = card({
  id: 'guide.damp-cleaning',
  section: 'indoor',
  title: 'Clean with a damp cloth or mop',
  text: 'Dust surfaces with a damp cloth and mop floors instead of sweeping them dry.',
  reason: 'Dry sweeping and dusting lift settled dust back into the air.',
  sourceIds: ['epa-indoor-pm', 'mohfw-air-advisory-2025'],
});

const SMOKE_SOURCES = card({
  id: 'guide.smoke-sources',
  personalRuleId: 'indoor.smoke-sources',
  section: 'indoor',
  title: 'Cut indoor smoke at the source',
  text: 'Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step.',
  reason: 'These are common indoor pollution sources in any home.',
  sourceIds: ['mohfw-air-advisory-2025', 'epa-indoor-pm'],
});

const PURIFIER = card({
  id: 'guide.purifier',
  personalRuleId: 'indoor.purifier',
  section: 'indoor',
  title: 'If you use an air purifier, match it to the room',
  text: "A portable purifier cleans the air of one room. Choose one rated for that room's size, and keep its doors and windows closed while it runs.",
  reason: 'A purifier works best in a closed room that matches its rating.',
  caveat: 'A purifier does not remove every pollutant.',
  sourceIds: ['epa-air-cleaners'],
});

const BUSY_ROAD = card({
  id: 'guide.busy-road',
  personalRuleId: 'home.busy-road',
  section: 'indoor',
  title: 'Near a busy road, air out at quieter times',
  text: 'Air beside busy roads usually carries more traffic exhaust, especially at rush hour. When you air out your home, quieter traffic times are a better choice where possible.',
  reason:
    'Particle pollution is higher near busy roads, especially during morning and evening rush hours.',
  sourceIds: ['epa-indoor-pm', 'epa-near-road-schools'],
});

const NO_IDLING = card({
  id: 'guide.no-idling',
  personalRuleId: 'swap.fewer-car-trips',
  section: 'swap',
  title: 'Switch off the engine while you wait',
  text: 'Turn the engine off at red lights and while waiting, instead of idling. For some trips, public transport or sharing a ride may be practical.',
  reason:
    'An idling engine adds exhaust to the air around you and the people nearby.',
  caveat:
    'We do not estimate emission savings, because we have no documented method for your vehicle and trips.',
  sourceIds: ['pib-grap-stage1-2026', 'mohfw-air-advisory-2025'],
});

const NO_OPEN_BURNING = card({
  id: 'guide.no-open-burning',
  personalRuleId: 'swap.no-open-burning',
  section: 'swap',
  title: "Don't burn waste or leaves",
  text: 'Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood.',
  reason:
    "India's Solid Waste Management Rules, 2026 say households must not burn their waste on streets or in open public spaces.",
  sourceIds: ['swm-rules-2026', 'mohfw-air-advisory-2025'],
});

const STAR_LABEL = card({
  id: 'guide.star-label',
  section: 'swap',
  title: 'Choose star-labelled appliances',
  text: 'When you buy an appliance, compare its Bureau of Energy Efficiency star label: more stars means it uses less electricity for the same job.',
  reason:
    'The star label rates similar appliances by how efficiently they use electricity.',
  sourceIds: ['bee-star-label', 'pib-ac-default-2020'],
});

const FANS_AND_AC = card({
  id: 'guide.fans-and-ac',
  section: 'swap',
  title: 'Use fans first, and keep the AC at 24 °C',
  text: 'A ceiling or table fan is the first line against the heat. When you use an AC, keep it at its 24 °C default rather than colder.',
  reason:
    "Room ACs sold in India are set to 24 °C by default under the Bureau of Energy Efficiency's standards for using less energy.",
  sourceIds: ['pib-ac-default-2020', 'bee-domestic-tips'],
});

const LIGHTS_OFF = card({
  id: 'guide.lights-off',
  section: 'swap',
  title: 'Switch off lights you are not using',
  text: 'Turn lights off when you leave a room or no longer need them.',
  reason: 'It is the simplest energy step in any home.',
  sourceIds: ['bee-domestic-tips'],
});

// Ask topics (Phase 7 serves them; the ventilation card also answers
// questions about windows).
export const ASK_GUIDES: readonly GuideCard[] = [
  card({
    id: 'guide.check-forecast',
    personalRuleId: 'exercise.check-conditions',
    section: 'action',
    title: 'Check the air before a long outdoor activity',
    text: 'Before a long or hard outdoor session, check the forecast and local air-quality advisories, and follow what they advise for the day.',
    reason:
      "India's health advisory asks people to follow local air-quality forecasts before planning outdoor activity.",
    sourceIds: ['mohfw-air-advisory-2025'],
  }),
  card({
    id: 'guide.away-from-traffic',
    personalRuleId: 'commute.lower-traffic',
    section: 'action',
    title: 'Choose routes and times away from heavy traffic',
    text: 'Where you can, walk, exercise or commute along quieter streets, and outside morning and evening rush hours.',
    reason:
      'Particle pollution is higher near busy roads, especially during rush hours.',
    sourceIds: ['mohfw-air-advisory-2025', 'epa-near-road-schools'],
  }),
  card({
    id: 'guide.children',
    section: 'action',
    title: "Plan children's outdoor play away from traffic and smoke",
    text: 'Choose play spots away from busy roads and from burning or other smoke, and keep children away from cooking and other smoke sources at home.',
    reason:
      'Children breathe more air for their body size than adults, so they take in more of what is in it.',
    sourceIds: ['epa-indoor-pm', 'mohfw-air-advisory-2025'],
  }),
  card({
    id: 'guide.older-sensitive',
    section: 'action',
    title: "Older adults and sensitive people: follow the day's advisory",
    text: "On days above the limit, India's health advisory asks older adults and people who may be more sensitive to avoid prolonged or strenuous exertion outdoors.",
    reason:
      'The advisory names older people among the groups more affected by air pollution.',
    sourceIds: ['mohfw-air-advisory-2025'],
  }),
  card({
    id: 'guide.school-run',
    personalRuleId: 'school.less-roadside-waiting',
    section: 'action',
    title: 'Less waiting beside busy roads on the school run',
    text: 'Where you can, wait for school transport or pick-ups away from the roadside, and follow any advisory from the school or local authorities.',
    reason:
      'Health guidance names the trip to school and the school gate as places to take care, because busy roads and idling vehicles raise particle levels.',
    sourceIds: ['mohfw-air-advisory-2025', 'epa-near-road-schools'],
  }),
];

const GROUPS: Record<GuideTopic, GuideGroup[]> = {
  home: [
    {
      id: 'cooking',
      heading: 'Cooking and smoke',
      cards: [KITCHEN_EXHAUST, CLEANER_FUEL],
    },
    { id: 'ventilation', heading: 'Ventilation', cards: [VENTILATE_SOURCES] },
    { id: 'dust', heading: 'Dust and cleaning', cards: [DAMP_CLEANING] },
    { id: 'indoor-habits', heading: 'Indoor habits', cards: [SMOKE_SOURCES] },
    { id: 'filtration', heading: 'Filtration', cards: [PURIFIER] },
    // My Home shows this group only after a yes to "near a busy road".
    { id: 'busy-road', heading: 'Near a busy road', cards: [BUSY_ROAD] },
  ],
  habits: [
    {
      id: 'commuting',
      heading: 'Daily commuting and vehicle idling',
      cards: [NO_IDLING],
    },
    { id: 'waste', heading: 'Waste', cards: [NO_OPEN_BURNING] },
    { id: 'cooking', heading: 'Cooking', cards: [CLEANER_FUEL] },
    {
      id: 'energy',
      heading: 'Energy use',
      cards: [STAR_LABEL, FANS_AND_AC, LIGHTS_OFF],
    },
  ],
};

// One topic's groups, the sources they cite (in registry order, as plans
// list theirs) and the safety note.
export function guideSet(topic: GuideTopic): GuideSet {
  const groups = GROUPS[topic];
  const cited = new Set(
    groups.flatMap((group) => group.cards.flatMap((c) => c.sourceIds)),
  );
  const sources = (Object.keys(SOURCE_REFERENCES) as SourceReferenceId[])
    .filter((id) => cited.has(id))
    .map((id) => ({ id, ...SOURCE_REFERENCES[id] }));
  return { topic, groups, sources, safetyNote: SAFETY_NOTE };
}
