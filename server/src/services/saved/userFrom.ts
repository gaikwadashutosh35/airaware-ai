import type { ErrorRequestHandler, Request } from 'express';
import { HttpError } from '../../errors.ts';
import {
  PlanLimitError,
  StoreUnavailableError,
  type SavedStore,
  type UserStore,
} from './store.ts';

// Last middleware of each saved-data router: store errors leave as the API
// envelope; everything else goes on to the app's error handler.
export const savedErrors: ErrorRequestHandler = (err, _req, _res, next) => {
  if (err instanceof StoreUnavailableError) return next(saveUnavailable());
  if (err instanceof PlanLimitError) {
    return next(
      new HttpError(
        409,
        'LIMIT_REACHED',
        'You can keep up to 20 saved plans. Delete one to save another.',
      ),
    );
  }
  next(err);
};

export const saveUnavailable = () =>
  new HttpError(503, 'SAVE_UNAVAILABLE', 'Saving is not available right now.');

const unauthenticated = () =>
  new HttpError(401, 'UNAUTHENTICATED', 'Sign-in expired or missing.');

// The one auth gate for saved data. The user id comes only from the verified
// token, never from the body, query or path.
export async function userFrom(
  req: Request,
  store: SavedStore | null,
): Promise<UserStore> {
  if (!store) throw saveUnavailable();
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
  if (!match?.[1]) throw unauthenticated();
  const token = match[1];
  let userId: string | null;
  try {
    userId = await store.verify(token);
  } catch (error) {
    // An unchecked token is not a bad token.
    if (error instanceof StoreUnavailableError) throw saveUnavailable();
    throw error;
  }
  if (!userId) throw unauthenticated();
  return store.forUser(token, userId);
}
