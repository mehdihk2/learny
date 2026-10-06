import express, { type Request, type Response } from 'express';
import type { Plan, ProgressLog, UserProfile } from '../src/models/types';
import { generatePlan } from '../src/lib/planGenerator';
import { emptyProgress } from '../src/lib/progress';
import { sessionForTask } from '../src/exercises/taskSession';
import { PRACTICE_SKILLS } from '../src/exercises/types';
import { bearerToken, createSession, createUser, deleteSession, findUserByEmail, requireAuth, verifyPassword } from './auth';
import type { Db } from './db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface UserDataRow {
  profile: string | null;
  plan: string | null;
  progress: string | null;
  updated_at: string;
}

function badRequest(res: Response, error: string) {
  res.status(400).json({ error });
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function createApp(db: Db) {
  const app = express();
  app.disable('x-powered-by');
  // Plans can be large (a 3-year plan is ~2 MB of JSON).
  app.use(express.json({ limit: '10mb' }));

  const auth = requireAuth(db);

  // -------------------------------------------------------------------------
  // Data helpers
  // -------------------------------------------------------------------------

  const loadData = (userId: string) => {
    const row = db.prepare('SELECT profile, plan, progress, updated_at FROM user_data WHERE user_id = ?').get(userId) as UserDataRow | undefined;
    return {
      profile: row?.profile ? (JSON.parse(row.profile) as UserProfile) : null,
      plan: row?.plan ? (JSON.parse(row.plan) as Plan) : null,
      progress: row?.progress ? (JSON.parse(row.progress) as ProgressLog) : null,
      updatedAt: row?.updated_at ?? null,
    };
  };

  const saveField = (userId: string, field: 'profile' | 'plan' | 'progress', value: unknown) => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO user_data (user_id, ${field}, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET ${field} = excluded.${field}, updated_at = excluded.updated_at`,
    ).run(userId, value === null ? null : JSON.stringify(value), now);
    return now;
  };

  // -------------------------------------------------------------------------
  // Health & auth
  // -------------------------------------------------------------------------

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, version: 1 });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body ?? {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return badRequest(res, 'Please enter a valid email address.');
    if (typeof password !== 'string' || password.length < 8) return badRequest(res, 'Password must be at least 8 characters.');
    if (findUserByEmail(db, email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const user = createUser(db, email, password, typeof name === 'string' ? name : undefined);
    res.status(201).json({ token: createSession(db, user.id), user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const found = typeof email === 'string' ? findUserByEmail(db, email) : undefined;
    if (!found || typeof password !== 'string' || !verifyPassword(password, found.password_hash)) {
      res.status(401).json({ error: 'Wrong email or password.' });
      return;
    }
    res.json({ token: createSession(db, found.id), user: { id: found.id, email: found.email, name: found.name } });
  });

  app.post('/api/auth/logout', auth, (req, res) => {
    const token = bearerToken(req);
    if (token) deleteSession(db, token);
    res.status(204).end();
  });

  app.get('/api/me', auth, (req, res) => {
    res.json({ user: req.user });
  });

  // -------------------------------------------------------------------------
  // Profile, plan & progress
  // -------------------------------------------------------------------------

  app.get('/api/data', auth, (req, res) => {
    res.json(loadData(req.user!.id));
  });

  for (const field of ['profile', 'plan', 'progress'] as const) {
    app.put(`/api/data/${field}`, auth, (req: Request, res: Response) => {
      if (!isObject(req.body)) return badRequest(res, `Body must be a ${field} object.`);
      res.json({ updatedAt: saveField(req.user!.id, field, req.body) });
    });
  }

  app.delete('/api/data', auth, (req, res) => {
    db.prepare('DELETE FROM user_data WHERE user_id = ?').run(req.user!.id);
    db.prepare('DELETE FROM exercise_attempts WHERE user_id = ?').run(req.user!.id);
    res.status(204).end();
  });

  /** Generate a plan on the server from a profile and store everything. */
  app.post('/api/plan', auth, (req, res) => {
    const profile = req.body?.profile as UserProfile | undefined;
    if (!isObject(profile)) return badRequest(res, 'Missing profile.');
    let plan: Plan;
    try {
      plan = generatePlan(profile);
    } catch (err) {
      return badRequest(res, (err as Error).message);
    }
    const progress: ProgressLog = {
      ...emptyProgress(plan.id),
      events: [{ at: new Date().toISOString(), type: 'created', detail: `${profile.currentLevel} → ${profile.targetLevel} in ${profile.durationWeeks} weeks` }],
    };
    saveField(req.user!.id, 'profile', profile);
    saveField(req.user!.id, 'plan', plan);
    saveField(req.user!.id, 'progress', progress);
    res.status(201).json({ profile, plan, progress });
  });

  // -------------------------------------------------------------------------
  // Exercises
  // -------------------------------------------------------------------------

  /** The exercise session for one task of the user's plan. */
  app.post('/api/sessions', auth, (req, res) => {
    const { taskId, today } = req.body ?? {};
    if (typeof taskId !== 'string') return badRequest(res, 'Missing taskId.');
    if (typeof today !== 'string' || !DATE_RE.test(today)) return badRequest(res, 'today must be YYYY-MM-DD.');
    const { profile, plan, progress } = loadData(req.user!.id);
    if (!profile || !plan) {
      res.status(404).json({ error: 'No plan yet.' });
      return;
    }
    res.json({ exercises: sessionForTask(plan, profile, progress ?? emptyProgress(plan.id), taskId, today) });
  });

  /** Log exercise results (used for statistics). */
  app.post('/api/attempts', auth, (req, res) => {
    const attempts = req.body?.attempts;
    if (!Array.isArray(attempts) || attempts.length === 0 || attempts.length > 200) return badRequest(res, 'attempts must be a non-empty array.');
    const insert = db.prepare(
      'INSERT INTO exercise_attempts (user_id, exercise_id, task_id, skill, level, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      for (const a of attempts) {
        if (!isObject(a) || typeof a.exerciseId !== 'string' || !PRACTICE_SKILLS.includes(a.skill as never) || typeof a.score !== 'number') {
          throw new Error('Invalid attempt.');
        }
        insert.run(req.user!.id, a.exerciseId, typeof a.taskId === 'string' ? a.taskId : null, a.skill as string, String(a.level ?? ''), Math.min(1, Math.max(0, a.score)), now);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return badRequest(res, (err as Error).message);
    }
    res.status(201).json({ saved: attempts.length });
  });

  /** Per-skill accuracy and recent activity. */
  app.get('/api/stats', auth, (req, res) => {
    const userId = req.user!.id;
    const bySkill = db
      .prepare('SELECT skill, COUNT(*) AS attempts, AVG(score) AS avg FROM exercise_attempts WHERE user_id = ? GROUP BY skill')
      .all(userId) as { skill: string; attempts: number; avg: number }[];
    const since = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
    const byDay = db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS attempts, AVG(score) AS avg
         FROM exercise_attempts WHERE user_id = ? AND created_at >= ? GROUP BY day ORDER BY day`,
      )
      .all(userId, since) as { day: string; attempts: number; avg: number }[];
    res.json({
      skills: Object.fromEntries(PRACTICE_SKILLS.map((s) => {
        const row = bySkill.find((r) => r.skill === s);
        return [s, { attempts: row?.attempts ?? 0, average: row ? Math.round(row.avg * 100) : null }];
      })),
      days: byDay.map((d) => ({ day: d.day, attempts: d.attempts, average: Math.round(d.avg * 100) })),
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
