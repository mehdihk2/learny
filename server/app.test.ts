import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeProfile } from '../src/test/fixtures';
import type { Plan, ProgressLog } from '../src/models/types';
import { allTasks } from '../src/lib/planGenerator';
import { createApp } from './app';
import { openDb } from './db';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(openDb(':memory:'));
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function register(email = `u${Math.random().toString(36).slice(2)}@test.dev`) {
  const r = await call('POST', '/api/auth/register', { email, password: 'correct horse', name: 'Sam' });
  return { token: r.body.token as string, email };
}

describe('auth', () => {
  it('reports health', async () => {
    expect((await call('GET', '/api/health')).body).toEqual({ ok: true, version: 1 });
  });

  it('registers, logs in and out', async () => {
    const { token, email } = await register();
    expect(token).toBeTruthy();
    expect((await call('GET', '/api/me', undefined, token)).body.user.email).toBe(email);

    const login = await call('POST', '/api/auth/login', { email: email.toUpperCase(), password: 'correct horse' });
    expect(login.status).toBe(200);

    expect((await call('POST', '/api/auth/logout', undefined, token)).status).toBe(204);
    expect((await call('GET', '/api/me', undefined, token)).status).toBe(401);
  });

  it('rejects bad credentials, duplicates and weak passwords', async () => {
    const { email } = await register();
    expect((await call('POST', '/api/auth/login', { email, password: 'wrong password' })).status).toBe(401);
    expect((await call('POST', '/api/auth/register', { email, password: 'another one' })).status).toBe(409);
    expect((await call('POST', '/api/auth/register', { email: 'x@y.z', password: 'short' })).status).toBe(400);
    expect((await call('POST', '/api/auth/register', { email: 'not-an-email', password: 'long enough' })).status).toBe(400);
  });

  it('protects data routes', async () => {
    expect((await call('GET', '/api/data')).status).toBe(401);
    expect((await call('GET', '/api/data', undefined, 'forged')).status).toBe(401);
  });
});

describe('data', () => {
  it('generates a plan on the server and stores it', async () => {
    const { token } = await register();
    const profile = makeProfile({ durationWeeks: 4 });
    const created = await call('POST', '/api/plan', { profile }, token);
    expect(created.status).toBe(201);
    expect(created.body.plan.phases).toHaveLength(1);

    const data = await call('GET', '/api/data', undefined, token);
    expect(data.body.profile).toEqual(profile);
    expect(data.body.plan.id).toBe(created.body.plan.id);
    expect(data.body.progress.completedTasks).toEqual({});
  });

  it('rejects an invalid profile', async () => {
    const { token } = await register();
    const r = await call('POST', '/api/plan', { profile: makeProfile({ currentLevel: 'B2', targetLevel: 'A2' }) }, token);
    expect(r.status).toBe(400);
  });

  it('saves progress and keeps users isolated', async () => {
    const a = await register();
    const b = await register();
    await call('POST', '/api/plan', { profile: makeProfile({ durationWeeks: 2 }) }, a.token);
    const progress: ProgressLog = { planId: 'plan-user-1', completedTasks: { x: '2026-01-05' }, milestoneResults: [], events: [] };
    expect((await call('PUT', '/api/data/progress', progress, a.token)).status).toBe(200);
    expect((await call('GET', '/api/data', undefined, a.token)).body.progress).toEqual(progress);
    expect((await call('GET', '/api/data', undefined, b.token)).body.progress).toBeNull();
    expect((await call('PUT', '/api/data/progress', [1, 2], a.token)).status).toBe(400);
  });

  it('deletes all data', async () => {
    const { token } = await register();
    await call('POST', '/api/plan', { profile: makeProfile({ durationWeeks: 2 }) }, token);
    expect((await call('DELETE', '/api/data', undefined, token)).status).toBe(204);
    expect((await call('GET', '/api/data', undefined, token)).body.plan).toBeNull();
  });
});

describe('exercises', () => {
  it('builds a session for a practice task, deterministically', async () => {
    const { token } = await register();
    const created = await call('POST', '/api/plan', { profile: makeProfile({ language: 'es', durationWeeks: 4, dailyMinutes: 60 }) }, token);
    const plan = created.body.plan as Plan;
    const task = allTasks(plan).find((t) => t.skill === 'grammar')!;
    const s1 = await call('POST', '/api/sessions', { taskId: task.id, today: '2026-01-05' }, token);
    expect(s1.status).toBe(200);
    expect(s1.body.exercises.length).toBeGreaterThan(0);
    expect(s1.body.exercises.every((e: { skill: string }) => e.skill === 'grammar')).toBe(true);
    const s2 = await call('POST', '/api/sessions', { taskId: task.id, today: '2026-01-05' }, token);
    expect(s2.body).toEqual(s1.body);
  });

  it('returns no exercises for reading/writing tasks and validates input', async () => {
    const { token } = await register();
    const created = await call('POST', '/api/plan', { profile: makeProfile({ durationWeeks: 4, dailyMinutes: 60 }) }, token);
    const reading = allTasks(created.body.plan as Plan).find((t) => t.skill === 'reading')!;
    expect((await call('POST', '/api/sessions', { taskId: reading.id, today: '2026-01-05' }, token)).body.exercises).toEqual([]);
    expect((await call('POST', '/api/sessions', { taskId: reading.id, today: 'yesterday' }, token)).status).toBe(400);
  });

  it('logs attempts and reports stats per skill', async () => {
    const { token } = await register();
    const attempts = [
      { exerciseId: 'es-a1-g-1', skill: 'grammar', level: 'A1', score: 1 },
      { exerciseId: 'es-a1-g-2', skill: 'grammar', level: 'A1', score: 0.5 },
      { exerciseId: 'es-a1-r-1', skill: 'speaking', level: 'A1', score: 0.8 },
    ];
    expect((await call('POST', '/api/attempts', { attempts }, token)).status).toBe(201);
    const stats = await call('GET', '/api/stats', undefined, token);
    expect(stats.body.skills.grammar).toEqual({ attempts: 2, average: 75 });
    expect(stats.body.skills.speaking).toEqual({ attempts: 1, average: 80 });
    expect(stats.body.skills.listening).toEqual({ attempts: 0, average: null });
    expect(stats.body.days).toHaveLength(1);
    expect((await call('POST', '/api/attempts', { attempts: [{ exerciseId: 'x', skill: 'cooking', score: 1 }] }, token)).status).toBe(400);
  });
});
