import express from 'express';
import helmet from 'helmet';
import pkg from '../package.json' with { type: 'json' };

export function createApp(): express.Express {
  const app = express();
  app.use(helmet());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', version: pkg.version });
  });

  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  return app;
}
