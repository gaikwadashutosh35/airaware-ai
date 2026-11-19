import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import type { PlanWriterInput } from '../services/ai/planOutput.ts';
import type { GeneratePlan } from '../services/ai/personalize.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const START = Date.UTC(2026, 10, 18, 10) / 1000;
const SUMMARY =
  'Particle levels are forecast above the national limit, so plan indoor exercise today.';
const FOR_YOU = 'Shorter outdoor time helps your household today.';

function openMeteoBody(startSeconds: number, pm25: number, pm10: number) {
  const time = Array.from({ length: 48 }, (_, i) => startSeconds + i * 3600);
  const unit = 'μg/m³';
  return {
    hourly_units: { time: 'unixtime', pm2_5: unit, pm10: unit },
    hourly: { time, pm2_5: time.map(() => pm25), pm10: time.map(() => pm10) },
  };
}

// A valid answer for whatever candidates the route sends.
function answerFor(input: PlanWriterInput): string {
  const ids = input.candidates
    .filter((c) => c.section !== 'notice' && c.priority === 'high')
    .map((c) => c.id);
  return JSON.stringify({
    summary: SUMMARY,
    featured: ids.map((id) => ({ id, period: 'daytime', forYou: FOR_YOU })),
  });
}

const body = {
  place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
  householdContext: { routine: { outdoorExercise: true } },
};

let fetchSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let generate: ReturnType<typeof vi.fn<GeneratePlan>>;

function post(app: ReturnType<typeof createApp>, payload: object) {
  return request(app).post('/api/v1/recommendations/daily-plan').send(payload);
}
function aiApp() {
  return createApp({ generatePlan: generate, aiModel: 'gemini-test' });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() =>
      Promise.resolve(Response.json(openMeteoBody(START, 80, 50))),
    );
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  generate = vi.fn<GeneratePlan>(async (input) => answerFor(input));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('POST /api/v1/recommendations/daily-plan', () => {
  it('returns an AI plan', async () => {
    const res = await post(aiApp(), body);
    expect(res.status).toBe(200);
    const plan = res.body.data;
    expect(plan.generatedBy).toBe('ai');
    expect(plan.model).toBe('gemini-test');
    expect(plan.promptVersion).toBe('daily-plan-v1');
    expect(plan.summary).toBe(SUMMARY);
    expect(plan.air.level).toBe('elevated');
    expect(plan.notices[0].id).toBe('air.elevated');
    expect(plan.featured[0].forYou).toBe(FOR_YOU);
    expect(plan.place).toEqual({ label: 'Pune, Maharashtra' });
  });

  it('falls back to rules when Gemini fails', async () => {
    generate.mockRejectedValue(new Error('timeout'));
    const res = await post(aiApp(), body);
    expect(res.status).toBe(200);
    expect(res.body.data.generatedBy).toBe('rules');
    expect(res.body.data.summary).toBeNull();
  });

  it("falls back when Gemini's answer is rejected", async () => {
    generate.mockImplementation(async (input) =>
      answerFor(input).replace('so plan', 'so it is safe to plan'),
    );
    const res = await post(aiApp(), body);
    expect(res.status).toBe(200);
    expect(res.body.data.generatedBy).toBe('rules');
  });

  it('rules-only when Gemini is not configured', async () => {
    const res = await post(createApp(), body);
    expect(res.status).toBe(200);
    expect(res.body.data.generatedBy).toBe('rules');
    expect(res.body.data.model).toBeNull();
  });

  it('a forecast failure still returns a plan', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    const res = await post(aiApp(), body);
    expect(res.status).toBe(200);
    expect(res.body.data.air.level).toBe('unknown');
    expect(res.body.data.forecast).toBeNull();
    expect(res.body.data.notices[0].id).toBe('data.unavailable');
  });

  it('Gemini never sees the place or coordinates', async () => {
    await post(aiApp(), body);
    const sent = JSON.stringify(generate.mock.calls[0]![0]);
    for (const secret of ['Pune', '18.52', '73.86', 'outdoorExercise']) {
      expect(sent).not.toContain(secret);
    }
  });

  it('markup in the label is echoed and never sent', async () => {
    const label = '<b>Pune</b>';
    const res = await post(aiApp(), {
      ...body,
      place: { ...body.place, label },
    });
    expect(res.body.data.place.label).toBe(label);
    expect(JSON.stringify(generate.mock.calls[0]![0])).not.toContain('<b>');
  });

  it('validation', async () => {
    const app = createApp();
    const invalid = [
      { ...body, extra: true },
      { ...body, place: { ...body.place, latitude: 18.523 } },
      { ...body, place: { ...body.place, label: '  ' } },
      // Phase 8 audit: a NUL got through to Postgres (and a planner run).
      { ...body, place: { ...body.place, label: 'Pune\u0000' } },
      { ...body, place: { ...body.place, label: 'Pune\u001b[31m' } },
      { ...body, householdContext: { diagnosis: 'x' } },
    ];
    for (const payload of invalid) {
      const res = await post(app, payload);
      expect(res.status, JSON.stringify(payload)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    errorSpy.mockClear();
    const malformed = await request(app)
      .post('/api/v1/recommendations/daily-plan')
      .set('content-type', 'application/json')
      .send('{"secret');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Malformed JSON body.',
    });
    expect(errorSpy).not.toHaveBeenCalled();

    const large = await post(app, {
      ...body,
      place: { ...body.place, label: 'a'.repeat(5000) },
    });
    expect(large.status).toBe(413);
    expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('plan requests are limited to 10 a minute', async () => {
    const app = createApp();
    for (let i = 0; i < 10; i++) {
      expect((await post(app, body)).status).toBe(200);
    }
    const res = await post(app, body);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('identical requests reuse the plan', async () => {
    const app = aiApp();
    await post(app, body);
    const res = await post(app, body);
    expect(res.body.data.generatedBy).toBe('ai');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('a fallback plan is not cached', async () => {
    generate.mockRejectedValueOnce(new Error('timeout'));
    const app = aiApp();
    expect((await post(app, body)).body.data.generatedBy).toBe('rules');
    expect((await post(app, body)).body.data.generatedBy).toBe('ai');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('a plan without a forecast is not cached', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
    const app = createApp();
    expect((await post(app, body)).body.data.air.level).toBe('unknown');
    expect((await post(app, body)).body.data.air.level).toBe('elevated');
  });

  it('forecast and plan share one cache', async () => {
    const app = aiApp();
    await request(app).get(
      '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
    );
    const res = await post(app, body);
    expect(res.body.data.air.level).toBe('elevated');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
