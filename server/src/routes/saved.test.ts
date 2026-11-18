import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import { createFakeStore } from '../test-fixtures/fakeStore.ts';

const NOW = new Date('2026-11-18T10:30:00.000Z');
const START = Date.UTC(2026, 10, 18, 10) / 1000;

function openMeteoBody(startSeconds: number) {
  const time = Array.from({ length: 48 }, (_, i) => startSeconds + i * 3600);
  const unit = 'μg/m³';
  return {
    hourly_units: { time: 'unixtime', pm2_5: unit, pm10: unit },
    hourly: { time, pm2_5: time.map(() => 80), pm10: time.map(() => 50) },
  };
}

const planBody = {
  place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
  householdContext: { routine: { outdoorExercise: true } },
};

let fake: ReturnType<typeof createFakeStore>;
let errorSpy: ReturnType<typeof vi.spyOn>;

const app = () => createApp({ saved: fake.store });
const as = (token: string) => `Bearer ${token}`;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(Response.json(openMeteoBody(START))),
  );
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  fake = createFakeStore();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saved preferences', () => {
  it('preferences round-trip', async () => {
    const server = app();
    const context = { routine: { outdoorExercise: true } };
    const put = await request(server)
      .put('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'))
      .send(context);
    expect(put.status).toBe(200);
    const mine = await request(server)
      .get('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'));
    expect(mine.body.data.context).toEqual(context);
    expect(new Date(mine.body.data.updatedAt).toISOString()).toBe(
      mine.body.data.updatedAt,
    );
    const theirs = await request(server)
      .get('/api/v1/profile/preferences')
      .set('Authorization', as('token-b'));
    expect(theirs.status).toBe(200);
    expect(theirs.body).toEqual({ data: null });
  });

  // Review Focus 4.
  it('a user_id in the body is rejected', async () => {
    const res = await request(app())
      .put('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'))
      .send({ user_id: 'user-b' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(fake.writes).toEqual([]);
  });

  it('a stored context that fails the schema reads back as null', async () => {
    fake.seedPreferences('user-a', { diagnosis: 'x' });
    const res = await request(app())
      .get('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'));
    expect(res.body).toEqual({ data: null });
  });
});

describe('saved plans', () => {
  it('saving a plan saves the server-built plan', async () => {
    const server = app();
    const shown = await request(server)
      .post('/api/v1/recommendations/daily-plan')
      .send(planBody);
    const saved = await request(server)
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    expect(saved.status).toBe(201);
    expect(saved.body.data.plan).toEqual(shown.body.data);
    const list = await request(server)
      .get('/api/v1/plans')
      .set('Authorization', as('token-a'));
    expect(list.body.data).toEqual([
      {
        id: saved.body.data.id,
        savedAt: saved.body.data.savedAt,
        placeLabel: 'Pune, Maharashtra',
      },
    ]);
    const one = await request(server)
      .get(`/api/v1/plans/${saved.body.data.id}`)
      .set('Authorization', as('token-a'));
    expect(one.body.data).toEqual(saved.body.data);
  });

  // Review Focus 3.
  it("another user's plan and a missing plan get the same 404", async () => {
    const server = app();
    const saved = await request(server)
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    const id = saved.body.data.id as string;
    const bodies = [];
    for (const target of [id, randomUUID()]) {
      for (const method of ['get', 'delete'] as const) {
        const res = await request(server)
          [method](`/api/v1/plans/${target}`)
          .set('Authorization', as('token-b'));
        expect(res.status).toBe(404);
        bodies.push(res.body);
      }
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    expect(bodies[0]).toEqual({
      error: { code: 'NOT_FOUND', message: 'Saved plan not found.' },
    });
    const mine = await request(server)
      .get(`/api/v1/plans/${id}`)
      .set('Authorization', as('token-a'));
    expect(mine.status).toBe(200);
  });

  it('a non-uuid id is 400', async () => {
    const res = await request(app())
      .get('/api/v1/plans/not-a-uuid')
      .set('Authorization', as('token-a'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('the 21st plan is 409', async () => {
    fake.seedPlans('user-a', 20);
    const res = await request(app())
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'LIMIT_REACHED',
        message:
          'You can keep up to 20 saved plans. Delete one to save another.',
      },
    });
  });

  it('deleting a plan removes it', async () => {
    const server = app();
    const saved = await request(server)
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    const del = await request(server)
      .delete(`/api/v1/plans/${saved.body.data.id}`)
      .set('Authorization', as('token-a'));
    expect(del.status).toBe(204);
    const list = await request(server)
      .get('/api/v1/plans')
      .set('Authorization', as('token-a'));
    expect(list.body.data).toEqual([]);
  });
});

describe('account and failures', () => {
  it('deleting the account removes everything', async () => {
    const server = app();
    await request(server)
      .put('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'))
      .send({ home: { airPurifier: true } });
    await request(server)
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    const del = await request(server)
      .delete('/api/v1/account')
      .set('Authorization', as('token-a'));
    expect(del.status).toBe(204);
    const list = await request(server)
      .get('/api/v1/plans')
      .set('Authorization', as('token-a'));
    expect(list.body.data).toEqual([]);
    const prefs = await request(server)
      .get('/api/v1/profile/preferences')
      .set('Authorization', as('token-a'));
    expect(prefs.body).toEqual({ data: null });
  });

  it('saving off is 503 everywhere', async () => {
    const server = createApp({});
    const id = randomUUID();
    const calls = [
      request(server).get('/api/v1/profile/preferences'),
      request(server).put('/api/v1/profile/preferences').send({}),
      request(server).get('/api/v1/plans'),
      request(server).get(`/api/v1/plans/${id}`),
      request(server).post('/api/v1/plans').send(planBody),
      request(server).delete(`/api/v1/plans/${id}`),
      request(server).delete('/api/v1/account'),
    ];
    for (const call of calls) {
      const res = await call.set('Authorization', as('token-a'));
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SAVE_UNAVAILABLE');
    }
  });

  it('a store failure is 503 and logs no body', async () => {
    const server = app();
    fake.failNext();
    const res = await request(server)
      .post('/api/v1/plans')
      .set('Authorization', as('token-a'))
      .send(planBody);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SAVE_UNAVAILABLE');
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('Pune');
    expect(logged).not.toContain('token-a');
  });

  it('no token is 401 before any store call', async () => {
    const res = await request(app()).get('/api/v1/plans');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(fake.writes).toEqual([]);
  });
});
