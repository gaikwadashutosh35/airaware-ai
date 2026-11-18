import express, { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError, parseQuery } from '../errors.ts';
import {
  planRequestSchema,
  type DailyPlanner,
} from '../services/recommendations/dailyPlan.ts';
import type { SavedStore } from '../services/saved/store.ts';
import { savedErrors, userFrom } from '../services/saved/userFrom.ts';

const idParams = z.object({ id: z.uuid() });

// Same answer for a missing plan and another user's, so ids can't be probed.
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Saved plan not found.');

export function plansRouter(deps: {
  store: SavedStore | null;
  planner: DailyPlanner;
  planLimit: RequestHandler;
}): Router {
  const { store } = deps;
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ data: await (await userFrom(req, store)).listPlans() });
  });

  router.get('/:id', async (req, res) => {
    const user = await userFrom(req, store);
    const { id } = parseQuery(idParams, req.params, 'Invalid plan id.');
    const plan = await user.getPlan(id);
    if (!plan) throw notFound();
    res.json({ data: plan });
  });

  // Saves the plan the server builds for this request, never one sent in.
  router.post(
    '/',
    deps.planLimit,
    express.json({ limit: '4kb' }),
    async (req, res) => {
      const user = await userFrom(req, store);
      const request = parseQuery(
        planRequestSchema,
        req.body,
        'Invalid request body.',
      );
      const plan = await deps.planner(request, new Date());
      res
        .status(201)
        .json({ data: await user.insertPlan(request.place.label, plan) });
    },
  );

  router.delete('/:id', async (req, res) => {
    const user = await userFrom(req, store);
    const { id } = parseQuery(idParams, req.params, 'Invalid plan id.');
    if (!(await user.deletePlan(id))) throw notFound();
    res.status(204).end();
  });

  router.use(savedErrors);
  return router;
}
