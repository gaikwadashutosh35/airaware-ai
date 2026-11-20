import type {
  AirAssessment,
  HouseholdContext,
  PollutantCheck,
  RecommendationCandidate,
  SourceReferenceId,
} from '../../../../shared/contracts.ts';
import { SOURCE_URL } from '../air-data/openMeteo.ts';
import { NAAQS_24H_LIMITS, UG_PER_M3 } from './airCheck.ts';

// Wording is fixed by docs/superpowers/specs/2026-11-18-phase4-rules-engine-design.md;
// change it there first (DATA_GOVERNANCE.md §8).

export const SOURCE_REFERENCES: Record<
  SourceReferenceId,
  { name: string; url: string }
> = {
  'open-meteo': { name: 'Open-Meteo Air Quality API', url: SOURCE_URL },
  'cpcb-naaqs-2009': {
    name: 'National Ambient Air Quality Standards (CPCB, 18 November 2009)',
    url: 'https://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf',
  },
  // The guide library's sources, opened and checked on 20 Nov 2026
  // (docs/superpowers/specs/2026-11-20-guide-library.md).
  'mohfw-air-advisory-2025': {
    name: 'Health Advisory on Air Pollution (Ministry of Health and Family Welfare, NCDC, 2025)',
    url: 'https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf',
  },
  'who-household-air': {
    name: 'Household air pollution (WHO fact sheet)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health',
  },
  'epa-indoor-pm': {
    name: 'Sources of Indoor Particulate Matter (US EPA)',
    url: 'https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm',
  },
  'epa-air-cleaners': {
    name: 'Guide to Air Cleaners in the Home (US EPA, 2018)',
    url: 'https://www.epa.gov/sites/default/files/2018-07/documents/guide_to_air_cleaners_in_the_home_2nd_edition.pdf',
  },
  'epa-near-road-schools': {
    name: 'Best Practices for Reducing Near-Road Pollution Exposure at Schools (US EPA, 2021)',
    url: 'https://www.epa.gov/system/files/documents/2026-08/best-practices-for-reducing-near-road-pollution-exposure-at-schools.pdf',
  },
  'pib-grap-stage1-2026': {
    name: 'CAQM invokes Stage-I of GRAP in Delhi-NCR (PIB, October 2026)',
    url: 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2326133&reg=3&lang=1',
  },
  'swm-rules-2026': {
    name: 'Solid Waste Management Rules, 2026 (Gazette of India)',
    url: 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jan/doc2026129773501.pdf',
  },
  'bee-star-label': {
    name: 'Standards & Labelling (Bureau of Energy Efficiency)',
    url: 'https://beeindia.gov.in/show_content.php?lang=1&level=1&ls_id=372&lid=322',
  },
  'pib-ac-default-2020': {
    name: 'BEE Notifies New Energy Performance Standards for Air Conditioners (PIB, 6 January 2020)',
    url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1598508',
  },
  'bee-domestic-tips': {
    name: 'Tips for Energy Conservation for Domestic (Bureau of Energy Efficiency)',
    url: 'https://beeindia.gov.in/sites/default/files/Download%20Tips%20for%20Energy%20Conservation%20for%20Domestic.pdf',
  },
};

const LIMITS_REASON = `India's National Ambient Air Quality Standards (CPCB, 2009) set 24-hour limits of ${NAAQS_24H_LIMITS.PM2_5} ${UG_PER_M3} for PM2.5 and ${NAAQS_24H_LIMITS.PM10} ${UG_PER_M3} for PM10.`;
const FORECAST_CAVEAT =
  'This is a model forecast for an area about 45 km wide, not a station measurement and not the CPCB National AQI.';
const ABOVE = 'the forecast is above the national 24-hour limit';

type Draft = Omit<RecommendationCandidate, 'id' | 'evidenceType' | 'sourceIds'>;

interface Rule {
  id: string;
  // 'air' rules rest on the forecast and the NAAQS limits.
  basis: 'air' | 'general';
  when: (context: HouseholdContext, air: AirAssessment) => boolean;
  draft: (context: HouseholdContext, air: AirAssessment) => Draft;
}

