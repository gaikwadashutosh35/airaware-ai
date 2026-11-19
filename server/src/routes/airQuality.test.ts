import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import pune from '../services/air-data/fixtures/open-meteo-pune.json' with { type: 'json' };

function stubFetch() {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(pune)));
}

describe('air-quality routes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/air-quality/forecast', () => {
    it('returns a labelled model forecast whose run age is unknown', async () => {
      stubFetch();

      const res = await request(createApp()).get(
        '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.dataKind).toBe('model_forecast');
      // Open-Meteo does not report the model run time, so age is unknown.
      expect(res.body.data.freshness).toBe('unknown');
      expect(res.body.data.units.PM2_5).toBe('μg/m³');
      expect(res.body.data.hours[0].values.PM2_5).toBe(48);
    });

    it('returns the 24-hour air check for the same forecast', async () => {
      const now = new Date('2026-11-18T10:30:00.000Z');
      const start = Date.UTC(2026, 10, 18, 10) / 1000;
      const time = Array.from({ length: 48 }, (_, i) => start + i * 3600);
      const unit = 'μg/m³';
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          Response.json({
            hourly_units: { time: 'unixtime', pm2_5: unit, pm10: unit },
            hourly: {
              time,
              pm2_5: time.map(() => 80),
              pm10: time.map(() => 90),
            },
          }),
        ),
      );

      const res = await request(createApp()).get(
        '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
      );
      vi.useRealTimers();

      expect(res.status).toBe(200);
      expect(res.body.data.airCheck).toEqual({
        level: 'elevated',
        windowStart: '2026-11-18T10:00:00.000Z',
        checks: [
          {
            pollutant: 'PM2_5',
            status: 'above_limit',
            average24h: 80,
            limit: 60,
          },
          {
            pollutant: 'PM10',
            status: 'within_limit',
            average24h: 90,
            limit: 100,
          },
        ],
      });
    });

    it('a forecast too short for a 24-hour window checks as unknown', async () => {
      // Inside the 3-hour fixture, so only its length makes the check unknown
      // (final review M6: the real clock was past the fixture).
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-17T17:30:00.000Z'));
      stubFetch();

      const res = await request(createApp()).get(
        '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
      );
      vi.useRealTimers();

      expect(res.body.data.airCheck.windowStart).toBeNull();

      expect(res.body.data.airCheck.level).toBe('unknown');
      expect(
        res.body.data.airCheck.checks.map(
          (c: { average24h: number | null }) => c.average24h,
        ),
      ).toEqual([null, null]);
    });

    it('serves repeat and equivalent requests from the cache', async () => {
      const fetchSpy = stubFetch();
      const app = createApp();

      await request(app).get(
        '/api/v1/air-quality/forecast?latitude=18.5&longitude=73.86',
      );
      await request(app).get(
        '/api/v1/air-quality/forecast?latitude=18.5&longitude=73.86',
      );
      const res = await request(app).get(
        '/api/v1/air-quality/forecast?latitude=18.50&longitude=73.86',
      );

      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it.each([
      // More than 2 decimals (~1.1 km) would put a precise location in
      // request logs; clients must round before sending.
      'latitude=18.519571&longitude=73.86',
      'latitude=18.52&longitude=73.855',
      'latitude=&longitude=73.86',
      'latitude=abc&longitude=73.86',
      'latitude=1e2&longitude=73.86',
      'latitude=91&longitude=73.86',
      'latitude=18.5&latitude=18.6&longitude=73.86',
      'latitude=18.52',
    ])('rejects %s with 400 VALIDATION_ERROR', async (query) => {
      const fetchSpy = stubFetch();

      const res = await request(createApp()).get(
        `/api/v1/air-quality/forecast?${query}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 502 with no data on provider failure and does not cache it', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));
      const app = createApp();

      const res = await request(app).get(
        '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
      );
      await request(app).get(
        '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
      );

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('PROVIDER_ERROR');
      expect(res.body).not.toHaveProperty('data');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /api/v1/air-quality/current', () => {
    it('reports official observations as unavailable', async () => {
      const res = await request(createApp()).get(
        '/api/v1/air-quality/current?latitude=18.52&longitude=73.86',
      );

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        error: {
          code: 'DATA_UNAVAILABLE',
          message: 'Official CPCB observations are not connected yet.',
        },
      });
    });

    it('still validates coordinates', async () => {
      const res = await request(createApp()).get(
        '/api/v1/air-quality/current?latitude=abc&longitude=73.86',
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/air-quality/sources', () => {
    it('lists Open-Meteo as available and CPCB as unavailable', async () => {
      const res = await request(createApp()).get('/api/v1/air-quality/sources');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      const [openMeteo, cpcb] = res.body.data;
      expect(openMeteo).toMatchObject({
        id: 'open-meteo',
        dataKind: 'model_forecast',
        status: 'available',
        licence: 'CC BY 4.0',
      });
      expect(openMeteo.attribution).toContain('Open-Meteo.com');
      expect(openMeteo.attribution).toContain('CAMS');
      expect(cpcb).toMatchObject({
        id: 'cpcb',
        dataKind: 'official_observation',
        status: 'unavailable',
        url: 'https://app.cpcbccr.com/AQIIndia',
      });
    });
  });

  describe('rate limit', () => {
    it('answers the 61st request in a minute with 429 RATE_LIMITED', async () => {
      const app = createApp();
      for (let i = 0; i < 60; i++) {
        const ok = await request(app).get('/api/v1/air-quality/sources');
        expect(ok.status).toBe(200);
      }

      const res = await request(app).get('/api/v1/air-quality/sources');

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again in a minute.',
        },
      });
    });
  });
});
