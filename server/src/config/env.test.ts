import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

describe('loadEnv', () => {
  it('applies defaults when nothing is set', () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 8080,
      GEMINI_MODEL: 'gemini-3.8-flash',
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

  it('an unsafe model name is rejected', () => {
    expect(() => loadEnv({ GEMINI_MODEL: 'models/../x' })).toThrow(
      /GEMINI_MODEL/,
    );
  });
});
