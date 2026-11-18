// Opt-in live check against the real Gemini API. Skipped unless
// GEMINI_LIVE=1 and a key is configured, so normal runs spend no quota.
// Prints nothing: no key, prompt or answer reaches the test output.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { input } from './fixtures.ts';
import { createGeminiGenerator } from './gemini.ts';
import { personalize } from './personalize.ts';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const apiKey = process.env.GEMINI_API_KEY;

describe.skipIf(!process.env.GEMINI_LIVE || !apiKey)('Gemini (live)', () => {
  it('Gemini returns a plan that passes every check', async () => {
    const generate = createGeminiGenerator({
      apiKey: apiKey ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
    });
    expect(await personalize(input, generate)).not.toBeNull();
  }, 30_000);
});
