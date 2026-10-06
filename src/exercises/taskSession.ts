import type { ISODate, Plan, ProgressLog, Task, UserProfile } from '../models/types';
import { exerciseBank } from '../content/exercises';
import { buildSession, type SessionRequest } from './select';
import { isPracticeSkill, type Exercise } from './types';

/** Does this task come with interactive exercises? */
export function taskHasExercises(task: Task, profile: Pick<UserProfile, 'language'>): boolean {
  if (task.kind === 'milestone' || task.role === 'reflection' || task.role === 'exam') return false;
  if (!isPracticeSkill(task.skill)) return false;
  return exerciseBank(profile.language).some((e) => e.skill === task.skill);
}

function locate(plan: Plan, taskId: string) {
  for (const phase of plan.phases)
    for (const week of phase.weeks)
      for (const day of week.days) {
        const task = day.tasks.find((t) => t.id === taskId);
        if (task) return { phase, day, task };
      }
  return null;
}

/** Turn a task of the plan into a session request (null if the task has no exercises). */
export function sessionRequestForTask(
  plan: Plan,
  profile: UserProfile,
  progress: ProgressLog,
  taskId: string,
  today: ISODate,
): SessionRequest | null {
  const found = locate(plan, taskId);
  if (!found || !taskHasExercises(found.task, profile)) return null;
  const { phase, task } = found;
  const skill = task.skill;
  if (!isPracticeSkill(skill)) return null;
  const warmup = task.role === 'warmup' || (task.role === undefined && task.title === 'Daily flashcard warm-up');
  return {
    language: profile.language,
    level: phase.toLevel,
    fromLevel: phase.fromLevel,
    skill,
    minutes: task.minutes,
    mode: warmup ? 'warmup' : task.kind === 'review' ? 'review' : 'practice',
    seed: task.id,
    today,
    history: progress.exerciseScores ?? {},
    srs: progress.srs ?? {},
  };
}

export function sessionForTask(plan: Plan, profile: UserProfile, progress: ProgressLog, taskId: string, today: ISODate): Exercise[] {
  const req = sessionRequestForTask(plan, profile, progress, taskId, today);
  return req ? buildSession(req) : [];
}
