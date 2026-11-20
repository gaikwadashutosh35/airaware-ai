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

const WITHIN = air(36);
const ABOVE = air(72);
const UNKNOWN = air(null);

describe('sceneFromConditions', () => {
  // Cityscape D1: the look comes from the server's level, never from the
  // averages (no ratio bands, no thresholds of our own).
  it('air state comes from the server level only', () => {
    expect(sceneFromConditions(WITHIN, null).air).toBe('within');
    expect(sceneFromConditions(ABOVE, null).air).toBe('above');
    expect(sceneFromConditions(UNKNOWN, null).air).toBe('unknown');
    expect(sceneFromConditions(air(61), null).air).toBe('above');
    expect(sceneFromConditions(air(200), null).air).toBe('above');
  });

  it('no weather adds no weather layers and no glow', () => {
    expect(sceneFromConditions(WITHIN, null)).toEqual({
      air: 'within',
      clouds: 0,
      rain: false,
      heat: false,
      fog: false,
      glow: false,
    });
  });

  it('clouds by cover', () => {
    const clouds = [10, 20, 49, 50, 80].map(
      (cloudCoverPercent) =>
        sceneFromConditions(WITHIN, weather({ cloudCoverPercent })).clouds,
    );
    expect(clouds).toEqual([0, 1, 1, 2, 3]);
  });

  // Cityscape D4: rain only when the forecast says some falls this hour.
  it('rain only from a forecast amount', () => {
    const rain = (
      precipitationMm: number | null,
      precipitationProbability: number,
    ) =>
      sceneFromConditions(
        WITHIN,
        weather({ precipitationMm, precipitationProbability }),
      ).rain;
    expect(rain(0.2, 0)).toBe(true);
    expect(rain(0.19, 0)).toBe(false);
    expect(rain(0, 90)).toBe(false);
    expect(rain(null, 90)).toBe(false);
  });

  it('heat from 35 °C', () => {
    const heat = (temperatureC: number) =>
      sceneFromConditions(WITHIN, weather({ temperatureC })).heat;
    expect(heat(34.9)).toBe(false);
    expect(heat(35)).toBe(true);
  });

  it('rain suppresses heat', () => {
    const scene = sceneFromConditions(
      WITHIN,
      weather({ temperatureC: 38, precipitationMm: 0.5 }),
    );
    expect(scene.rain).toBe(true);
    expect(scene.heat).toBe(false);
  });

  it('fog below 1 km visibility', () => {
    const fog = (visibilityM: number) =>
      sceneFromConditions(WITHIN, weather({ visibilityM })).fog;
    expect(fog(999)).toBe(true);
    expect(fog(1000)).toBe(false);
  });

  // Cityscape D3: the glow is daylight, so it needs a known day and a known
  // sky, and the air must be known (unknown stays neutral).
  it('the glow needs daylight and known weather', () => {
    const glow = (check: AirAssessment, fields: Partial<WeatherNow>) =>
      sceneFromConditions(check, weather(fields)).glow;
    expect(glow(WITHIN, {})).toBe(true);
    expect(glow(ABOVE, {})).toBe(true);
    expect(glow(WITHIN, { isDay: false })).toBe(false);
    expect(glow(WITHIN, { isDay: null })).toBe(false);
    expect(glow(WITHIN, { cloudCoverPercent: 80 })).toBe(false);
    expect(glow(WITHIN, { precipitationMm: 1 })).toBe(false);
    expect(glow(UNKNOWN, {})).toBe(false);
  });

  // Final review: "known weather" means the sky and rain are known too; an
  // unknown cover could be overcast, an unknown amount could be rain.
  it('the glow needs a known sky and rain', () => {
    const glow = (fields: Partial<WeatherNow>) =>
      sceneFromConditions(WITHIN, weather(fields)).glow;
    expect(glow({ cloudCoverPercent: null })).toBe(false);
    expect(glow({ precipitationMm: null })).toBe(false);
    expect(glow({})).toBe(true);
  });

  // My call 2: weather cached before the field existed has no isDay.
  it('a weather object without isDay draws no glow', () => {
    const old: Partial<WeatherNow> = weather();
    delete old.isDay;
    expect(sceneFromConditions(WITHIN, old as WeatherNow).glow).toBe(false);
  });

  it('air and weather never change each other', () => {
    const skies = [
      weather({ cloudCoverPercent: 0 }),
      weather({ cloudCoverPercent: 90 }),
      weather({ cloudCoverPercent: 90, precipitationMm: 2 }),
      weather({ temperatureC: 38, visibilityM: 500 }),
      null,
    ];
    for (const sky of skies) {
      const scenes = [WITHIN, ABOVE, UNKNOWN].map((check) =>
        sceneFromConditions(check, sky),
      );
      expect(scenes.map((s) => s.air)).toEqual(['within', 'above', 'unknown']);
      const weatherOf = ({ clouds, rain, heat, fog }: (typeof scenes)[0]) => ({
        clouds,
        rain,
        heat,
        fog,
      });
      expect(weatherOf(scenes[1]!)).toEqual(weatherOf(scenes[0]!));
      expect(weatherOf(scenes[2]!)).toEqual(weatherOf(scenes[0]!));
    }
  });

  it('unknown fields add no weather', () => {
    const scene = sceneFromConditions(
      WITHIN,
      weather({
        temperatureC: null,
        precipitationMm: null,
        precipitationProbability: null,
        cloudCoverPercent: null,
        visibilityM: null,
        isDay: null,
      }),
    );
    expect(scene).toMatchObject({
      clouds: 0,
      rain: false,
      heat: false,
      fog: false,
      glow: false,
    });
  });
});
