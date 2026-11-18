import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

describe('loadEnv', () => {
  it('applies defaults when nothing is set', () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 8080,
      GEMINI_MODEL: 'gemini-3.8-flash',
      SUPABASE_URL: undefined,
      SUPABASE_PUBLISHABLE_KEY: undefined,
    });
  });

  it('parses PORT as a number', () => {
    expect(loadEnv({ PORT: '3000' }).PORT).toBe(3000);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => loadEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('an empty key counts as unset', () => {
    expect(loadEnv({ GEMINI_API_KEY: '' }).GEMINI_API_KEY).toBeUndefined();
  });

  it('a key is kept', () => {
    expect(loadEnv({ GEMINI_API_KEY: 'abc123' }).GEMINI_API_KEY).toBe('abc123');
  });

  it('the model defaults to gemini-3.8-flash', () => {
    expect(loadEnv({}).GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(loadEnv({ GEMINI_MODEL: 'gemini-test' }).GEMINI_MODEL).toBe(
      'gemini-test',
    );
  });

  // Final review I5: SETUP.md lists `GEMINI_MODEL=` with no value.
  it('an empty model counts as unset', () => {
    expect(loadEnv({ GEMINI_MODEL: '' }).GEMINI_MODEL).toBe('gemini-3.8-flash');
  });

  it('an unsafe model name is rejected', () => {
    expect(() => loadEnv({ GEMINI_MODEL: 'models/../x' })).toThrow(
      /GEMINI_MODEL/,
    );
  });

  it('empty Supabase values count as unset', () => {
    const env = loadEnv({ SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: ' ' });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
  });

  it('Supabase values are kept', () => {
    const env = loadEnv({
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
    });
    expect(env.SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(env.SUPABASE_PUBLISHABLE_KEY).toBe('sb_publishable_x');
  });

  it('a non-https Supabase URL is refused', () => {
    expect(() => loadEnv({ SUPABASE_URL: 'http://abc.supabase.co' })).toThrow(
      /SUPABASE_URL/,
    );
  });

  // Review Focus 5: the secret key pasted in the wrong place.
  it('a secret key is refused as the publishable key', () => {
    expect(() => loadEnv({ SUPABASE_PUBLISHABLE_KEY: 'sb_secret_x' })).toThrow(
      /SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});
