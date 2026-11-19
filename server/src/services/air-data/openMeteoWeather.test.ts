import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWeather } from './openMeteoWeather.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const T10 = Date.UTC(2026, 10, 18, 10) / 1000;

function body(start = T10, extra: Record<string, unknown> = {}) {
  return {
    hourly_units: {
      time: 'unixtime',
      temperature_2m: '°C',
      precipitation: 'mm',
      precipitation_probability: '%',
      cloud_cover: '%',
      visibility: 'm',
    },
    hourly: {
      time: [start, start + 3600, start + 7200],
      temperature_2m: [31.2, 32, 33],
      // Precipitation and its chance cover the hour before each row.
      precipitation: [0.4, 0, 1.1],
      precipitation_probability: [70, 20, 90],
      cloud_cover: [85, 40, 60],
      visibility: [24140, 30000, 28000],
      ...extra,
    },
  };
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function respond(json: unknown, status = 200) {
  fetchSpy.mockResolvedValue(Response.json(json, { status }));
}

describe('fetchWeather', () => {
  it("asks the fixed host for this hour's variables", async () => {
    respond(body());
    await fetchWeather(18.52, 73.86, NOW);
    const url = new URL(String(fetchSpy.mock.calls[0]![0]));
    expect(url.host).toBe('api.open-meteo.com');
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('18.52');
    expect(url.searchParams.get('longitude')).toBe('73.86');
    expect(url.searchParams.get('hourly')).toBe(
      'temperature_2m,precipitation,precipitation_probability,cloud_cover,visibility',
    );
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    expect(url.searchParams.get('forecast_hours')).toBe('3');
  });

  it('returns the hour containing now', async () => {
    respond(body());
    expect(await fetchWeather(18.52, 73.86, NOW)).toEqual({
      time: '2026-11-18T10:00:00.000Z',
      temperatureC: 31.2,
      precipitationMm: 0,
      precipitationProbability: 20,
      cloudCoverPercent: 85,
      visibilityM: 24140,
      retrievedAt: NOW.toISOString(),
    });
  });

  // Review A2 #1: Open-Meteo sums precipitation (and its chance) over the
  // hour before each row, so 10:00-11:00 is the 11:00 row, never 09:00-10:00.
  it('reads rain for the hour containing now from the next row', async () => {
    respond(body());
    const weather = await fetchWeather(18.52, 73.86, NOW);
    expect(weather?.precipitationMm).toBe(0);
    expect(weather?.precipitationProbability).toBe(20);
  });

  it('rain is unknown when the next row is missing', async () => {
    respond(body());
    const weather = await fetchWeather(
      18.52,
      73.86,
      new Date('2026-11-18T12:30:00.000Z'),
    );
    expect(weather?.temperatureC).toBe(33);
    expect(weather?.precipitationMm).toBeNull();
    expect(weather?.precipitationProbability).toBeNull();
  });

  it('maps missing variables to null', async () => {
    const json = body();
    delete (json.hourly as Record<string, unknown>).visibility;
    respond(json);
    const weather = await fetchWeather(18.52, 73.86, NOW);
    expect(weather?.visibilityM).toBeNull();
    expect(weather?.temperatureC).toBe(31.2);
  });

  it('returns null when no hour contains now', async () => {
    respond(body(T10 - 3 * 3600));
    expect(await fetchWeather(18.52, 73.86, NOW)).toBeNull();
  });

  it('returns null on a provider failure', async () => {
    respond({ error: true }, 500);
    expect(await fetchWeather(18.52, 73.86, NOW)).toBeNull();
  });
});
