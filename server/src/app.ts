import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pkg from '../package.json' with { type: 'json' };
import { errorHandler } from './errors.ts';
import { airQualityRouter } from './routes/airQuality.ts';
import { locationsRouter } from './routes/locations.ts';

export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  // Per-client limit. It does not cap total Open-Meteo calls (10 000/day);
  // that residual risk is accepted in docs/IMPLEMENTATION_PLAN.md §5.3.
  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again in a minute.',
        },
      },
    }),
  );

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', version: pkg.version });
  });
  app.use('/api/v1/air-quality', airQualityRouter());
  app.use('/api/v1/locations', locationsRouter());

  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use(errorHandler);

  return app;
}
