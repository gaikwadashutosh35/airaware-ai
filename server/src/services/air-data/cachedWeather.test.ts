import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherNow } from '../../../../shared/contracts.ts';
import { createCachedWeather } from './cachedWeather.ts';
import { fetchWeather } from './openMeteoWeather.ts';

vi.mock('./openMeteoWeather.ts', () => ({ fetchWeather: vi.fn() }));
const fetchMock = vi.mocked(fetchWeather);

// An hour of weather starting at the top of the hour containing `now`.
function hourOf(now: Date): WeatherNow {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  return {
    time: start.toISOString(),
    temperatureC: 30,
    precipitationMm: 0,
    precipitationProbability: 10,
    cloudCoverPercent: 20,
    visibilityM: 20000,
    isDay: true,
    retrievedAt: now.toISOString(),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('createCachedWeather', () => {
  // Review A2 #3: the 10-minute cache must never serve last hour as this hour.
  it('serves the cached hour only while it contains now', async () => {
    fetchMock.mockImplementation(async (_lat, _lon, now) => hourOf(now));
    const weather = createCachedWeather();

    await weather(18.52, 73.86, new Date('2026-11-18T10:55:00.000Z'));
    await weather(18.52, 73.86, new Date('2026-11-18T10:58:00.000Z'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const next = await weather(
      18.52,
      73.86,
      new Date('2026-11-18T11:01:00.000Z'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(next?.time).toBe('2026-11-18T11:00:00.000Z');
  });

  it('asks again after a missing answer', async () => {
    const now = new Date('2026-11-18T10:30:00.000Z');
    fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(hourOf(now));
    const weather = createCachedWeather();

    expect(await weather(18.52, 73.86, now)).toBeNull();
    expect(await weather(18.52, 73.86, now)).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
