import { createApp } from './app.ts';
import { loadEnv } from './config/env.ts';

const env = loadEnv(process.env);

createApp().listen(env.PORT, (error) => {
  // Express 5 passes bind errors (e.g. port in use) here instead of throwing.
  if (error) throw error;
  console.log(`AirAware API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
