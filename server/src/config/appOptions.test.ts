import { afterEach, describe, expect, it, vi } from 'vitest';
import { appOptionsFromEnv } from './appOptions.ts';
import { loadEnv } from './env.ts';

function quietly(source: Record<string, string>) {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  return { options: appOptionsFromEnv(loadEnv(source)), log };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('appOptionsFromEnv', () => {
  it('turns Gemini and saving off without settings', () => {
    const { options, log } = quietly({});

    expect(options.generatePlan).toBeUndefined();
    expect(options.saved).toBeUndefined();
    expect(options.trustProxy).toBe(false);
    expect(log).toHaveBeenCalledWith(
      'Gemini not configured; plans are rules-only.',
    );
    expect(log).toHaveBeenCalledWith('Supabase not configured; saving is off.');
  });

  it('builds the Supabase store from the public settings', () => {
    const { options, log } = quietly({
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
    });

    expect(options.saved?.origin).toBe('https://abc.supabase.co');
    expect(log).toHaveBeenCalledWith('Supabase: configured');
  });

  it('builds the Gemini generator when a key is set', () => {
    const { options, log } = quietly({ GEMINI_API_KEY: 'k' });

    expect(typeof options.generatePlan).toBe('function');
    expect(options.aiModel).toBe('gemini-3.8-flash');
    expect(log).toHaveBeenCalledWith('Gemini: configured (gemini-3.8-flash)');
  });

  it('trusts the proxy only in production', () => {
    expect(quietly({ NODE_ENV: 'production' }).options.trustProxy).toBe(true);
  });
});
