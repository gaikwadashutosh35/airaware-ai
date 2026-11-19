import serverless from 'serverless-http';
import { createApp } from './app.ts';
import { appOptionsFromEnv } from './config/appOptions.ts';
import { loadEnv } from './config/env.ts';

// What Netlify reads back from a Lambda-style function.
interface LambdaResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

// The API as one Netlify Function (netlify/functions/api.ts re-exports it).
// Netlify's CDN serves the built client, so no clientDir here.
export const handler = serverless(
  createApp({
    ...appOptionsFromEnv(loadEnv(process.env)),
    clientIpHeader: 'x-nf-client-connection-ip',
  }),
) as (event: object, context: object) => Promise<LambdaResult>;
