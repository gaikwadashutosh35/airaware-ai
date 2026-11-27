import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWeather } from './openMeteoWeather.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const T10 = Date.UTC(2026, 10, 18, 10) / 1000;

function body(start = T10, extra: Record<string, unknown> = {}) {
  return {
    utc_offset_seconds: 0,
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
      'temperature_2m,precipitation,precipitation_probability,cloud_cover,visibility,is_day,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m',
    );
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    // Yesterday, today and tomorrow in the place's own time.
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('past_days')).toBe('1');
    expect(url.searchParams.get('forecast_days')).toBe('2');
    expect(url.searchParams.get('daily')).toBe(
      'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    );
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
      isDay: null,
      retrievedAt: NOW.toISOString(),
      utcOffsetSeconds: 0,
      // Three hourly rows only: the other days have no same-hour row, no
      // daily values, and stay null (never filled in).
      days: [
        {
          day: 'yesterday',
          date: '2026-11-17',
          minC: null,
          maxC: null,
          precipitationMm: null,
          rainChancePct: null,
          atHour: {
            time: '2026-11-17T10:00:00.000Z',
            temperatureC: null,
            cloudCoverPct: null,
            feelsLikeC: null,
            humidityPct: null,
            windKmh: null,
            windFromDeg: null,
          },
        },
        {
          day: 'today',
          date: '2026-11-18',
          minC: null,
          maxC: null,
          precipitationMm: null,
          rainChancePct: null,
          atHour: {
            time: '2026-11-18T10:00:00.000Z',
            temperatureC: 31.2,
            cloudCoverPct: 85,
            feelsLikeC: null,
            humidityPct: null,
            windKmh: null,
            windFromDeg: null,
          },
        },
        {
          day: 'tomorrow',
          date: '2026-11-19',
          minC: null,
          maxC: null,
          precipitationMm: null,
          rainChancePct: null,
          atHour: {
            time: '2026-11-19T10:00:00.000Z',
            temperatureC: null,
            cloudCoverPct: null,
            feelsLikeC: null,
            humidityPct: null,
            windKmh: null,
            windFromDeg: null,
          },
        },
      ],
    });
  });

  // Cityscape D3: is_day is a point value for the hour, so it comes from
  // this hour's row (unlike the precipitation sums).
  it('reads day and night for the hour', async () => {
    respond(body(T10, { is_day: [1, 0, 0] }));
    expect((await fetchWeather(18.52, 73.86, NOW))?.isDay).toBe(true);
    respond(body(T10, { is_day: [0, 1, 1] }));
    expect((await fetchWeather(18.52, 73.86, NOW))?.isDay).toBe(false);
    respond(body());
    expect((await fetchWeather(18.52, 73.86, NOW))?.isDay).toBeNull();
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

  it('returns null when the offset is missing (fails closed)', async () => {
    const json = body();
    delete (json as Record<string, unknown>).utc_offset_seconds;
    respond(json);
    expect(await fetchWeather(18.52, 73.86, NOW)).toBeNull();
  });
});

// Asia/Kolkata (+05:30): 72 hourly rows from local midnight 17 Nov to the end
// of 19 Nov, so rows sit at :30 UTC. Row n has temperature n and cloud n.
const IST = 19800;
const START = Date.UTC(2026, 10, 16, 18, 30) / 1000;
function kolkata(daily: Record<string, unknown> | null = {}) {
  const rows = Array.from({ length: 72 }, (_, n) => n);
  return {
    utc_offset_seconds: IST,
    hourly: {
      time: rows.map((n) => START + n * 3600),
      temperature_2m: rows,
      cloud_cover: rows.map((n) => n + 100),
    },
    ...(daily && {
      daily: {
        time: [START, START + 86400, START + 2 * 86400],
        temperature_2m_max: [30, 32, 34],
        temperature_2m_min: [20, 21, null],
        precipitation_sum: [0, 1.5, 0.2],
        ...daily,
      },
    }),
  };
}
// 10:30 UTC on 18 Nov is 16:00 in Kolkata.
const KOLKATA_NOW = new Date('2026-11-18T10:30:00.000Z');

