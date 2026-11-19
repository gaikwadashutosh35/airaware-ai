import express from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pkg from '../package.json' with { type: 'json' };
import { errorHandler } from './errors.ts';
import { accountRouter } from './routes/account.ts';
import { airQualityRouter } from './routes/airQuality.ts';
import { locationsRouter } from './routes/locations.ts';
import { plansRouter } from './routes/plans.ts';
import { preferencesRouter } from './routes/preferences.ts';
import { recommendationsRouter } from './routes/recommendations.ts';
import { createCachedForecast } from './services/air-data/cachedForecast.ts';
import type { GeneratePlan } from './services/ai/personalize.ts';
import { createDailyPlanner } from './services/recommendations/dailyPlan.ts';
import type { SavedStore } from './services/saved/store.ts';

export interface AppOptions {
  // Folder holding the built client (index.html + assets), served same-origin.
  clientDir?: string;
  // Cloud Run sits behind one Google front end; only then trust its
  // X-Forwarded-For, or clients could spoof their IP past the rate limit.
  trustProxy?: boolean;
  // Gemini for the daily plan; without both, plans are rules-only.
  generatePlan?: GeneratePlan;
  aiModel?: string;
  // Claude, asked only when Gemini gives no accepted answer.
  backupPlan?: { generate: GeneratePlan; model: string };
  // Supabase-backed saved data; without it every saved-data route answers
  // 503 SAVE_UNAVAILABLE.
  saved?: SavedStore;
  // A header the host's edge sets to the client IP (Netlify:
  // x-nf-client-connection-ip). When set, rate limits key on it and ignore
  // X-Forwarded-For, which the client controls there.
  clientIpHeader?: string;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  if (options.trustProxy) app.set('trust proxy', 1);
  // The browser talks to Supabase directly only for sign-in.
  app.use(
    options.saved
      ? helmet({
          contentSecurityPolicy: {
            directives: { connectSrc: ["'self'", options.saved.origin] },
          },
        })
      : helmet(),
  );
  const header = options.clientIpHeader;
  const clientKey = header
    ? {
        keyGenerator: (req: express.Request) => {
          const ip = req.get(header) || req.ip;
          return ip ? ipKeyGenerator(ip) : 'unknown';
        },
        validate: { xForwardedForHeader: false },
      }
    : {};
  // Per-client limit. It does not cap total Open-Meteo calls (10 000/day);
  // that residual risk is accepted in docs/IMPLEMENTATION_PLAN.md §5.3.
  app.use(
    '/api/v1',
    rateLimit({
      ...clientKey,
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
  const forecast = createCachedForecast();
  const planner = createDailyPlanner({
    forecast,
    generate: options.generatePlan ?? null,
    model: options.aiModel ?? null,
    backup: options.backupPlan ?? null,
  });
  // One counter for every route that can call Gemini.
  const planLimit = rateLimit({
    ...clientKey,
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again in a minute.',
      },
    },
  });
  app.use('/api/v1/air-quality', airQualityRouter(forecast));
  app.use('/api/v1/locations', locationsRouter());
  app.use(
    '/api/v1/recommendations',
    recommendationsRouter({ planner, planLimit }),
  );
  const saved = options.saved ?? null;
  app.use('/api/v1/profile/preferences', preferencesRouter(saved));
  app.use('/api/v1/plans', plansRouter({ store: saved, planner, planLimit }));
  app.use('/api/v1/account', accountRouter(saved));

  const { clientDir } = options;
  if (clientDir) {
    app.use(express.static(clientDir));
    app.get(['/app', '/privacy'], (_req, res) => {
      res.sendFile('index.html', { root: clientDir });
    });
  }

  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  app.use(errorHandler);

  return app;
}
