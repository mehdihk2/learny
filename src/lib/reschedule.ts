import type { Day, ISODate, Plan, ProgressLog, Task } from '../models/types';
import { addDays } from './dates';
import { allDays } from './planGenerator';
import { isDayComplete, isTaskDone, missedDays } from './progress';

/**
 * Two strategies for catching up after missed days:
 *
 *  - extend:        push every unfinished day forward so the first missed day
 *                   becomes today. The plan ends later by the number of missed days.
 *  - redistribute:  keep the end date, and spread the unfinished tasks of the
 *                   missed days over the remaining days of the plan.
 */
export type RescheduleStrategy = 'extend' | 'redistribute';

export interface ReschedulePreview {
  missedDays: number;
  missedTasks: number;
  missedMinutes: number;
  /** End date if the plan is extended. */
  extendedEndDate: ISODate;
  /** Extra minutes per remaining day if tasks are redistributed. */
  extraMinutesPerDay: number;
  remainingDays: number;
}

function clonePlan(plan: Plan): Plan {
  return structuredClone(plan);
}

function maxDate(days: Day[]): ISODate {
  return days.reduce((m, d) => (d.date > m ? d.date : m), days[0].date);
}

function unfinishedTasks(day: Day, progress: ProgressLog): Task[] {
  return day.tasks.filter((t) => !isTaskDone(progress, t.id));
}

export function previewReschedule(plan: Plan, progress: ProgressLog, today: ISODate): ReschedulePreview {
  const missed = missedDays(plan, progress, today);
  const tasks = missed.flatMap((d) => unfinishedTasks(d, progress));
  const minutes = tasks.reduce((s, t) => s + t.minutes, 0);
  const remaining = allDays(plan).filter((d) => d.date >= today && d.type !== 'milestone').length;
  return {
    missedDays: missed.length,
    missedTasks: tasks.length,
    missedMinutes: minutes,
    extendedEndDate: extendSchedule(plan, progress, today).endDate,
    extraMinutesPerDay: remaining ? Math.ceil(minutes / remaining) : minutes,
    remainingDays: remaining,
  };
}

/** Shift every unfinished day (from the first missed one onward) so the plan resumes today. */
export function extendSchedule(plan: Plan, progress: ProgressLog, today: ISODate): Plan {
  const missed = missedDays(plan, progress, today);
  if (missed.length === 0) return plan;

  const next = clonePlan(plan);
  const days = allDays(next).sort((a, b) => a.index - b.index);
  const firstMissedIndex = Math.min(...missed.map((d) => d.index));

  let cursor = today;
  for (const day of days) {
    if (day.index < firstMissedIndex) continue;
    // Completed past days stay where they were.
    if (day.date < today && isDayComplete(day, progress)) continue;
    day.date = cursor;
    cursor = addDays(cursor, 1);
  }
  next.endDate = maxDate(days);
  next.revision++;
  return next;
}

/**
 * Move the unfinished tasks of missed days onto upcoming days (same phase
 * first, least-loaded day first), keeping the end date. Missed milestone days
 * are moved to today as a whole.
 */
export function redistributeSchedule(plan: Plan, progress: ProgressLog, today: ISODate): Plan {
  const missedIds = new Set(missedDays(plan, progress, today).map((d) => d.id));
  if (missedIds.size === 0) return plan;

  const next = clonePlan(plan);
  const days = allDays(next);
  const future = days.filter((d) => d.date >= today && d.type !== 'milestone');
  const load = new Map(future.map((d) => [d.id, d.tasks.reduce((s, t) => s + t.minutes, 0)]));
  const phaseOf = new Map<string, number>();
  for (const p of next.phases) for (const w of p.weeks) for (const d of w.days) phaseOf.set(d.id, p.index);

  const pickTarget = (phaseIndex: number): Day | undefined => {
    const samePhase = future.filter((d) => phaseOf.get(d.id) === phaseIndex);
    const later = future.filter((d) => (phaseOf.get(d.id) ?? 0) > phaseIndex);
    const pool = samePhase.length ? samePhase : later.length ? later : future;
    return pool.reduce<Day | undefined>((best, d) => {
      if (!best) return d;
      const bl = load.get(best.id)!;
      const dl = load.get(d.id)!;
      return dl < bl || (dl === bl && d.date < best.date) ? d : best;
    }, undefined);
  };

  for (const day of days.filter((d) => missedIds.has(d.id)).sort((a, b) => a.index - b.index)) {
    if (day.type === 'milestone') {
      day.date = today;
      continue;
    }
    const pending = unfinishedTasks(day, progress);
    for (const task of pending) {
      const target = pickTarget(phaseOf.get(day.id)!);
      if (!target) {
        // Nothing left in the plan: bring the whole day to today instead.
        day.date = today;
        break;
      }
      target.tasks.push(task);
      load.set(target.id, load.get(target.id)! + task.minutes);
      day.tasks = day.tasks.filter((t) => t.id !== task.id);
      day.rescheduledFrom = true;
    }
  }
  next.endDate = maxDate(days);
  next.revision++;
  return next;
}

export function reschedule(plan: Plan, progress: ProgressLog, today: ISODate, strategy: RescheduleStrategy): Plan {
  return strategy === 'extend' ? extendSchedule(plan, progress, today) : redistributeSchedule(plan, progress, today);
}
