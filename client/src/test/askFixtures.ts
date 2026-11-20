import type { AskAnswer } from '../../../shared/contracts.ts';

// TEST DATA ONLY, never shown to users. Each answer is the server's real
// output (createAsker from server/src/services/recommendations/ask.ts,
// 2026-11-20) for the plan fixtures' household
// { routine: { outdoorExercise: true, commuteMode: 'car' },
//   home: { airPurifier: true, kitchenExhaust: false } }
// and a forecast at 71.2 and 88.4 μg/m³ (test values, as in planFixtures).

// "Outdoor activities", no AI writer: the verdict explains.
export const rulesAskFixture: AskAnswer = {
  topic: 'outdoors',
  cards: [
    {
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
    {
      id: 'guide.check-forecast',
      personalRuleId: 'exercise.check-conditions',
      section: 'action',
      title: 'Check the air before a long outdoor activity',
      text: 'Before a long or hard outdoor session, check the forecast and local air-quality advisories, and follow what they advise for the day.',
      reason:
        "India's health advisory asks people to follow local air-quality forecasts before planning outdoor activity.",
      sourceIds: ['mohfw-air-advisory-2025'],
      priority: 'medium',
      evidenceType: 'general_suggestion',
      inputsUsed: [],
    },
    {
      id: 'guide.away-from-traffic',
      personalRuleId: 'commute.lower-traffic',
      section: 'action',
      title: 'Choose routes and times away from heavy traffic',
      text: 'Where you can, walk, exercise or commute along quieter streets, and outside morning and evening rush hours.',
      reason:
        'Particle pollution is higher near busy roads, especially during rush hours.',
      sourceIds: ['mohfw-air-advisory-2025', 'epa-near-road-schools'],
      priority: 'medium',
      evidenceType: 'general_suggestion',
      inputsUsed: [],
    },
  ],
  summary: null,
  generatedBy: 'rules',
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
  sources: [
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
    {
      id: 'mohfw-air-advisory-2025',
      name: 'Health Advisory on Air Pollution (Ministry of Health and Family Welfare, NCDC, 2025)',
      url: 'https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf',
    },
    {
      id: 'epa-near-road-schools',
      name: 'Best Practices for Reducing Near-Road Pollution Exposure at Schools (US EPA, 2021)',
      url: 'https://www.epa.gov/system/files/documents/2026-08/best-practices-for-reducing-near-road-pollution-exposure-at-schools.pdf',
    },
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

// "Indoor air" with an AI summary (the summary string is test text).
export const aiAskFixture: AskAnswer = {
  topic: 'indoor',
  cards: [
    {
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
    {
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
    {
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
  ],
  summary:
    'Particle levels are forecast above the 24-hour limit, so keep cooking smoke down and run your purifier.',
  generatedBy: 'ai',
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
  sources: [
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
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

// A medical question: no AI call, no cards.
export const medicalAskFixture: AskAnswer = {
  topic: 'medical',
  cards: [],
  summary: null,
  generatedBy: 'rules',
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
  sources: [
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
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

// An out-of-scope question: no AI call, no cards.
export const outOfScopeAskFixture: AskAnswer = {
  topic: 'out_of_scope',
  cards: [],
  summary: null,
  generatedBy: 'rules',
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
  sources: [
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
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};

// "Outdoor activities" when the forecast failed: air unknown, no time.
export const unknownAirAskFixture: AskAnswer = {
  topic: 'outdoors',
  cards: [
    {
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
    {
      id: 'guide.away-from-traffic',
      personalRuleId: 'commute.lower-traffic',
      section: 'action',
      title: 'Choose routes and times away from heavy traffic',
      text: 'Where you can, walk, exercise or commute along quieter streets, and outside morning and evening rush hours.',
      reason:
        'Particle pollution is higher near busy roads, especially during rush hours.',
      sourceIds: ['mohfw-air-advisory-2025', 'epa-near-road-schools'],
      priority: 'medium',
      evidenceType: 'general_suggestion',
      inputsUsed: [],
    },
  ],
  summary: null,
  generatedBy: 'rules',
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
  sources: [
    {
      id: 'mohfw-air-advisory-2025',
      name: 'Health Advisory on Air Pollution (Ministry of Health and Family Welfare, NCDC, 2025)',
      url: 'https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf',
    },
    {
      id: 'epa-near-road-schools',
      name: 'Best Practices for Reducing Near-Road Pollution Exposure at Schools (US EPA, 2021)',
      url: 'https://www.epa.gov/system/files/documents/2026-08/best-practices-for-reducing-near-road-pollution-exposure-at-schools.pdf',
    },
  ],
  safetyNote:
    'General information only, not medical advice. Follow local public-health advisories.',
};
