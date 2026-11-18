import { describe, expect, it, vi } from 'vitest';
import type { ModelForecast } from '../air-data/openMeteo.ts';
import type { CachedForecast } from '../air-data/cachedForecast.ts';
import type { GeneratePlan } from '../ai/personalize.ts';
import { UG_PER_M3 } from './airCheck.ts';
import { createDailyPlanner, type PlanRequest } from './dailyPlan.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const START = Date.UTC(2026, 10, 18, 10);
const MINUTE = 60_000;

const request: PlanRequest = {
  place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
  householdContext: { routine: { outdoorExercise: true } },
};

function forecastSeries(): ModelForecast {
  return {
    provider: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    dataKind: 'model_forecast',
    modelResolution: 'CAMS global, about 45 km',
    retrievedAt: NOW.toISOString(),
    limitations: ['Model forecast, not a station measurement.'],
    units: { PM2_5: UG_PER_M3, PM10: UG_PER_M3 },
    hours: Array.from({ length: 48 }, (_, i) => ({
      time: new Date(START + i * 60 * MINUTE).toISOString(),
      values: { PM2_5: 80, PM10: 90 },
    })),
  };
}

const forecastFrom =
  (answer: () => Promise<ModelForecast>): CachedForecast =>
  () =>
    answer();

describe('createDailyPlanner', () => {
  it('the same request within 10 minutes returns the same plan', async () => {
    const forecast = forecastFrom(() => Promise.resolve(forecastSeries()));
    const planner = createDailyPlanner({
      forecast,
      generate: null,
      model: null,
    });
    const first = await planner(request, NOW);
    const second = await planner(request, new Date(NOW.getTime() + 5 * MINUTE));
    // The forecast has its own cache (CachedForecast); this pins the plan cache.
    expect(second).toBe(first);
  });

  it('a fallback plan is not cached', async () => {
    const forecast = forecastFrom(() => Promise.resolve(forecastSeries()));
    const generate = vi.fn<GeneratePlan>(() =>
      Promise.reject(new Error('http 402')),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const planner = createDailyPlanner({
      forecast,
      generate,
      model: 'gemini-test',
    });
    const first = await planner(request, NOW);
    const second = await planner(request, NOW);
    expect(first.generatedBy).toBe('rules');
    expect(second).not.toBe(first);
    errorSpy.mockRestore();
  });

  it('a plan without a forecast is not cached', async () => {
    const forecast = forecastFrom(() => Promise.reject(new Error('down')));
    const planner = createDailyPlanner({
      forecast,
      generate: null,
      model: null,
    });
    const first = await planner(request, NOW);
    const second = await planner(request, NOW);
    expect(first.air.level).toBe('unknown');
    expect(second).not.toBe(first);
  });
});
