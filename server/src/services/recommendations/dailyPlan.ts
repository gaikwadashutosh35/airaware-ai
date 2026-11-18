import { z } from 'zod';
import type {
  DailyPlan,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { createTtlCache } from '../air-data/cache.ts';
import type { CachedForecast } from '../air-data/cachedForecast.ts';
import { personalize, type GeneratePlan } from '../ai/personalize.ts';
import { toWriterInput } from '../ai/planOutput.ts';
import { PROMPT_VERSION } from '../ai/prompts.ts';
import { assessAir } from './airCheck.ts';
import { householdContextSchema } from './householdContext.ts';
import { buildPlan } from './plan.ts';
import { buildCandidates } from './rules.ts';

const PLAN_TTL_MS = 10 * 60 * 1000;
const PLAN_MAX_ENTRIES = 500;

export interface PlanRequest {
  place: { label: string; latitude: number; longitude: number };
  householdContext?: HouseholdContext;
}

// At most 2 decimals (~1.1 km), the same privacy rule as the forecast route.
function coordinate(min: number, max: number) {
  return z
    .number()
    .min(min)
    .max(max)
    .refine((v) => Number(v.toFixed(2)) === v, 'At most 2 decimal places.');
}
export const planRequestSchema: z.ZodType<PlanRequest> = z.strictObject({
  place: z.strictObject({
    label: z.string().trim().min(1).max(120),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
  }),
  householdContext: householdContextSchema.optional(),
});

export type DailyPlanner = (
  request: PlanRequest,
  now: Date,
) => Promise<DailyPlan>;

// Builds the daily plan for both the plan route and the save route, so a
// saved plan is always one the server made.
export function createDailyPlanner(deps: {
  forecast: CachedForecast;
  generate: GeneratePlan | null;
  model: string | null;
}): DailyPlanner {
  // Gemini counts as configured only with both a generator and a model name.
  const ai =
    deps.generate && deps.model
      ? { generate: deps.generate, model: deps.model }
      : null;
  const plans = createTtlCache<DailyPlan>(PLAN_TTL_MS, PLAN_MAX_ENTRIES);

  return async ({ place, householdContext = {} }, now) => {
    // A provider failure is not an error here: the plan says air is unknown.
    const series = await deps
      .forecast(place.latitude, place.longitude, now)
      .catch(() => null);
    const air = assessAir(series, now);
    const candidates = buildCandidates(householdContext, air);

    const key = `${place.latitude},${place.longitude}|${place.label}|${air.windowStart}|${JSON.stringify(householdContext)}`;
    const cached = plans.get(key, now.getTime());
    if (cached) return cached;

    const output = ai
      ? await personalize(toWriterInput(air, candidates), ai.generate)
      : null;
    const plan = buildPlan({
      label: place.label,
      air,
      forecast: series,
      candidates,
      ai:
        output && ai
          ? { output, model: ai.model, promptVersion: PROMPT_VERSION }
          : null,
    });
    // Fallback plans are not cached, so the next request retries Gemini
    // and Open-Meteo instead of serving a degraded plan for 10 minutes.
    if (series && (!ai || plan.generatedBy === 'ai')) {
      plans.set(key, plan, now.getTime());
    }
    return plan;
  };
}
