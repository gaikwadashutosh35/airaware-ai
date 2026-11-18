import { Router } from 'express';
import type { SavedStore } from '../services/saved/store.ts';
import { savedErrors, userFrom } from '../services/saved/userFrom.ts';

export function accountRouter(store: SavedStore | null): Router {
  const router = Router();

  // Deletes the signed-in user; their preferences and plans go with them.
  router.delete('/', async (req, res) => {
    await (await userFrom(req, store)).deleteAccount();
    res.status(204).end();
  });

  router.use(savedErrors);
  return router;
}
