import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { personalize } from './personalize.ts';
import { input, valid } from './fixtures.ts';

let errorSpy: ReturnType<typeof vi.spyOn>;
const logged: unknown[][] = [];

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  logged.push(...errorSpy.mock.calls);
  errorSpy.mockRestore();
});

describe('personalize', () => {
  it('returns a valid answer', async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify(valid()));
    expect(await personalize(input, generate)).toEqual(valid());
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('retries once after invalid JSON', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(JSON.stringify(valid()));
    expect(await personalize(input, generate)).toEqual(valid());
    expect(generate).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('Gemini plan failed: invalid json');
  });

  it('fenced JSON is invalid', async () => {
    const generate = vi
      .fn()
      .mockResolvedValue('```json\n' + JSON.stringify(valid()) + '\n```');
    expect(await personalize(input, generate)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('gives up after two schema failures', async () => {
    const generate = vi.fn().mockResolvedValue('{"summary":1}');
    expect(await personalize(input, generate)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('Gemini plan failed: schema');
  });

  it('does not retry a content failure', async () => {
    const unsafe = { ...valid(), summary: `${valid().summary} It is safe.` };
    const generate = vi.fn().mockResolvedValue(JSON.stringify(unsafe));
    expect(await personalize(input, generate)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Gemini plan failed: wording');
  });

  it('does not retry a transport failure', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('timeout'));
    expect(await personalize(input, generate)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Gemini plan failed: timeout');
  });

  it("never logs the model's text", () => {
    expect(logged.length).toBeGreaterThan(0);
    for (const call of logged) {
      expect(call.join(' ')).not.toContain(valid().summary);
    }
  });
});
