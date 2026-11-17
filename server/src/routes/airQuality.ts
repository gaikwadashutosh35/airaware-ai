import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parseQuery } from '../errors.ts';
import { createTtlCache } from '../services/air-data/cache.ts';
import {
  fetchForecast,
  LIMITATIONS,
  SOURCE_URL,
  type ForecastSeries,
} from '../services/air-data/openMeteo.ts';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

// Plain decimals with at most 2 places (~1.1 km; the model grid is ~45 km).
// Clients round before sending, so a precise location never reaches request
// logs or Open-Meteo. Also rejects '', 'abc', '1e2', hex and repeated params.
function coordinate(min: number, max: number) {
  return z
    .string()
    .regex(/^-?\d{1,3}(\.\d{1,2})?$/)
    .transform(Number)
    .pipe(z.number().min(min).max(max));
}
const coordinatesQuery = z.object({
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});

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
    const { latitude, longitude } = parseQuery(coordinatesQuery, req.query);
    const key = `${latitude},${longitude}`;
    const now = new Date();

    let series = cache.get(key, now.getTime());
    if (!series) {
      series = await fetchForecast(latitude, longitude, now);
      cache.set(key, series, now.getTime());
    }
    // Open-Meteo does not report the model run time, so the forecast's age is
    // unknown; `retrievedAt` says when the server fetched it.
    res.json({ data: { ...series, freshness: 'unknown' } });
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
