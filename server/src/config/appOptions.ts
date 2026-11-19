import type { AppOptions } from '../app.ts';
import { createGeminiGenerator } from '../services/ai/gemini.ts';
import { createSupabaseStore } from '../services/saved/supabaseStore.ts';
import type { Env } from './env.ts';

// The app's wiring from its environment, shared by the local server and the
// Netlify Function. The caller adds hosting-only options (clientDir, the
// client-IP header).
export function appOptionsFromEnv(env: Env): AppOptions {
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
  return {
    trustProxy: env.NODE_ENV === 'production',
    generatePlan,
    aiModel: env.GEMINI_MODEL,
    saved,
  };
}
