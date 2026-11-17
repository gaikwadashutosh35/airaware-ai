import { Router } from 'express';
import { z } from 'zod';
import { parseQuery } from '../errors.ts';
import { searchLocations } from '../services/location/geocoding.ts';

const searchQuery = z.object({ q: z.string().trim().min(2).max(80) });

export function locationsRouter(): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const { q } = parseQuery(searchQuery, req.query);
    res.json({ data: await searchLocations(q) });
  });

  return router;
}
