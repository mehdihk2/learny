import { describe, expect, it } from 'vitest';
import type { ProgressLog } from '../models/types';
import { makeProfile } from '../test/fixtures';
import { addDays } from './dates';
import { allDays, allTasks, generatePlan } from './planGenerator';
import { emptyProgress, missedDays, toggleTask } from './progress';
import { extendSchedule, previewReschedule, redistributeSchedule } from './reschedule';

const profile = makeProfile({ durationWeeks: 8, dailyMinutes: 30 });
const plan = generatePlan(profile);
const days = allDays(plan);

function completeDays(indices: number[]): ProgressLog {
  let p = emptyProgress(plan.id);
  for (const i of indices) for (const t of days[i].tasks) p = toggleTask(p, t.id, days[i].date);
  return p;
}

// Learner did days 0–2, skipped days 3–5, and it's now day 6.
const progress = completeDays([0, 1, 2]);
const today = addDays(profile.startDate, 6);

describe('previewReschedule', () => {
  it('summarises what was missed and both options', () => {
    const pv = previewReschedule(plan, progress, today);
    expect(pv.missedDays).toBe(3);
    expect(pv.missedMinutes).toBe(90);
    expect(pv.extendedEndDate).toBe(addDays(plan.endDate, 3));
    expect(pv.extraMinutesPerDay).toBeGreaterThan(0);
  });
});

describe('extendSchedule', () => {
  const next = extendSchedule(plan, progress, today);
  const nextDays = allDays(next);

  it('moves the first missed day to today and shifts the rest', () => {
    expect(nextDays[3].date).toBe(today);
    expect(nextDays[4].date).toBe(addDays(today, 1));
    expect(nextDays[days.length - 1].date).toBe(addDays(plan.endDate, 3));
    expect(next.endDate).toBe(addDays(plan.endDate, 3));
  });

  it('keeps completed days where they were', () => {
    expect(nextDays.slice(0, 3).map((d) => d.date)).toEqual(days.slice(0, 3).map((d) => d.date));
  });

  it('leaves no missed days and keeps every task', () => {
    expect(missedDays(next, progress, today)).toEqual([]);
    expect(allTasks(next).map((t) => t.id).sort()).toEqual(allTasks(plan).map((t) => t.id).sort());
    expect(next.revision).toBe(plan.revision + 1);
  });

  it('does not mutate the original plan', () => {
    expect(allDays(plan)[3].date).toBe(addDays(profile.startDate, 3));
  });

  it('keeps a completed day that sits after a missed one', () => {
    const p = completeDays([0, 1, 2, 4]); // skipped day 3 only (and 5)
    const n = allDays(extendSchedule(plan, p, today));
    expect(n[4].date).toBe(days[4].date);
    expect(n[3].date).toBe(today);
    expect(n[5].date).toBe(addDays(today, 1));
  });

  it('is a no-op when nothing was missed', () => {
    expect(extendSchedule(plan, completeDays([0, 1, 2, 3, 4, 5]), today)).toBe(plan);
  });
});

describe('redistributeSchedule', () => {
  const next = redistributeSchedule(plan, progress, today);

  it('keeps the end date', () => {
    expect(next.endDate).toBe(plan.endDate);
  });

  it('moves every unfinished task of missed days to today or later', () => {
    expect(missedDays(next, progress, today)).toEqual([]);
    const moved = days.slice(3, 6).flatMap((d) => d.tasks.map((t) => t.id));
    for (const day of allDays(next)) {
      for (const t of day.tasks) if (moved.includes(t.id)) expect(day.date >= today).toBe(true);
    }
    allDays(next).slice(3, 6).forEach((d) => {
      expect(d.tasks).toHaveLength(0);
      expect(d.rescheduledFrom).toBe(true);
    });
  });

  it('keeps every task exactly once', () => {
    const ids = allTasks(next).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(allTasks(plan).map((t) => t.id).sort());
  });

  it('spreads the load instead of piling it on one day', () => {
    const load = allDays(next)
      .filter((d) => d.date >= today)
      .map((d) => d.tasks.reduce((s, t) => s + t.minutes, 0));
    expect(Math.max(...load)).toBeLessThanOrEqual(profile.dailyMinutes + 15);
  });

  it('never adds tasks to milestone days', () => {
    for (const d of allDays(next).filter((x) => x.type === 'milestone')) {
      expect(d.tasks.every((t) => t.id.startsWith(d.id))).toBe(true);
    }
  });

  it('moves a missed milestone day to today', () => {
    const msIndex = days.findIndex((d) => d.type === 'milestone');
    const lateToday = addDays(days[msIndex].date, 2);
    const p = completeDays(days.slice(0, msIndex).map((d) => d.index));
    const n = redistributeSchedule(plan, p, lateToday);
    expect(allDays(n)[msIndex].date).toBe(lateToday);
  });
});
