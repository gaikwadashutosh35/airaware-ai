import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { DailyPlan } from '../../../shared/contracts.ts';
import { parseQuery } from '../errors.ts';
import { createTtlCache } from '../services/air-data/cache.ts';
import type { CachedForecast } from '../services/air-data/cachedForecast.ts';
import { personalize, type GeneratePlan } from '../services/ai/personalize.ts';
import { toWriterInput } from '../services/ai/planOutput.ts';
import { PROMPT_VERSION } from '../services/ai/prompts.ts';
import { assessAir } from '../services/recommendations/airCheck.ts';
import { householdContextSchema } from '../services/recommendations/householdContext.ts';
import { buildPlan } from '../services/recommendations/plan.ts';
import { buildCandidates } from '../services/recommendations/rules.ts';

const PLAN_TTL_MS = 10 * 60 * 1000;
const PLAN_MAX_ENTRIES = 500;

// At most 2 decimals (~1.1 km), the same privacy rule as the forecast route.
function coordinate(min: number, max: number) {
  return z
    .number()
    .min(min)
    .max(max)
    .refine((v) => Number(v.toFixed(2)) === v, 'At most 2 decimal places.');
}
const planRequest = z.strictObject({
  place: z.strictObject({
    label: z.string().trim().min(1).max(120),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
  }),
  householdContext: householdContextSchema.optional(),
});

export function recommendationsRouter(deps: {
  forecast: CachedForecast;
  generate: GeneratePlan | null;
  model: string | null;
}): Router {
  const router = Router();
  // Gemini counts as configured only with both a generator and a model name.
  const ai =
    deps.generate && deps.model
      ? { generate: deps.generate, model: deps.model }
      : null;
  const plans = createTtlCache<DailyPlan>(PLAN_TTL_MS, PLAN_MAX_ENTRIES);

  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again in a minute.',
        },
      },
    }),
  );
  router.use(express.json({ limit: '4kb' }));

  router.post('/daily-plan', async (req, res) => {
    const { place, householdContext = {} } = parseQuery(
      planRequest,
      req.body,
      'Invalid request body.',
    );
    const now = new Date();
    // A provider failure is not an error here: the plan says air is unknown.
    const series = await deps
      .forecast(place.latitude, place.longitude, now)
      .catch(() => null);
    const air = assessAir(series, now);
    const candidates = buildCandidates(householdContext, air);

    const key = `${place.latitude},${place.longitude}|${place.label}|${air.windowStart}|${JSON.stringify(householdContext)}`;
    const cached = plans.get(key, now.getTime());
    if (cached) {
      res.json({ data: cached });
      return;
    }

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
    res.json({ data: plan });
  });

  return router;
}
