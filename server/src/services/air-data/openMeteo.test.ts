import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../errors.ts';
import pune from './fixtures/open-meteo-pune.json' with { type: 'json' };
import { fetchForecast } from './openMeteo.ts';

// Recorded 2026-11-17: latitude=18.52&longitude=73.86, domains=cams_global,
// timeformat=unixtime, forecast_hours=3.
const NOW = new Date('2026-11-17T17:05:00Z');

function fixture(): typeof pune & Record<string, unknown> {
  return structuredClone(pune);
}

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })));
}

describe('fetchForecast', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps the recorded response into a labelled model forecast', async () => {
    respondWith(fixture());

    const series = await fetchForecast(18.52, 73.86, NOW);

    expect(series.dataKind).toBe('model_forecast');
    expect(series.provider).toBe('Open-Meteo');
    expect(series.sourceUrl).toBe(
      'https://open-meteo.com/en/docs/air-quality-api',
    );
    expect(series.modelResolution).toBe(
      'CAMS global atmospheric composition forecast, 0.4° (~45 km) grid',
    );
    expect(series.retrievedAt).toBe('2026-11-17T17:05:00.000Z');
    expect(series.units.PM2_5).toBe('μg/m³');
    expect(series.hours).toHaveLength(3);
    expect(series.hours[0]).toEqual({
      time: '2026-11-17T17:00:00.000Z',
      values: { PM2_5: 48, PM10: 52.4, NO2: 25.1, SO2: 13.7, O3: 76, CO: 575 },
    });
    expect(series.limitations).toEqual([
      'Model forecast, not a station observation.',
      'Not the CPCB National AQI.',
      'Grid cell is about 45 km wide; conditions near roads or local sources can differ.',
    ]);
  });

  it('never carries an AQI field', async () => {
    respondWith(fixture());

    const series = await fetchForecast(18.52, 73.86, NOW);

    const keys: string[] = [];
    JSON.stringify(series, (key: string, value: unknown) => {
      keys.push(key);
      return value;
    });
    expect(keys.filter((key) => /aqi/i.test(key))).toEqual([]);
  });

  it('omits a variable the model did not return and says so', async () => {
    const body = fixture();
    delete (body.hourly as Partial<typeof pune.hourly>).pm10;
    delete (body.hourly_units as Partial<typeof pune.hourly_units>).pm10;
    respondWith(body);

    const series = await fetchForecast(18.52, 73.86, NOW);

    expect(series.units).not.toHaveProperty('PM10');
    expect(series.hours[0]?.values).not.toHaveProperty('PM10');
    expect(series.limitations).toContain(
      'PM10 is not provided by the model for this location.',
    );
  });

  it('requests the global CAMS domain from the fixed host', async () => {
    const fetchSpy = respondWith(fixture());

    await fetchForecast(18.52, 73.86, NOW);

    const url = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(url.host).toBe('air-quality-api.open-meteo.com');
    expect(url.searchParams.get('domains')).toBe('cams_global');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    expect(url.searchParams.get('forecast_hours')).toBe('48');
    expect(url.searchParams.get('latitude')).toBe('18.52');
    expect(url.searchParams.get('longitude')).toBe('73.86');
  });

  const badResponses: Array<[string, () => void]> = [
    [
      'a value without a unit',
      () => {
        const body = fixture();
        delete (body.hourly_units as Partial<typeof pune.hourly_units>).ozone;
        respondWith(body);
      },
    ],
    [
      'a negative concentration',
      () => {
        const body = fixture();
        body.hourly.pm2_5[1] = -3;
        respondWith(body);
      },
    ],
    [
      'arrays of different lengths',
      () => {
        const body = fixture();
        body.hourly.pm10.pop();
        respondWith(body);
      },
    ],
    [
      'no hours at all',
      () => {
        const body = fixture();
        body.hourly.time = [];
        respondWith(body);
      },
    ],
    ['an HTTP 500', () => respondWith({ error: true }, 500)],
    [
      'a body that is not JSON',
      () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response('<html>gateway</html>', { status: 200 }),
        );
      },
    ],
    [
      'a timeout',
      () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(
          new DOMException('timeout', 'TimeoutError'),
        );
      },
    ],
  ];

  it.each(badResponses)(
    'turns %s into a 502 PROVIDER_ERROR',
    async (_, arrange) => {
      arrange();

      const error = await fetchForecast(18.52, 73.86, NOW).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 502, code: 'PROVIDER_ERROR' });
    },
  );
});