describe('fetchWeather days', () => {
  it('gives yesterday, today and tomorrow by the place’s local date', async () => {
    respond(kolkata());
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    expect(weather?.utcOffsetSeconds).toBe(IST);
    expect(weather?.days.map(({ day, date }) => [day, date])).toEqual([
      ['yesterday', '2026-11-17'],
      ['today', '2026-11-18'],
      ['tomorrow', '2026-11-19'],
    ]);
  });

  it('takes the same local hour on each day', async () => {
    respond(kolkata());
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    // Now is row 40 (16:00 local); yesterday is row 16, tomorrow row 64.
    expect(weather?.temperatureC).toBe(40);
    expect(weather?.days.map((d) => d.atHour)).toEqual([
      {
        time: '2026-11-17T10:30:00.000Z',
        temperatureC: 16,
        cloudCoverPct: 116,
        feelsLikeC: null,
        humidityPct: null,
        windKmh: null,
        windFromDeg: null,
      },
      {
        time: '2026-11-18T10:30:00.000Z',
        temperatureC: 40,
        cloudCoverPct: 140,
        feelsLikeC: null,
        humidityPct: null,
        windKmh: null,
        windFromDeg: null,
      },
      {
        time: '2026-11-19T10:30:00.000Z',
        temperatureC: 64,
        cloudCoverPct: 164,
        feelsLikeC: null,
        humidityPct: null,
        windKmh: null,
        windFromDeg: null,
      },
    ]);
  });

  it('reads the daily range and rain, with null for what is missing', async () => {
    respond(kolkata());
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    expect(
      weather?.days.map(({ minC, maxC, precipitationMm }) => [
        minC,
        maxC,
        precipitationMm,
      ]),
    ).toEqual([
      [20, 30, 0],
      [21, 32, 1.5],
      [null, 34, 0.2],
    ]);
  });

  it('leaves the daily values null when the provider sends none', async () => {
    respond(kolkata(null));
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    expect(weather?.days.every((d) => d.minC === null && d.maxC === null)).toBe(
      true,
    );
    expect(weather?.days[1]?.atHour.temperatureC).toBe(40);
  });

  it('fails closed when a daily column is the wrong length', async () => {
    respond(kolkata({ precipitation_sum: [0] }));
    expect(await fetchWeather(18.52, 73.86, KOLKATA_NOW)).toBeNull();
  });

  // The local date differs from the UTC date: 20:00 UTC on 17 Nov is 01:30 on
  // 18 Nov in Kolkata.
  it('names the local dates when the UTC date is still the day before', async () => {
    respond(kolkata());
    const weather = await fetchWeather(
      18.52,
      73.86,
      new Date('2026-11-17T20:00:00.000Z'),
    );
    expect(weather?.days.map((d) => d.date)).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ]);
    // Now is row 25 (01:30 local); yesterday is row 1, tomorrow row 49.
    expect(weather?.days.map((d) => d.atHour.temperatureC)).toEqual([
      1, 25, 49,
    ]);
    expect(weather?.days.map((d) => d.maxC)).toEqual([30, 32, 34]);
  });

  // Owner (27 Nov): more rows in the table. Feels like, humidity and wind are
  // point values for the same local hour; the chance of rain is the day's
  // highest, and only for today and tomorrow (a past day has no chance).
  it('reads feels like, humidity and wind at the same hour', async () => {
    const json = kolkata({ precipitation_probability_max: [55, 40, 70] });
    const rows = json.hourly.time.map((_, n) => n);
    Object.assign(json.hourly, {
      apparent_temperature: rows.map((n) => n + 0.5),
      relative_humidity_2m: rows.map((n) => n + 1),
      wind_speed_10m: rows.map((n) => n + 2),
      wind_direction_10m: rows.map((n) => n * 5),
    });
    respond(json);
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    // Rows 16, 40 and 64, as in the test above.
    expect(
      weather?.days.map(({ atHour: a }) => [
        a.feelsLikeC,
        a.humidityPct,
        a.windKmh,
        a.windFromDeg,
      ]),
    ).toEqual([
      [16.5, 17, 18, 80],
      [40.5, 41, 42, 200],
      [64.5, 65, 66, 320],
    ]);
    expect(weather?.days.map((d) => d.rainChancePct)).toEqual([null, 40, 70]);
  });

  it('leaves the new values null when the provider sends none', async () => {
    respond(kolkata());
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    expect(weather?.days.map((d) => d.rainChancePct)).toEqual([
      null,
      null,
      null,
    ]);
    expect(weather?.days[1]?.atHour.windKmh).toBeNull();
  });

  it('fails closed when a new column is the wrong length', async () => {
    const json = kolkata();
    Object.assign(json.hourly, { wind_speed_10m: [1] });
    respond(json);
    expect(await fetchWeather(18.52, 73.86, KOLKATA_NOW)).toBeNull();
  });

  it('fails closed on an offset beyond a real time zone', async () => {
    respond({ ...kolkata(), utc_offset_seconds: 64801 });
    expect(await fetchWeather(18.52, 73.86, KOLKATA_NOW)).toBeNull();
    respond({ ...kolkata(), utc_offset_seconds: -64801 });
    expect(await fetchWeather(18.52, 73.86, KOLKATA_NOW)).toBeNull();
  });

  it('never throws on a daily time no date can hold', async () => {
    respond(kolkata({ time: [9e15, START + 86400, START + 2 * 86400] }));
    const weather = await fetchWeather(18.52, 73.86, KOLKATA_NOW);
    expect(weather?.days.map((d) => d.maxC)).toEqual([null, 32, 34]);
  });
});
