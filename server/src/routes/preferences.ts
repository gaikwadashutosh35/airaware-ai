import express, { Router } from 'express';
import { z } from 'zod';
import type {
  HouseholdContext,
  PreferencesUpdate,
  SavedPlace,
} from '../../../shared/contracts.ts';
import { parseQuery } from '../errors.ts';
import { placeSchema } from '../services/recommendations/dailyPlan.ts';
import { householdContextSchema } from '../services/recommendations/householdContext.ts';
import type { SavedStore } from '../services/saved/store.ts';
import { savedErrors, userFrom } from '../services/saved/userFrom.ts';

// Only the fields sent change; `place: null` forgets the place.
const updateSchema: z.ZodType<PreferencesUpdate> = z
  .strictObject({
    context: householdContextSchema.optional(),
    place: placeSchema.nullable().optional(),
  })
  .refine(
    (update) => update.context !== undefined || update.place !== undefined,
    'Send the answers, a place, or both.',
  );

// The stored row holds the answers plus an optional remembered place. A row
// whose answers no longer match the schema reads as nothing saved; a bad
// place alone reads as no place.
function readRow(
  stored: unknown,
): { context: HouseholdContext; place: SavedPlace | null } | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const { place, ...answers } = stored as Record<string, unknown>;
  const context = householdContextSchema.safeParse(answers);
  if (!context.success) return null;
  const remembered = place === undefined ? null : placeSchema.safeParse(place);
  return {
    context: context.data,
    place: remembered?.success ? remembered.data : null,
  };
}

export function preferencesRouter(store: SavedStore | null): Router {
  const router = Router();
  router.use(express.json({ limit: '4kb' }));

  router.get('/', async (req, res) => {
    const saved = await (await userFrom(req, store)).getPreferences();
    const row = saved && readRow(saved.context);
    res.json({ data: row ? { ...row, updatedAt: saved.updatedAt } : null });
  });

  router.put('/', async (req, res) => {
    const user = await userFrom(req, store);
    const update = parseQuery(updateSchema, req.body, 'Invalid request body.');
    const existing = readRow((await user.getPreferences())?.context);
    const context = update.context ?? existing?.context ?? {};
    const place =
      update.place === undefined ? (existing?.place ?? null) : update.place;
    const { updatedAt } = await user.putPreferences(
      place ? { ...context, place } : context,
    );
    res.json({ data: { context, place, updatedAt } });
  });

  router.use(savedErrors);
  return router;
}
