import type { ErrorRequestHandler } from 'express';
import type { z } from 'zod';
import type { ErrorCode } from '../../shared/contracts.ts';

export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Invalid query parameters.',
      issues,
    );
  }
  return result.data;
}

// Last middleware in the app: every error leaves as the API.md envelope.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
  });
};
