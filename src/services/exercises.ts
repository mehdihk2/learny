import type { ISODate, Plan, ProgressLog, UserProfile } from '../models/types';
import { findExercise } from '../content/exercises';
import { sessionForTask } from '../exercises/taskSession';
import { PRACTICE_SKILLS, type Exercise, type PracticeSkill } from '../exercises/types';
import type { PracticeResults } from '../exercises/practice';
import { api } from './api';

/**
 * Exercise data access. With an account the backend builds sessions and
 * keeps an attempt log; without one everything is computed in the browser
 * (same pure functions, so results are identical).
 */

export interface SessionInput {
  online: boolean;
  plan: Plan;
  profile: UserProfile;
  progress: ProgressLog;
  taskId: string;
  today: ISODate;
}

export async function loadSession(input: SessionInput): Promise<Exercise[]> {
  if (input.online) {
    try {
      const r = await api<{ exercises: Exercise[] }>('POST', '/sessions', { taskId: input.taskId, today: input.today });
      if (r.exercises.length) return r.exercises;
    } catch {
      // fall back to local generation
    }
  }
  return sessionForTask(input.plan, input.profile, input.progress, input.taskId, input.today);
}

export async function logAttempts(online: boolean, taskId: string, exercises: Exercise[], results: PracticeResults): Promise<void> {
  if (!online) return;
  const attempts = exercises
    .filter((e) => e.id in results.scores)
    .map((e) => ({ exerciseId: e.id, taskId, skill: e.skill, level: e.level, score: results.scores[e.id] }));
  if (attempts.length) await api('POST', '/attempts', { attempts }).catch(() => undefined);
}

export interface PracticeStats {
  skills: Record<PracticeSkill, { attempts: number; average: number | null }>;
  source: 'server' | 'local';
}

function skillOf(language: UserProfile['language'], id: string): PracticeSkill | undefined {
  const [base, derived] = id.split('~');
  if (derived === 'hear') return 'listening';
  if (derived === 'meaning' || derived === 'match') return 'vocabulary';
  return findExercise(language, base)?.skill;
}

/** Stats from the server's attempt log, or estimated from best scores when offline. */
export async function loadStats(online: boolean, profile: UserProfile, progress: ProgressLog): Promise<PracticeStats> {
  if (online) {
    try {
      const r = await api<{ skills: PracticeStats['skills'] }>('GET', '/stats');
      return { skills: r.skills, source: 'server' };
    } catch {
      // fall through
    }
  }
  const acc = Object.fromEntries(PRACTICE_SKILLS.map((s) => [s, { n: 0, sum: 0 }])) as Record<PracticeSkill, { n: number; sum: number }>;
  for (const [id, score] of Object.entries(progress.exerciseScores ?? {})) {
    const skill = skillOf(profile.language, id);
    if (skill) {
      acc[skill].n++;
      acc[skill].sum += score;
    }
  }
  return {
    source: 'local',
    skills: Object.fromEntries(
      PRACTICE_SKILLS.map((s) => [s, { attempts: acc[s].n, average: acc[s].n ? Math.round((acc[s].sum / acc[s].n) * 100) : null }]),
    ) as PracticeStats['skills'],
  };
}
