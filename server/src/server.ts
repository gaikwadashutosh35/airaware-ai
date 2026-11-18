import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadEnv } from './config/env.ts';

const env = loadEnv(process.env);
// The built client, when present (production image; in development Vite
// serves the client on its own port).
const clientDir = fileURLToPath(new URL('../../client/dist', import.meta.url));

createApp({
  clientDir: existsSync(clientDir) ? clientDir : undefined,
  trustProxy: env.NODE_ENV === 'production',
}).listen(env.PORT, (error) => {
  // Express 5 passes bind errors (e.g. port in use) here instead of throwing.
  if (error) throw error;
  console.log(`AirAware API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
