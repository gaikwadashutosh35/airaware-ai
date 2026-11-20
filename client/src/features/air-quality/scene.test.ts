import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  WeatherNow,
} from '../../../../shared/contracts.ts';
import { sceneFromConditions } from './scene.ts';

const air = (pm25: number | null): AirAssessment => ({
  level: pm25 === null ? 'unknown' : pm25 > 60 ? 'elevated' : 'not_elevated',
  windowStart: '2026-11-18T10:00:00.000Z',
  checks: [
    {
      pollutant: 'PM2_5',
      status:
        pm25 === null ? 'unknown' : pm25 > 60 ? 'above_limit' : 'within_limit',
      average24h: pm25,
      limit: 60,
    },
    {
      pollutant: 'PM10',
      status: pm25 === null ? 'unknown' : 'within_limit',
      average24h: pm25 === null ? null : 40,
      limit: 100,
    },
  ],
});

const weather = (fields: Partial<WeatherNow> = {}): WeatherNow => ({
  time: '2026-11-18T10:00:00.000Z',
  temperatureC: 28,
  precipitationMm: 0,
  precipitationProbability: 0,
  cloudCoverPercent: 0,
  visibilityM: 20000,
  isDay: true,
  retrievedAt: '2026-11-18T10:05:00.000Z',
  ...fields,
});

const CLEAR = air(36);

describe('sceneFromConditions', () => {
  it('no weather adds no weather layers', () => {
    expect(sceneFromConditions(CLEAR, null)).toEqual({
      haze: 2,
      clouds: 0,
      rain: false,
      heat: false,
      fog: false,
      smog: false,
    });
  });

  it('clouds by cover', () => {
    const clouds = [10, 20, 49, 50, 80].map(
      (cloudCoverPercent) =>
        sceneFromConditions(CLEAR, weather({ cloudCoverPercent })).clouds,
    );
    expect(clouds).toEqual([0, 1, 1, 2, 3]);
  });

  it('rain by amount or chance', () => {
    const rain = (precipitationMm: number, precipitationProbability: number) =>
      sceneFromConditions(
        CLEAR,
        weather({ precipitationMm, precipitationProbability }),
      ).rain;
    expect(rain(0.2, 0)).toBe(true);
    expect(rain(0.1, 59)).toBe(false);
    expect(rain(0, 60)).toBe(true);
  });

  it('heat from 35 °C', () => {
    const heat = (temperatureC: number) =>
      sceneFromConditions(CLEAR, weather({ temperatureC })).heat;
    expect(heat(34.9)).toBe(false);
    expect(heat(35)).toBe(true);
  });

  it('rain suppresses heat', () => {
    const scene = sceneFromConditions(
      CLEAR,
      weather({ temperatureC: 38, precipitationMm: 0.5 }),
    );
    expect(scene.rain).toBe(true);
    expect(scene.heat).toBe(false);
  });

  it('fog below 1 km visibility', () => {
    const fog = (visibilityM: number) =>
      sceneFromConditions(CLEAR, weather({ visibilityM })).fog;
    expect(fog(999)).toBe(true);
    expect(fog(1000)).toBe(false);
  });

  it('smog at the worst haze', () => {
    expect(sceneFromConditions(air(130), null).smog).toBe(true);
    expect(sceneFromConditions(air(100), null).smog).toBe(false);
  });

  it('unknown fields add no weather', () => {
    const scene = sceneFromConditions(
      CLEAR,
      weather({
        temperatureC: null,
        precipitationMm: null,
        precipitationProbability: null,
        cloudCoverPercent: null,
        visibilityM: null,
      }),
    );
    expect(scene).toMatchObject({
      clouds: 0,
      rain: false,
      heat: false,
      fog: false,
    });
  });
});
