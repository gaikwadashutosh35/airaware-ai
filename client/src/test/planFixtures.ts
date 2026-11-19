import type { DailyPlan } from '../../../shared/contracts.ts';

// TEST DATA ONLY, never shown to users. Candidates and plans are the
// server's real output (buildCandidates + buildPlan from
// server/src/services/recommendations, 2026-11-19) for the household
// { routine: { outdoorExercise: true, commuteMode: 'car' },
//   home: { airPurifier: true, kitchenExhaust: false } }.
// The 24-hour averages (71.2 and 88.4 μg/m³) are test values, not a
// recording; the forecast metadata matches forecastFixture.

export const rulesPlanFixture: DailyPlan = {
  generatedBy: 'rules',
  model: null,
  promptVersion: null,
  summary: null,
  place: {
    label: 'Pune, Maharashtra',
  },
  air: {
    level: 'elevated',
    windowStart: '2026-11-17T17:00:00.000Z',
    checks: [
      {
        pollutant: 'PM2_5',
        status: 'above_limit',
        average24h: 71.2,
        limit: 60,
      },
      {
        pollutant: 'PM10',
        status: 'within_limit',
        average24h: 88.4,
        limit: 100,
      },
    ],
  },
  forecast: {
    provider: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    dataKind: 'model_forecast',
    modelResolution:
      'CAMS global atmospheric composition forecast, 0.4° (~45 km) grid',
    retrievedAt: '2026-11-17T17:05:00.000Z',
    limitations: [
      'Model forecast, not a station observation.',
      'Not the CPCB National AQI.',
      'Grid cell is about 45 km wide; conditions near roads or local sources can differ.',
    ],
  },
  notices: [
    {
      id: 'air.elevated',
      section: 'notice',
      priority: 'high',
      title: "Forecast above India's 24-hour limit",
      text: 'The 24-hour model forecast average is above the national limit for PM2.5 (71.2 μg/m³, limit 60).',
      reason:
        "India's National Ambient Air Quality Standards (CPCB, 2009) set 24-hour limits of 60 μg/m³ for PM2.5 and 100 μg/m³ for PM10.",
      inputsUsed: ['air.PM2_5', 'air.PM10'],
      caveat:
        'This is a model forecast for an area about 45 km wide, not a station measurement and not the CPCB National AQI.',
      evidenceType: 'data_driven_rule',
      sourceIds: ['open-meteo', 'cpcb-naaqs-2009'],
    },
  ],
  featured: [
    {
      candidate: {
        id: 'exercise.indoor-alternative',
        section: 'action',
        priority: 'high',
        title: 'Consider an indoor alternative for exercise',
        text: 'Consider exercising indoors today, or keeping outdoor sessions shorter and less intense. Check local conditions before you go.',
        reason:
          'You said you exercise outdoors, and the forecast is above the national 24-hour limit.',
        inputsUsed: ['routine.outdoorExercise', 'air.level'],
        caveat:
          'Conditions change through the day and across the city; this forecast cannot show a specific park or route.',
        evidenceType: 'data_driven_rule',
        sourceIds: ['open-meteo', 'cpcb-naaqs-2009'],
      },
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'indoor.ventilation-tradeoff',
        section: 'indoor',
        priority: 'high',
        title: 'Ventilate for indoor sources, not by habit',
        text: 'Outdoor particles are forecast to be high, so windows left open all day let more of them in. Cooking, incense or smoke indoors still needs fresh air, so ventilate while those are going on and for a short while after.',
        reason:
          'The forecast is above the national 24-hour limit, and indoor sources add their own pollution.',
        inputsUsed: ['air.level'],
        caveat:
          'What works best depends on your home. Staying indoors does not protect you by itself if indoor sources are present.',
        evidenceType: 'data_driven_rule',
        sourceIds: ['open-meteo', 'cpcb-naaqs-2009'],
      },
      period: null,
      forYou: null,
    },
    {
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
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'indoor.cooking-ventilate',
        section: 'indoor',
        priority: 'medium',
        title: 'Ventilate the kitchen while cooking',
        text: 'Open a kitchen window or door while cooking and for a short while after, so smoke and fumes can leave.',
        reason:
          'You said your kitchen has no exhaust, so cooking smoke stays indoors without fresh air.',
        inputsUsed: ['home.kitchenExhaust'],
        caveat:
          'On high-pollution days, keep this to cooking time rather than all day.',
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'indoor.smoke-sources',
        section: 'indoor',
        priority: 'low',
        title: 'Cut indoor smoke at the source',
        text: 'Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step.',
        reason: 'These are common indoor pollution sources in any home.',
        inputsUsed: [],
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
    {
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
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'swap.no-open-burning',
        section: 'swap',
        priority: 'low',
        title: "Don't burn waste or leaves",
        text: 'Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood.',
        reason:
          'Open burning is a local pollution source any household can avoid.',
        inputsUsed: [],
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
  ],
  more: [],
  sources: [
    {
      id: 'open-meteo',
      name: 'Open-Meteo Air Quality API',
      url: 'https://open-meteo.com/en/docs/air-quality-api',
    },
    {
      id: 'cpcb-naaqs-2009',
      name: 'National Ambient Air Quality Standards (CPCB, 18 November 2009)',
      url: 'http://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf',
    },
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

// A provider failure: air unknown, no forecast, the data.unavailable notice.
export const unavailablePlanFixture: DailyPlan = {
  generatedBy: 'rules',
  model: null,
  promptVersion: null,
  summary: null,
  place: {
    label: 'Pune, Maharashtra',
  },
  air: {
    level: 'unknown',
    windowStart: null,
    checks: [
      {
        pollutant: 'PM2_5',
        status: 'unknown',
        average24h: null,
        limit: 60,
      },
      {
        pollutant: 'PM10',
        status: 'unknown',
        average24h: null,
        limit: 100,
      },
    ],
  },
  forecast: null,
  notices: [
    {
      id: 'data.unavailable',
      section: 'notice',
      priority: 'high',
      title: 'Live air information unavailable',
      text: "We could not get a complete 24-hour forecast for this place, so this plan gives no advice about today's air. The other suggestions apply on any day.",
      reason: 'The forecast was missing, incomplete or in an unexpected unit.',
      inputsUsed: ['air.level'],
      evidenceType: 'general_suggestion',
      sourceIds: [],
    },
  ],
  featured: [
    {
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
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'indoor.cooking-ventilate',
        section: 'indoor',
        priority: 'medium',
        title: 'Ventilate the kitchen while cooking',
        text: 'Open a kitchen window or door while cooking and for a short while after, so smoke and fumes can leave.',
        reason:
          'You said your kitchen has no exhaust, so cooking smoke stays indoors without fresh air.',
        inputsUsed: ['home.kitchenExhaust'],
        caveat:
          'On high-pollution days, keep this to cooking time rather than all day.',
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'indoor.smoke-sources',
        section: 'indoor',
        priority: 'low',
        title: 'Cut indoor smoke at the source',
        text: 'Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step.',
        reason: 'These are common indoor pollution sources in any home.',
        inputsUsed: [],
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
    {
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
      period: null,
      forYou: null,
    },
    {
      candidate: {
        id: 'swap.no-open-burning',
        section: 'swap',
        priority: 'low',
        title: "Don't burn waste or leaves",
        text: 'Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood.',
        reason:
          'Open burning is a local pollution source any household can avoid.',
        inputsUsed: [],
        evidenceType: 'general_suggestion',
        sourceIds: [],
      },
      period: null,
      forYou: null,
    },
  ],
  more: [],
  sources: [],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

const candidate = (id: string) => {
  const found = rulesPlanFixture.featured.find((f) => f.candidate.id === id);
  if (!found) throw new Error(`No candidate ${id}`);
  return found.candidate;
};

// An AI-shaped plan: Gemini picked, timed and added "For you" lines (the
// forYou and summary strings are test text); the rest stays in `more`.
export const aiPlanFixture: DailyPlan = {
  ...rulesPlanFixture,
  generatedBy: 'ai',
  model: 'gemini-3.8-flash',
  promptVersion: 'daily-plan-v1',
  summary:
    'Particle levels are forecast above the 24-hour limit, so plan exercise indoors and keep cooking smoke down.',
  featured: [
    {
      candidate: candidate('exercise.indoor-alternative'),
      period: 'morning',
      forYou:
        'You said you exercise outdoors, so try an indoor session this morning.',
    },
    {
      candidate: candidate('indoor.purifier'),
      period: 'home',
      forYou: 'You have an air purifier; run it in the room you use most.',
    },
    {
      candidate: candidate('swap.no-open-burning'),
      period: null,
      forYou: null,
    },
  ],
  more: [
    'indoor.ventilation-tradeoff',
    'indoor.cooking-ventilate',
    'indoor.smoke-sources',
    'swap.fewer-car-trips',
  ].map(candidate),
};
