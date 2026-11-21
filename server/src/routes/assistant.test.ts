import { format } from 'node:util';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import type { GeneratePlan } from '../services/ai/personalize.ts';
import type { SavedStore } from '../services/saved/store.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const START = Date.UTC(2026, 10, 18, 10) / 1000;
const MARKER = 'zq7marker';
const PATH = '/api/v1/assistant/answer';

function openMeteoBody(startSeconds: number, pm25: number, pm10: number) {
  const time = Array.from({ length: 48 }, (_, i) => startSeconds + i * 3600);
  const unit = 'μg/m³';
  return {
    hourly_units: { time: 'unixtime', pm2_5: unit, pm10: unit },
    hourly: { time, pm2_5: time.map(() => pm25), pm10: time.map(() => pm10) },
  };
}

const place = { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 };
const householdContext = { routine: { outdoorExercise: true } };

let fetchSpy: ReturnType<typeof vi.spyOn>;
let generate: ReturnType<typeof vi.fn<GeneratePlan>>;

// A valid answer for whatever the writer is asked.
function answerFor(input: Parameters<GeneratePlan>[0]): string {
  const actions = input.candidates.filter((c) => c.section !== 'notice');
  return JSON.stringify({
    summary: 'Plan your day around the forecast.',
    featured: actions.slice(0, 1).map((c) => ({
      id: c.id,
      period: 'morning',
      forYou: 'This fits your day.',
    })),
  });
}
const aiApp = () =>
  createApp({ generatePlan: generate, aiModel: 'gemini-test' });
const ask = (app: ReturnType<typeof createApp>, payload: object) =>
  request(app).post(PATH).send(payload);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() =>
      Promise.resolve(Response.json(openMeteoBody(START, 80, 50))),
    );
  generate = vi.fn<GeneratePlan>(async (input) => answerFor(input));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('POST /api/v1/assistant/answer', () => {
  it('answers a question, without the question', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await ask(aiApp(), {
      question: 'Can I go for a morning walk today?',
      place,
      householdContext,
    });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual([
      'air',
      'cards',
      'followUps',
      'forecast',
      'generatedBy',
      'notices',
      'safetyNote',
      'sources',
      'summary',
      'topic',
    ]);
    expect(res.body.data.topic).toBe('outdoors');
    expect(res.text).not.toContain('morning walk');
  });

  it('answers a topic', async () => {
    const res = await ask(aiApp(), { topic: 'family', place });

    expect(res.status).toBe(200);
    expect(res.body.data.topic).toBe('family');
    expect(res.body.data.cards.length).toBeGreaterThan(0);
  });

  it.each([
    ['an empty question', { question: '', place }],
    ['a blank question', { question: '   ', place }],
    ['a 201-character question', { question: 'a'.repeat(201), place }],
    [
      'both a question and a topic',
      { question: 'walk', topic: 'outdoors', place },
    ],
    ['neither a question nor a topic', { place }],
    ['an extra key', { question: 'walk', place, extra: true }],
    ['an unknown topic', { topic: 'weather', place }],
    [
      '3-decimal coordinates',
      { question: 'walk', place: { ...place, latitude: 18.521 } },
    ],
    [
      'a label with a control character',
      { question: 'walk', place: { ...place, label: 'Pune\u0007' } },
    ],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, payload) => {
    const res = await ask(aiApp(), payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a body over 4 KB with 413', async () => {
    const res = await ask(aiApp(), { question: 'a'.repeat(5000), place });
    expect(res.status).toBe(413);
  });

  // Review Focus 1: the typed question never leaves the route.
  it('the question reaches no log, response, outbound request or writer', async () => {
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const realStringify = JSON.stringify;
    // [name, expected status, run]: the status proves each path was taken.
    const scenarios: Array<
      [string, number, () => PromiseLike<request.Response>]
    > = [
      [
        'success',
        200,
        () =>
          ask(aiApp(), { question: `walk ${MARKER}`, place, householdContext }),
      ],
      [
        'writer failure',
        200,
        () => {
          generate.mockRejectedValueOnce(new Error('http 500'));
          return ask(aiApp(), { question: `walk ${MARKER}`, place });
        },
      ],
      [
        'forecast failure',
        200,
        () => {
          fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
          return ask(aiApp(), { question: `walk ${MARKER}`, place });
        },
      ],
      [
        'malformed JSON',
        400,
        () =>
          request(aiApp())
            .post(PATH)
            .set('Content-Type', 'application/json')
            .send(`{"question": "${MARKER}`),
      ],
      [
        'oversize',
        413,
        () =>
          ask(aiApp(), { question: `${MARKER} ${'a'.repeat(5000)}`, place }),
      ],
      [
        'too long',
        400,
        () => ask(aiApp(), { question: `${MARKER}${'a'.repeat(200)}`, place }),
      ],
      [
        'medical',
        200,
        () => ask(aiApp(), { question: `asthma ${MARKER}`, place }),
      ],
      [
        'out of scope',
        200,
        () => ask(aiApp(), { question: `capital of India ${MARKER}`, place }),
      ],
      [
        'a forced 500',
        500,
        () => {
          // The writer's cache key throws, so the request ends in a 500.
          vi.spyOn(JSON, 'stringify').mockImplementation((value, ...rest) => {
            if (value && typeof value === 'object' && 'candidates' in value) {
              throw new Error('boom');
            }
            return realStringify(value, ...(rest as []));
          });
          return ask(aiApp(), { question: `walk ${MARKER}`, place });
        },
      ],
    ];

    for (const [name, status, run] of scenarios) {
      const res = await run();
      expect(res.status, name).toBe(status);
      expect(res.text, `${name}: response`).not.toContain(MARKER);
    }
    vi.mocked(JSON.stringify).mockRestore();
    for (const spy of consoles) {
      for (const call of spy.mock.calls) {
        // What the console would actually print, objects and stacks included.
        expect(format(...call)).not.toContain(MARKER);
      }
    }
    for (const [url, init] of fetchSpy.mock.calls) {
      expect(String(url)).not.toContain(MARKER);
      expect(String(init?.body ?? '')).not.toContain(MARKER);
    }
    expect(realStringify(generate.mock.calls)).not.toContain(MARKER);
  });

  it('never touches saved data', async () => {
    const touched = vi.fn();
    // Any method called on the store is recorded; only its origin is real.
    const saved = new Proxy(
      { origin: 'https://example.supabase.co' },
      {
        get: (target, name) =>
          name === 'origin'
            ? target.origin
            : (...args: unknown[]) => {
                touched(name, args);
                return Promise.resolve(null);
              },
      },
    ) as unknown as SavedStore;
    const app = createApp({ saved });

    const res = await ask(app, { question: 'walk', place, householdContext });

    expect(res.status).toBe(200);

    expect(touched).not.toHaveBeenCalled();
  });

  it('shares the 10-a-minute limit with daily plans, both ways', async () => {
    const plans = aiApp();
    for (let i = 0; i < 10; i++) {
      await request(plans)
        .post('/api/v1/recommendations/daily-plan')
        .send({ place });
    }
    expect((await ask(plans, { topic: 'indoor', place })).status).toBe(429);

    const asks = aiApp();
    for (let i = 0; i < 10; i++) await ask(asks, { topic: 'indoor', place });
    expect(
      (
        await request(asks)
          .post('/api/v1/recommendations/daily-plan')
          .send({ place })
      ).status,
    ).toBe(429);
    // The guides call no AI and stay outside that limit.
    expect(
      (await request(asks).get('/api/v1/recommendations/guides?topic=home'))
        .status,
    ).toBe(200);
  });
});
