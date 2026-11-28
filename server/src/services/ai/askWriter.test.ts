import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateAsk } from './askOutput.ts';
import { createAskWriter } from './askWriter.ts';
import { askInput } from './fixtures.ts';

const ids = new Set(['a.one']);
const now = new Date('2026-11-28T10:00:00Z');
const reply = (over: object = {}) =>
  JSON.stringify({
    scope: 'answered',
    answer: 'Particle levels are above the limit, so keep outdoor time short.',
    topic: 'outdoors',
    cardIds: ['a.one'],
    ...over,
  });

function setup(
  generate: GenerateAsk,
  callsPerDay?: number,
): {
  run: (at?: Date) => ReturnType<ReturnType<typeof createAskWriter>>;
  errors: ReturnType<typeof vi.spyOn>;
} {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const write = createAskWriter({
    generate,
    model: 'claude-test',
    callsPerDay,
  });
  return { run: (at = now) => write(askInput, ids, at), errors };
}

afterEach(() => vi.restoreAllMocks());

describe('createAskWriter', () => {
  it('returns a valid reply with the model name', async () => {
    const generate = vi.fn<GenerateAsk>().mockResolvedValue(reply());
    const { run, errors } = setup(generate);
    const got = await run();
    expect(got?.model).toBe('claude-test');
    expect(got?.output.cardIds).toEqual(['a.one']);
    expect(errors).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid json', 'not json', 'invalid json'],
    ['schema', JSON.stringify({ scope: 'x' }), 'schema'],
    ['length', reply({ answer: 'Too short.' }), 'length'],
    ['ids', reply({ cardIds: ['not.sent'] }), 'ids'],
    [
      'numbers',
      reply({
        answer:
          'Particle levels are near 500 today, so keep outdoor time short.',
      }),
      'numbers',
    ],
    [
      'wording',
      reply({
        answer: 'Outdoor air is safe for a long walk today, so go ahead.',
      }),
      'wording',
    ],
    [
      'verdict',
      reply({
        answer: 'Yes, a short walk outside is fine for most people today.',
      }),
      'verdict',
    ],
  ])('%s fails once, with no retry', async (_name, text, category) => {
    const generate = vi.fn<GenerateAsk>().mockResolvedValue(text);
    const { run, errors } = setup(generate);
    expect(await run()).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls).toEqual([[`Claude ask failed: ${category}`]]);
  });

  it.each([
    ['timeout', 'timeout'],
    ['http 529', 'http 529'],
    ['network', 'network'],
    ['refusal', 'refusal'],
    ['max_tokens', 'max_tokens'],
    ['empty response', 'empty response'],
    ['zq7marker', 'unexpected'],
  ])('a generator throwing "%s" logs %s', async (message, category) => {
    const generate = vi.fn<GenerateAsk>().mockRejectedValue(new Error(message));
    const { run, errors } = setup(generate);
    expect(await run()).toBeNull();
    expect(errors.mock.calls).toEqual([[`Claude ask failed: ${category}`]]);
    expect(JSON.stringify(errors.mock.calls)).not.toContain('zq7marker');
  });

  it('never logs the question or the model text', async () => {
    const generate = vi.fn<GenerateAsk>().mockResolvedValue('zq7marker oops');
    const { run, errors } = setup(generate);
    await run();
    expect(JSON.stringify(errors.mock.calls)).not.toContain('zq7marker');
  });

  it('stops at callsPerDay per UTC day and resumes the next day', async () => {
    const generate = vi.fn<GenerateAsk>().mockResolvedValue(reply());
    const { run, errors } = setup(generate, 1);
    expect(await run()).not.toBeNull();
    expect(await run()).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls).toEqual([['Claude ask failed: daily limit']]);
    expect(await run(new Date('2026-11-29T00:00:01Z'))).not.toBeNull();
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
