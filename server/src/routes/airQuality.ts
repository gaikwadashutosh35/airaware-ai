import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parseQuery } from '../errors.ts';
import { createTtlCache } from '../services/air-data/cache.ts';
import { freshness } from '../services/air-data/freshness.ts';
import {
  fetchForecast,
  LIMITATIONS,
  SOURCE_URL,
  type ForecastSeries,
} from '../services/air-data/openMeteo.ts';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
// CAMS global forecasts update every 12 hours (Open-Meteo docs).
const FORECAST_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// Plain decimals only: rejects '', 'abc', '1e2', hex, and repeated params.
function coordinate(min: number, max: number) {
  return z
    .string()
    .regex(/^-?\d{1,3}(\.\d{1,10})?$/)
    .transform(Number)
    .pipe(z.number().min(min).max(max));
}
const coordinatesQuery = z.object({
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});

// ~1.1 km: what leaves the server and keys the cache. The model grid is ~45 km.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const SOURCES = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo Air Quality API',
    dataKind: 'model_forecast',
    status: 'available',
    url: SOURCE_URL,
    licence: 'CC BY 4.0',
    attribution:
      'Air-quality forecasts from Open-Meteo.com, based on CAMS global atmospheric composition forecasts from the Copernicus Atmosphere Monitoring Service.',
    limitations: LIMITATIONS,
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

export function airQualityRouter(): Router {
  const router = Router();
  const cache = createTtlCache<ForecastSeries>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

  router.get('/forecast', async (req, res) => {
    const query = parseQuery(coordinatesQuery, req.query);
    const latitude = round2(query.latitude);
    const longitude = round2(query.longitude);
    const key = `${latitude},${longitude}`;
    const now = new Date();

    let series = cache.get(key, now.getTime());
    if (!series) {
      series = await fetchForecast(latitude, longitude, now);
      cache.set(key, series, now.getTime());
    }
    res.json({
      data: {
        ...series,
        freshness: freshness(series.retrievedAt, now, FORECAST_MAX_AGE_MS),
      },
    });
  });

  router.get('/current', (req) => {
    parseQuery(coordinatesQuery, req.query);
    throw new HttpError(
      503,
      'DATA_UNAVAILABLE',
      'Official CPCB observations are not connected yet.',
    );
  });

  router.get('/sources', (_req, res) => {
    res.json({ data: SOURCES });
  });

  return router;
}
