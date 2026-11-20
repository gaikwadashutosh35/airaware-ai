import { Router } from 'express';
import { z } from 'zod';
import { parseQuery } from '../errors.ts';
import { guideSet } from '../services/recommendations/guides.ts';

const guidesQuery = z.strictObject({ topic: z.enum(['home', 'habits']) });

// The guide library for My Home and Better Habits. It calls no AI, so it is
// mounted ahead of the plan limiter; it changes only on deploy, so the
// browser may keep it for an hour.
export function guidesRouter(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { topic } = parseQuery(guidesQuery, req.query);
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ data: guideSet(topic) });
  });

  return router;
}
