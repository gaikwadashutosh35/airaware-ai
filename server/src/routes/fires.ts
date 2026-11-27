import { Router } from 'express';
import type { Fires } from '../services/fires/firms.ts';
import { coordinatesQuery } from './airQuality.ts';
import { parseQuery } from '../errors.ts';

// NASA FIRMS fire hotspots near a place (owner, 27 Nov). Coordinates have at
// most 2 decimals, like the forecast's. Without a key: not_configured.
export function firesRouter(fires?: Fires): Router {
  const router = Router();
  router.get('/nearby', async (req, res) => {
    const { latitude, longitude } = parseQuery(coordinatesQuery, req.query);
    res.json({
      data: fires
        ? await fires(latitude, longitude, new Date())
        : { status: 'not_configured' },
    });
  });
  return router;
}
