import { Router } from 'express';
import { z } from 'zod';
import { parseQuery } from '../errors.ts';
import { searchLocations } from '../services/location/geocoding.ts';
import type { ReverseGeocode } from '../services/location/reverseGeocode.ts';
import { coordinatesQuery } from './airQuality.ts';

const searchQuery = z.object({ q: z.string().trim().min(2).max(80) });

export function locationsRouter(reverseGeocode?: ReverseGeocode): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const { q } = parseQuery(searchQuery, req.query);
    res.json({ data: await searchLocations(q) });
  });

  // A town or city name for a device location (Google Maps), or null when
  // no key is set or Google has none. Coordinates have at most 2 decimals.
  router.get('/reverse', async (req, res) => {
    const { latitude, longitude } = parseQuery(coordinatesQuery, req.query);
    const name = reverseGeocode
      ? await reverseGeocode(latitude, longitude)
      : null;
    // Google Maps content: never cached by us or a CDN.
    res.set('Cache-Control', 'no-store');
    res.json({ data: { name } });
  });

  return router;
}
