import type {
  ForecastData,
  LocationResult,
  SourceInfo,
} from '../../../shared/contracts.ts';

// API-shaped copy of the Phase 2 recording (Open-Meteo, Pune, 2026-11-17,
// first 3 hours from 17:00 UTC). Values are the recorded ones, unchanged.
export const forecastFixture: ForecastData = {
  provider: 'Open-Meteo',
  sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
  dataKind: 'model_forecast',
  modelResolution:
    'CAMS global atmospheric composition forecast, 0.4° (~45 km) grid',
  retrievedAt: '2026-11-17T17:05:00.000Z',
  freshness: 'unknown',
  units: {
    PM2_5: 'μg/m³',
    PM10: 'μg/m³',
    NO2: 'μg/m³',
    SO2: 'μg/m³',
    O3: 'μg/m³',
    CO: 'μg/m³',
  },
  hours: [
    {
      time: '2026-11-17T17:00:00.000Z',
      values: { PM2_5: 48, PM10: 52.4, NO2: 25.1, SO2: 13.7, O3: 76, CO: 575 },
    },
    {
      time: '2026-11-17T18:00:00.000Z',
      values: {
        PM2_5: 45.6,
        PM10: 49.7,
        NO2: 21.5,
        SO2: 13.1,
        O3: 76,
        CO: 527,
      },
    },
    {
      time: '2026-11-17T19:00:00.000Z',
      values: {
        PM2_5: 43.1,
        PM10: 46.8,
        NO2: 17.6,
        SO2: 12.2,
        O3: 77,
        CO: 519,
      },
    },
  ],
  limitations: [
    'Model forecast, not a station observation.',
    'Not the CPCB National AQI.',
    'Grid cell is about 45 km wide; conditions near roads or local sources can differ.',
  ],
  // What the server's assessAir() returns for these 3 hours: too few for a
  // 24-hour window.
  airCheck: {
    level: 'unknown',
    windowStart: null,
    checks: [
      { pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 },
      { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 },
    ],
  },
  // Illustrative test data (not a recording): a dry, partly cloudy hour.
  weather: {
    time: '2026-11-17T17:00:00.000Z',
    temperatureC: 27.5,
    precipitationMm: 0,
    precipitationProbability: 10,
    cloudCoverPercent: 30,
    visibilityM: 24140,
    // 17:00 UTC is 22:30 in Pune.
    isDay: false,
    retrievedAt: '2026-11-17T17:05:00.000Z',
    // Pune is +05:30: 17:00 UTC is 22:30 on 17 Nov there.
    utcOffsetSeconds: 19800,
    days: [
      {
        day: 'yesterday',
        date: '2026-11-16',
        minC: 19.4,
        maxC: 31.6,
        precipitationMm: 0,
        atHour: {
          time: '2026-11-16T17:00:00.000Z',
          temperatureC: 26.8,
          cloudCoverPct: 10,
        },
      },
      {
        day: 'today',
        date: '2026-11-17',
        minC: 19.9,
        maxC: 32.2,
        precipitationMm: 0.04,
        atHour: {
          time: '2026-11-17T17:00:00.000Z',
          temperatureC: 27.5,
          cloudCoverPct: 30,
        },
      },
      {
        day: 'tomorrow',
        date: '2026-11-18',
        minC: 20.5,
        maxC: 30.4,
        precipitationMm: 2.26,
        atHour: {
          time: '2026-11-18T17:00:00.000Z',
          temperatureC: 25.2,
          cloudCoverPct: 80,
        },
      },
    ],
  },
};

// Same entries the server's /sources route returns.
export const sourcesFixture: SourceInfo[] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo Air Quality API',
    dataKind: 'model_forecast',
    status: 'available',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
    licence: 'CC BY 4.0',
    attribution:
      'Air-quality forecasts from Open-Meteo.com, based on CAMS global atmospheric composition forecasts from the Copernicus Atmosphere Monitoring Service.',
    limitations: forecastFixture.limitations,
  },
  {
    id: 'cpcb',
    name: 'CPCB National AQI',
    dataKind: 'official_observation',
    status: 'unavailable',
    url: 'https://app.cpcbccr.com/AQIIndia',
    limitations: [
      'No verified machine-readable CPCB feed is connected; official observations are not shown.',
    ],
  },
  {
    id: 'open-meteo-weather',
    name: 'Open-Meteo Weather Forecast API',
    dataKind: 'model_forecast',
    status: 'available',
    url: 'https://open-meteo.com/en/docs',
    licence: 'CC BY 4.0',
    attribution: 'Weather forecasts from Open-Meteo.com.',
    limitations: [
      'Weather is a model forecast for the same grid area; local showers can differ.',
    ],
  },
];

// API-shaped copy of the Phase 2 recording (Open-Meteo Geocoding,
// name=Pune, countryCode=IN, 2026-11-17). Values unchanged.
export const searchFixture: LocationResult[] = [
  {
    id: 1259229,
    name: 'Pune',
    admin1: 'Maharashtra',
    country: 'India',
    latitude: 18.51957,
    longitude: 73.85535,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 10191779,
    name: 'Puneta',
    admin1: 'Rajasthan',
    country: 'India',
    latitude: 26.30395,
    longitude: 76.28992,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 10481679,
    name: 'Puneir',
    admin1: 'Uttar Pradesh',
    country: 'India',
    latitude: 27.61571,
    longitude: 78.19707,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 10675740,
    name: 'Puneja',
    admin1: 'Jammu and Kashmir',
    country: 'India',
    latitude: 33.10509,
    longitude: 75.69146,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 10716227,
    name: 'Puneta',
    admin1: 'Himachal Pradesh',
    country: 'India',
    latitude: 32.57604,
    longitude: 76.19191,
    timezone: 'Asia/Kolkata',
  },
];
