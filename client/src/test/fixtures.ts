import type {
  ForecastSeries,
  LocationResult,
  SourceInfo,
} from '../../../shared/contracts.ts';

// API-shaped copy of the Phase 2 recording (Open-Meteo, Pune, 2026-11-17,
// first 3 hours from 17:00 UTC). Values are the recorded ones, unchanged.
export const forecastFixture: ForecastSeries = {
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
