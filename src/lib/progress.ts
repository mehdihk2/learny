import type { CefrLevel, Day, ISODate, Phase, Plan, ProgressLog } from '../models/types';
import { addDays, diffDays } from './dates';
import { allDays } from './planGenerator';

export function emptyProgress(planId: string): ProgressLog {
  return { planId, completedTasks: {}, milestoneResults: [], events: [] };
}

export function isTaskDone(progress: ProgressLog, taskId: string): boolean {
  return taskId in progress.completedTasks;
}

export function isDayComplete(day: Day, progress: ProgressLog): boolean {
  return day.tasks.every((t) => isTaskDone(progress, t.id));
}

export function dayCompletion(day: Day, progress: ProgressLog): number {
  if (day.tasks.length === 0) return 1;
  return day.tasks.filter((t) => isTaskDone(progress, t.id)).length / day.tasks.length;
}

/** Toggle a task; returns a new ProgressLog (immutable). */
export function toggleTask(progress: ProgressLog, taskId: string, today: ISODate): ProgressLog {
  const completedTasks = { ...progress.completedTasks };
  if (taskId in completedTasks) delete completedTasks[taskId];
  else completedTasks[taskId] = today;
  return { ...progress, completedTasks };
}

export interface PlanStats {
  totalTasks: number;
  doneTasks: number;
  totalMinutes: number;
  doneMinutes: number;
  /** 0–100 */
  percent: number;
}

export function planStats(plan: Plan, progress: ProgressLog): PlanStats {
  let totalTasks = 0;
  let doneTasks = 0;
  let totalMinutes = 0;
  let doneMinutes = 0;
  for (const day of allDays(plan)) {
    for (const t of day.tasks) {
      totalTasks++;
      totalMinutes += t.minutes;
      if (isTaskDone(progress, t.id)) {
        doneTasks++;
        doneMinutes += t.minutes;
      }
    }
  }
  return { totalTasks, doneTasks, totalMinutes, doneMinutes, percent: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0 };
}

export function phaseProgress(phase: Phase, progress: ProgressLog): number {
  const tasks = phase.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
  if (tasks.length === 0) return 0;
  return tasks.filter((t) => isTaskDone(progress, t.id)).length / tasks.length;
}

/** Dates (local) on which the learner completed at least one task. */
export function activeDates(progress: ProgressLog): Set<ISODate> {
  return new Set(Object.values(progress.completedTasks));
}

/**
 * Consecutive days with at least one completed task, ending today — or
 * yesterday, so the streak isn't "lost" before the learner has had a chance
 * to study today.
 */
export function currentStreak(progress: ProgressLog, today: ISODate): number {
  const dates = activeDates(progress);
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(progress: ProgressLog): number {
  const sorted = [...activeDates(progress)].sort();
  let best = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function daysOn(plan: Plan, date: ISODate): Day[] {
  return allDays(plan).filter((d) => d.date === date);
}

/** Past plan days that still have unfinished tasks. */
export function missedDays(plan: Plan, progress: ProgressLog, today: ISODate): Day[] {
  return allDays(plan)
    .filter((d) => d.date < today && !isDayComplete(d, progress))
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
}

export interface UpcomingMilestone {
  phase: Phase;
  day: Day;
  daysAway: number;
}

export function upcomingMilestones(plan: Plan, progress: ProgressLog, today: ISODate): UpcomingMilestone[] {
  const done = new Set(progress.milestoneResults.filter((r) => r.passed).map((r) => r.phaseId));
  const days = allDays(plan);
  return plan.phases
    .filter((p) => !done.has(p.id))
    .map((phase) => {
      const day = days.find((d) => d.id === phase.milestoneDayId)!;
      return { phase, day, daysAway: diffDays(today, day.date) };
    });
}

export interface EstimatedLevel {
  /** Level the learner has demonstrably reached. */
  level: CefrLevel;
  /** Level currently being worked towards (null when the plan is done). */
  next: CefrLevel | null;
  /** 0–1 progress through the current phase. */
  progressToNext: number;
}

/**
 * Estimate the learner's level: the `toLevel` of the last consecutively
 * passed milestone, plus how far they are through the following phase.
 */
export function estimatedLevel(plan: Plan, progress: ProgressLog, startLevel: CefrLevel): EstimatedLevel {
  const passed = new Set(progress.milestoneResults.filter((r) => r.passed).map((r) => r.phaseId));
  let level = startLevel;
  for (const phase of plan.phases) {
    if (!passed.has(phase.id)) {
      return { level, next: phase.toLevel, progressToNext: phaseProgress(phase, progress) };
    }
    level = phase.toLevel;
  }
  return { level, next: null, progressToNext: 1 };
}

/** Index of the phase containing `today` (clamped to the plan). */
export function currentPhaseIndex(plan: Plan, today: ISODate): number {
  const idx = plan.phases.findIndex((p) => p.weeks.some((w) => w.days.some((d) => d.date >= today)));
  return idx === -1 ? plan.phases.length - 1 : idx;
}
