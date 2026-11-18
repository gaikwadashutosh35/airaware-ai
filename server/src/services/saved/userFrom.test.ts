import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../../errors.ts';
import { createFakeStore } from '../../test-fixtures/fakeStore.ts';
import { userFrom } from './userFrom.ts';

function req(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as Request;
}

async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(HttpError);
  const { status, code, message } = error as HttpError;
  return { status, code, message };
}

const store = () => createFakeStore().store;

describe('userFrom', () => {
  it('saving off is 503', async () => {
    expect(await failure(userFrom(req('Bearer token-a'), null))).toEqual({
      status: 503,
      code: 'SAVE_UNAVAILABLE',
      message: 'Saving is not available right now.',
    });
  });

  it('no header is 401', async () => {
    expect(await failure(userFrom(req(), store()))).toEqual({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Sign-in expired or missing.',
    });
  });

  it('a non-Bearer header is 401', async () => {
    expect(
      (await failure(userFrom(req('Basic token-a'), store()))).status,
    ).toBe(401);
  });

  it('an invalid token is 401', async () => {
    expect((await failure(userFrom(req('Bearer nope'), store()))).status).toBe(
      401,
    );
  });

  it('a check that cannot reach Supabase is 503', async () => {
    expect(
      (await failure(userFrom(req('Bearer token-down'), store()))).code,
    ).toBe('SAVE_UNAVAILABLE');
  });

  it("a valid token gives that user's store", async () => {
    const fake = createFakeStore();
    fake.seedPreferences('user-a', { routine: { outdoorExercise: true } });
    const user = await userFrom(req('Bearer token-a'), fake.store);
    expect((await user.getPreferences())?.context).toEqual({
      routine: { outdoorExercise: true },
    });
  });
});
