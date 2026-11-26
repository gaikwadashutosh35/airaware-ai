import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  WeatherNow,
} from '../../../../shared/contracts.ts';
import { forecastFixture } from '../../test/fixtures.ts';
import { NEAR_YOU } from '../location/place.ts';
import {
  NEUTRAL,
  backdropNote,
  backdropScene,
  sceneFromConditions,
} from './scene.ts';

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
  utcOffsetSeconds: 0,
  days: [],
  ...fields,
});

// Within the weather fixture's hour.
const NOW = new Date('2026-11-18T10:30:00.000Z');
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

  // A level that disagrees with its own averages and statuses: only reading
  // the level passes, so ratio or status grading can't come back unseen.
  it('the level wins over averages that disagree with it', () => {
    const high: AirAssessment = { ...air(200), level: 'not_elevated' };
    const low: AirAssessment = { ...air(10), level: 'elevated' };
    expect(sceneFromConditions(high, null).air).toBe('within');
    expect(sceneFromConditions(low, null).air).toBe('above');
  });

  it('no weather adds no weather layers and no glow', () => {
    expect(sceneFromConditions(WITHIN, null)).toEqual({
      air: 'within',
      clouds: 0,
      rain: false,
      heat: false,
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

  // Owner, 22 Nov: no fog band. Low visibility in Indian winters is often
  // smog, and visibility can't tell fog from it (brief §5.1).
  it('low visibility draws nothing', () => {
    expect(sceneFromConditions(WITHIN, weather({ visibilityM: 500 }))).toEqual(
      sceneFromConditions(WITHIN, weather()),
    );
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
      const weatherOf = ({ clouds, rain, heat }: (typeof scenes)[0]) => ({
        clouds,
        rain,
        heat,
      });
      expect(weatherOf(scenes[1]!)).toEqual(weatherOf(scenes[0]!));
      expect(weatherOf(scenes[2]!)).toEqual(weatherOf(scenes[0]!));
    }
  });

  // Backdrop design §5.2.
  it('backdrop: the silhouette only while a first forecast loads', () => {
    expect(backdropScene(null, true, NOW)).toBeNull();
  });

  it('backdrop: neutral with no forecast or on error', () => {
    expect(backdropScene(null, false, NOW)).toEqual(NEUTRAL);
    expect(NEUTRAL).toEqual({
      air: 'unknown',
      clouds: 0,
      rain: false,
      heat: false,
      glow: false,
    });
  });

  it('backdrop: a shown forecast draws its scene, even while reloading', () => {
    const s = {
      ...forecastFixture,
      airCheck: ABOVE,
      weather: weather({ cloudCoverPercent: 60 }),
    };
    const expected = sceneFromConditions(s.airCheck, s.weather);
    expect(backdropScene(s, false, NOW)).toEqual(expected);
    expect(backdropScene(s, true, NOW)).toEqual(expected);
  });

  // Final review: weather is for its hour. Like the forecast, it counts for
  // an hour after that (when the hourly reload replaces it), then the scene
  // stops drawing it: no rain or sun from hours ago on a page left open.
  it('backdrop: weather over an hour past its hour draws nothing', () => {
    const s = {
      ...forecastFixture,
      airCheck: ABOVE,
      weather: weather({ cloudCoverPercent: 60, precipitationMm: 1 }),
    };
    expect(
      backdropScene(s, false, new Date('2026-11-18T12:00:00.000Z')),
    ).toEqual(sceneFromConditions(ABOVE, s.weather));
    expect(
      backdropScene(s, false, new Date('2026-11-18T12:01:00.000Z')),
    ).toEqual(sceneFromConditions(ABOVE, null));
  });

  // The backdrop review: the level in words, so the sky's tint is never
  // the only sign of it on pages with no other air words.
  it('backdrop note', () => {
    expect(backdropNote('Pune, Maharashtra', 'not_elevated', false)).toBe(
      'Background: model forecast for Pune, Maharashtra. Within the limit.',
    );
    expect(backdropNote('Pune, Maharashtra', 'elevated', true)).toBe(
      'Background: model forecast for Pune, Maharashtra. Above the limit. Not current.',
    );
    expect(backdropNote(NEAR_YOU, 'unknown', false)).toBe(
      'Background: model forecast near you (approximate). No data.',
    );
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
      glow: false,
    });
  });
});
