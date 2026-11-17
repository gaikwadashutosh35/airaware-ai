import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler, HttpError } from './errors.ts';

function appThatThrows(error: Error): express.Express {
  const app = express();
  app.get('/throw', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends an HttpError as the API error envelope', async () => {
    const error = new HttpError(
      502,
      'PROVIDER_ERROR',
      'Air-quality provider unavailable.',
    );

    const res = await request(appThatThrows(error)).get('/throw');

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: {
        code: 'PROVIDER_ERROR',
        message: 'Air-quality provider unavailable.',
      },
    });
  });

  it('includes details when the HttpError has them', async () => {
    const details = [{ path: 'latitude', message: 'Invalid' }];
    const error = new HttpError(
      400,
      'VALIDATION_ERROR',
      'Invalid query parameters.',
      details,
    );

    const res = await request(appThatThrows(error)).get('/throw');

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(details);
  });

  it('hides unexpected errors behind a generic 500 without a stack', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(
      appThatThrows(new Error('db password in stack')),
    ).get('/throw');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    });
    expect(res.text).not.toContain('password');
    expect(res.text).not.toContain('at ');
  });
});