const LABELS = { PM2_5: 'PM2.5', PM10: 'PM10' } as const;
const COMMUTE_LABELS = {
  walk: 'walking',
  cycle: 'cycling',
  two_wheeler: 'two-wheeler',
  car: 'car',
} as const;
const CAUTION_GROUPS = [
  ['includesChildren', 'children'],
  ['includesOlderAdults', 'older adults'],
  ['mayBeMoreSensitive', 'someone who may be more sensitive to air pollution'],
] as const;

const elevated = (air: AirAssessment) => air.level === 'elevated';
const average = (check: PollutantCheck) => check.average24h?.toFixed(1) ?? '';

// 'a', 'a and b', 'a, b and c'
function joinList(items: string[]): string {
  const last = items.at(-1) ?? '';
  return items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${last}`
    : last;
}

function cautionGroups(context: HouseholdContext) {
  return CAUTION_GROUPS.filter(([field]) => context.householdNeeds?.[field]);
}

function exposedCommute(context: HouseholdContext) {
  const mode = context.routine?.commuteMode;
  return mode === 'walk' || mode === 'cycle' || mode === 'two_wheeler'
    ? COMMUTE_LABELS[mode]
    : undefined;
}

function vehicleCommute(context: HouseholdContext) {
  const mode = context.routine?.commuteMode;
  return mode === 'car' || mode === 'two_wheeler'
    ? COMMUTE_LABELS[mode]
    : undefined;
}

// Output order is this array's order.
const RULES: Rule[] = [
  {
    id: 'data.unavailable',
    basis: 'general',
    when: (_, air) => air.level === 'unknown',
    draft: () => ({
      section: 'notice',
      priority: 'high',
      title: 'Live air information unavailable',
      text: "We could not get a complete 24-hour forecast for this place, so this plan gives no advice about today's air. The other suggestions apply on any day.",
      reason: 'The forecast was missing, incomplete or in an unexpected unit.',
      inputsUsed: ['air.level'],
    }),
  },
  {
    id: 'air.elevated',
    basis: 'air',
    when: (_, air) => elevated(air),
    draft: (_, air) => ({
      section: 'notice',
      priority: 'high',
      title: "Forecast above India's 24-hour limit",
      text: `The 24-hour model forecast average is above the national limit for ${air.checks
        .filter((check) => check.status === 'above_limit')
        .map(
          (check) =>
            `${LABELS[check.pollutant]} (${average(check)} ${UG_PER_M3}, limit ${check.limit})`,
        )
        .join(' and ')}.`,
      reason: LIMITS_REASON,
      inputsUsed: ['air.PM2_5', 'air.PM10'],
      caveat: FORECAST_CAVEAT,
    }),
  },
  {
    id: 'air.within-limit',
    basis: 'air',
    when: (_, air) => air.level === 'not_elevated',
    draft: (_, air) => ({
      section: 'notice',
      priority: 'medium',
      title: "Forecast within India's 24-hour limits",
      text: `The 24-hour model forecast averages are ${air.checks
        .map(
          (check) =>
            `${LABELS[check.pollutant]} ${average(check)} ${UG_PER_M3} (limit ${check.limit})`,
        )
        .join(' and ')}.`,
      reason: LIMITS_REASON,
      inputsUsed: ['air.PM2_5', 'air.PM10'],
      caveat: `Being within the national limit does not mean the air is clean or free of risk. ${FORECAST_CAVEAT}`,
    }),
  },
  {
    id: 'exercise.indoor-alternative',
    basis: 'air',
    when: (context, air) =>
      context.routine?.outdoorExercise === true && elevated(air),
    draft: () => ({
      section: 'action',
      priority: 'high',
      title: 'Consider an indoor alternative for exercise',
      text: 'Consider exercising indoors today, or keeping outdoor sessions shorter and less intense. Check local conditions before you go.',
      reason: `You said you exercise outdoors, and ${ABOVE}.`,
      inputsUsed: ['routine.outdoorExercise', 'air.level'],
      caveat:
        'Conditions change through the day and across the city; this forecast cannot show a specific park or route.',
    }),
  },
  {
    id: 'exercise.check-conditions',
    basis: 'general',
    when: (context, air) =>
      context.routine?.outdoorExercise === true && !elevated(air),
    draft: () => ({
      section: 'action',
      priority: 'medium',
      title: 'Check conditions before outdoor exercise',
      text: 'Before a long or hard outdoor session, check local air-quality updates and advisories.',
      reason: 'You said you exercise outdoors.',
      inputsUsed: ['routine.outdoorExercise', 'air.level'],
      caveat: 'Air quality can change during the day.',
    }),
  },
  {
    id: 'commute.lower-traffic',
    basis: 'air',
    when: (context, air) =>
      exposedCommute(context) !== undefined && elevated(air),
    draft: (context) => ({
      section: 'action',
      priority: 'high',
      title: 'Consider a lower-traffic route or time',
      text: 'If you have a choice, consider a route with less traffic, or travelling outside the busiest hours.',
      reason: `You travel by ${exposedCommute(context)} close to traffic, and ${ABOVE}.`,
      inputsUsed: ['routine.commuteMode', 'air.level'],
      caveat:
        'No route can promise clean air; this forecast cannot see street-level differences.',
    }),
  },
  {
    id: 'school.less-roadside-waiting',
    basis: 'air',
    when: (context, air) =>
      context.routine?.schoolCommute === true && elevated(air),
    draft: () => ({
      section: 'action',
      priority: 'high',
      title: 'Less waiting beside busy roads on the school run',
      text: 'Where you can, wait for school transport or pick-ups away from the roadside, and follow any advisory from the school or local authorities.',
      reason: `You said your household does a school run, and ${ABOVE}.`,
      inputsUsed: ['routine.schoolCommute', 'air.level'],
      caveat: 'This forecast does not capture street-level pollution.',
    }),
  },
  {
    id: 'household.extra-caution',
    basis: 'air',
    when: (context, air) => cautionGroups(context).length > 0 && elevated(air),
    draft: (context) => {
      const groups = cautionGroups(context);
      return {
        section: 'action',
        priority: 'high',
        title: 'Extra caution for your household',
        text: 'Consider keeping prolonged or strenuous outdoor activity shorter for anyone who may be more affected, and follow local public-health advisories.',
        reason: `You said your household includes ${joinList(groups.map(([, label]) => label))}, and ${ABOVE}.`,
        inputsUsed: [
          ...groups.map(([field]) => `householdNeeds.${field}`),
          'air.level',
        ],
        caveat: 'General information only, not medical advice.',
      };
    },
  },
  {
    id: 'indoor.ventilation-tradeoff',
    basis: 'air',
    when: (_, air) => elevated(air),
    draft: () => ({
      section: 'indoor',
      priority: 'high',
      title: 'Ventilate for indoor sources, not by habit',
      text: 'Outdoor particles are forecast to be high, so windows left open all day let more of them in. Cooking, incense or smoke indoors still needs fresh air, so ventilate while those are going on and for a short while after.',
      reason:
        'The forecast is above the national 24-hour limit, and indoor sources add their own pollution.',
      inputsUsed: ['air.level'],
      caveat:
        'What works best depends on your home. Staying indoors does not protect you by itself if indoor sources are present.',
    }),
  },
  {
    id: 'indoor.purifier',
    basis: 'air',
    when: (context, air) => context.home?.airPurifier === true && elevated(air),
    draft: () => ({
      section: 'indoor',
      priority: 'medium',
      title: 'Run your air purifier where people spend most time',
      text: "Consider running the purifier in the room your household uses most, following the maker's instructions.",
      reason: `You said you have an air purifier, and ${ABOVE}.`,
      inputsUsed: ['home.airPurifier', 'air.level'],
      caveat:
        'A purifier helps with particles in that room; it does not remove every pollutant.',
    }),
  },
  {
    id: 'indoor.cooking-exhaust',
    basis: 'general',
    when: (context) => context.home?.kitchenExhaust === true,
    draft: () => ({
      section: 'indoor',
      priority: 'medium',
      title: 'Use the kitchen exhaust while cooking',
      text: 'Switch the exhaust on before you start cooking and leave it running for a few minutes after.',
      reason:
        'You said your kitchen has an exhaust. Removing cooking smoke at the source comes first.',
      inputsUsed: ['home.kitchenExhaust'],
      caveat:
        'Some kitchen hoods recirculate air instead of venting it outside.',
    }),
  },
  {
    id: 'indoor.cooking-ventilate',
    basis: 'general',
    when: (context) => context.home?.kitchenExhaust === false,
    draft: () => ({
      section: 'indoor',
      priority: 'medium',
      title: 'Ventilate the kitchen while cooking',
      text: 'Open a kitchen window or door while cooking and for a short while after, so smoke and fumes can leave.',
      reason:
        'You said your kitchen has no exhaust, so cooking smoke stays indoors without fresh air.',
      inputsUsed: ['home.kitchenExhaust'],
      caveat:
        'On high-pollution days, keep this to cooking time rather than all day.',
    }),
  },
  {
    id: 'indoor.cleaner-fuel',
    basis: 'general',
    when: (context) => context.home?.cookingFuel === 'biomass',
    draft: () => ({
      section: 'indoor',
      priority: 'medium',
      title: 'Consider a cleaner cooking fuel where possible',
      text: 'Wood, dung or crop waste fires make a lot of indoor smoke. Where it is practical, cooking with LPG or electricity cuts this smoke at the source.',
      reason: 'You said you cook with biomass fuel.',
      inputsUsed: ['home.cookingFuel'],
      caveat:
        'Until then, good kitchen ventilation and keeping others away from the stove help.',
    }),
  },
  {
    id: 'indoor.smoke-sources',
    basis: 'general',
    when: () => true,
    draft: () => ({
      section: 'indoor',
      priority: 'low',
      title: 'Cut indoor smoke at the source',
      text: 'Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step.',
      reason: 'These are common indoor pollution sources in any home.',
      inputsUsed: [],
    }),
  },
  {
    id: 'home.busy-road',
    basis: 'general',
    when: (context) => context.home?.nearBusyRoad === 'yes',
    draft: () => ({
      section: 'indoor',
      priority: 'medium',
      title: 'Your home is near a busy road',
      text: 'Air beside busy roads usually carries more traffic exhaust, especially at rush hour. When you air out your home, quieter traffic times are a better choice where possible.',
      reason: 'You said your home is near a busy road.',
      inputsUsed: ['home.nearBusyRoad'],
      caveat:
        'This forecast covers an area about 45 km wide and cannot show conditions on your street.',
    }),
  },
  {
    id: 'swap.fewer-car-trips',
    basis: 'general',
    when: (context) => vehicleCommute(context) !== undefined,
    draft: (context) => ({
      section: 'swap',
      priority: 'low',
      title: 'Combine trips and avoid idling',
      text: "Combining errands into one trip and switching off the engine while waiting cut your vehicle's exhaust. For some trips, public transport, carpooling, walking or cycling may also be practical.",
      reason: `You said you get around by ${vehicleCommute(context)}.`,
      inputsUsed: ['routine.commuteMode'],
      caveat:
        'We do not estimate emission savings, because we have no documented method for your vehicle and trips.',
    }),
  },
  {
    id: 'swap.no-open-burning',
    basis: 'general',
    when: () => true,
    draft: () => ({
      section: 'swap',
      priority: 'low',
      title: "Don't burn waste or leaves",
      text: 'Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood.',
      reason:
        'Open burning is a local pollution source any household can avoid.',
      inputsUsed: [],
    }),
  },
];

// Every rule's id, for the guide library's checks.
export const RULE_IDS: readonly string[] = RULES.map((rule) => rule.id);

export function buildCandidates(
  context: HouseholdContext,
  air: AirAssessment,
): RecommendationCandidate[] {
  return RULES.filter((rule) => rule.when(context, air)).map((rule) => ({
    id: rule.id,
    ...rule.draft(context, air),
    evidenceType:
      rule.basis === 'air' ? 'data_driven_rule' : 'general_suggestion',
    sourceIds: rule.basis === 'air' ? ['open-meteo', 'cpcb-naaqs-2009'] : [],
  }));
}
