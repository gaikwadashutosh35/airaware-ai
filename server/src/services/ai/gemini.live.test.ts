// Opt-in live check against the real Gemini API. Skipped unless
// GEMINI_LIVE=1 and a key is configured, so normal runs spend no quota.
// Prints nothing: no key, prompt or answer reaches the test output.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env.ts';
import { input } from './fixtures.ts';
import { createGeminiGenerator } from './gemini.ts';
import { personalize } from './personalize.ts';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
// Same rules as the server: a blank key is unset, a blank model is the default.
const env = loadEnv(process.env);

describe.skipIf(!process.env.GEMINI_LIVE || !env.GEMINI_API_KEY)(
  'Gemini (live)',
  () => {
    it('Gemini returns a plan that passes every check', async () => {
      const generate = createGeminiGenerator({
        apiKey: env.GEMINI_API_KEY ?? '',
        model: env.GEMINI_MODEL,
      });
      expect(await personalize(input, generate)).not.toBeNull();
    }, 30_000);
  },
);
