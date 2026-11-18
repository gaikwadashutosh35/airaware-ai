import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadEnv } from './config/env.ts';
import { createGeminiGenerator } from './services/ai/gemini.ts';
import { createSupabaseStore } from './services/saved/supabaseStore.ts';

const env = loadEnv(process.env);
const generatePlan = env.GEMINI_API_KEY
  ? createGeminiGenerator({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    })
  : undefined;
console.log(
  generatePlan
    ? `Gemini: configured (${env.GEMINI_MODEL})`
    : 'Gemini not configured; plans are rules-only.',
);
const saved =
  env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY
    ? createSupabaseStore({
        url: env.SUPABASE_URL,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      })
    : undefined;
console.log(
  saved ? 'Supabase: configured' : 'Supabase not configured; saving is off.',
);
// The built client, when present (production image; in development Vite
// serves the client on its own port).
const clientDir = fileURLToPath(new URL('../../client/dist', import.meta.url));

createApp({
  clientDir: existsSync(clientDir) ? clientDir : undefined,
  trustProxy: env.NODE_ENV === 'production',
  generatePlan,
  aiModel: env.GEMINI_MODEL,
  saved,
}).listen(env.PORT, (error) => {
  // Express 5 passes bind errors (e.g. port in use) here instead of throwing.
  if (error) throw error;
  console.log(`AirAware API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
