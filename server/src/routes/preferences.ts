import express, { Router } from 'express';
import { parseQuery } from '../errors.ts';
import { householdContextSchema } from '../services/recommendations/householdContext.ts';
import type { SavedStore } from '../services/saved/store.ts';
import { savedErrors, userFrom } from '../services/saved/userFrom.ts';

export function preferencesRouter(store: SavedStore | null): Router {
  const router = Router();
  router.use(express.json({ limit: '4kb' }));

  router.get('/', async (req, res) => {
    const saved = await (await userFrom(req, store)).getPreferences();
    // A row written outside the app may not match; treat it as nothing saved.
    const context = saved && householdContextSchema.safeParse(saved.context);
    res.json({
      data:
        saved && context?.success
          ? { context: context.data, updatedAt: saved.updatedAt }
          : null,
    });
  });

  router.put('/', async (req, res) => {
    const user = await userFrom(req, store);
    const context = parseQuery(
      householdContextSchema,
      req.body,
      'Invalid request body.',
    );
    res.json({ data: await user.putPreferences(context) });
  });

  router.use(savedErrors);
  return router;
}
