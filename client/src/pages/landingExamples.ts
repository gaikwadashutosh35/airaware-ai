import type {
  DailyPlan,
  RecommendationCandidate,
} from '../../../shared/contracts.ts';

// The landing page's example cards. The candidates are the server rules' own
// output (buildCandidates, pasted unchanged); a server test,
// landingExamples.test.ts, fails if the rules and these ever differ.
export interface LandingExample {
  heading: string;
  text: string;
  caption: string;
  candidate: RecommendationCandidate;
  openWhy: boolean;
}

export const LANDING_SOURCES: DailyPlan['sources'] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo Air Quality API',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    id: 'cpcb-naaqs-2009',
    name: 'National Ambient Air Quality Standards (CPCB, 18 November 2009)',
    url: 'https://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf',
  },
];

// Sections 3 to 6, in page order.
export const LANDING_EXAMPLES: readonly LandingExample[] = [
  {
    heading: 'Your personal daily plan',
    text: "Choose your place and, if you like, answer a few questions about your routine and home. Our fixed rules decide the advice; AI can arrange it into your day when it's available.",
    caption: 'Example from our rules.',
    candidate: {
      id: 'exercise.check-conditions',
      section: 'action',
      priority: 'medium',
      title: 'Check conditions before outdoor exercise',
      text: 'Before a long or hard outdoor session, check local air-quality updates and advisories.',
      reason: 'You said you exercise outdoors.',
      inputsUsed: ['routine.outdoorExercise', 'air.level'],
      caveat: 'Air quality can change during the day.',
      evidenceType: 'general_suggestion',
      sourceIds: [],
    },
    openWhy: false,
  },
  {
    heading: 'Improve indoor air',
    text: 'Indoor suggestions look at what you cook with and what burns inside, as well as the air outside.',
    caption: 'Example from our rules.',
    candidate: {
      id: 'indoor.cooking-exhaust',
      section: 'indoor',
      priority: 'medium',
      title: 'Use the kitchen exhaust while cooking',
      text: 'Switch the exhaust on before you start cooking and leave it running for a few minutes after.',
      reason:
        'You said your kitchen has an exhaust. Removing cooking smoke at the source comes first.',
      inputsUsed: ['home.kitchenExhaust'],
      caveat:
        'Some kitchen hoods recirculate air instead of venting it outside.',
      evidenceType: 'general_suggestion',
      sourceIds: [],
    },
    openWhy: false,
  },
  {
    heading: 'Sustainable everyday choices',
    text: "Practical habits that cut pollution for you and your neighbours. We never show an emissions saving we can't calculate.",
    caption: 'Example from our rules.',
    candidate: {
      id: 'swap.fewer-car-trips',
      section: 'swap',
      priority: 'low',
      title: 'Combine trips and avoid idling',
      text: "Combining errands into one trip and switching off the engine while waiting cut your vehicle's exhaust. For some trips, public transport, carpooling, walking or cycling may also be practical.",
      reason: 'You said you get around by car.',
      inputsUsed: ['routine.commuteMode'],
      caveat:
        'We do not estimate emission savings, because we have no documented method for your vehicle and trips.',
      evidenceType: 'general_suggestion',
      sourceIds: [],
    },
    openWhy: false,
  },
  {
    heading: 'Explainable AI',
    text: "AI can arrange our rules' suggestions and word them for your day, but it never decides them. Every suggestion opens to its reason, the answers and forecast check it used, its sources and its limits.",
    caption:
      "Example from our rules, for a day when the forecast is above India's 24-hour limit.",
    candidate: {
      id: 'indoor.purifier',
      section: 'indoor',
      priority: 'medium',
      title: 'Run your air purifier where people spend most time',
      text: "Consider running the purifier in the room your household uses most, following the maker's instructions.",
      reason:
        'You said you have an air purifier, and the forecast is above the national 24-hour limit.',
      inputsUsed: ['home.airPurifier', 'air.level'],
      caveat:
        'A purifier helps with particles in that room; it does not remove every pollutant.',
      evidenceType: 'data_driven_rule',
      sourceIds: ['open-meteo', 'cpcb-naaqs-2009'],
    },
    openWhy: true,
  },
];
