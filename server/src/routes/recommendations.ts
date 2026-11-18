import express, { Router, type RequestHandler } from 'express';
import { parseQuery } from '../errors.ts';
import {
  planRequestSchema,
  type DailyPlanner,
} from '../services/recommendations/dailyPlan.ts';

export function recommendationsRouter(deps: {
  planner: DailyPlanner;
  // Shared with the save-plan route: both can call Gemini.
  planLimit: RequestHandler;
}): Router {
  const router = Router();
  router.use(deps.planLimit);
  router.use(express.json({ limit: '4kb' }));

  router.post('/daily-plan', async (req, res) => {
    const request = parseQuery(
      planRequestSchema,
      req.body,
      'Invalid request body.',
    );
    res.json({ data: await deps.planner(request, new Date()) });
  });

  return router;
}
