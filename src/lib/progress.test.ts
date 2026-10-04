import { describe, expect, it } from 'vitest';
import { makeProfile } from '../test/fixtures';
import { addDays } from './dates';
import { allDays, generatePlan } from './planGenerator';
import {
  currentStreak,
  emptyProgress,
  estimatedLevel,
  isDayComplete,
  longestStreak,
  missedDays,
  planStats,
  toggleTask,
  upcomingMilestones,
} from './progress';
import type { ProgressLog } from '../models/types';

const profile = makeProfile({ currentLevel: 'A2', targetLevel: 'B2', durationWeeks: 20 });
const plan = generatePlan(profile);
const days = allDays(plan);

function completeDays(n: number, progress: ProgressLog = emptyProgress(plan.id)): ProgressLog {
  let p = progress;
  for (const day of days.slice(0, n)) for (const t of day.tasks) p = toggleTask(p, t.id, day.date);
  return p;
}

describe('toggleTask', () => {
  it('marks and unmarks a task immutably', () => {
    const p0 = emptyProgress(plan.id);
    const id = days[0].tasks[0].id;
    const p1 = toggleTask(p0, id, '2026-01-05');
    expect(p1.completedTasks[id]).toBe('2026-01-05');
    expect(p0.completedTasks).toEqual({});
    expect(toggleTask(p1, id, '2026-01-05').completedTasks).toEqual({});
  });
});

describe('planStats & isDayComplete', () => {
  it('computes percentage of tasks done', () => {
    const p = completeDays(days.length / 2);
    const s = planStats(plan, p);
    expect(s.totalTasks).toBe(days.reduce((n, d) => n + d.tasks.length, 0));
    expect(s.percent).toBeGreaterThan(40);
    expect(s.percent).toBeLessThan(60);
    expect(isDayComplete(days[0], p)).toBe(true);
    expect(isDayComplete(days[days.length - 1], p)).toBe(false);
  });
});

describe('streaks', () => {
  const p = completeDays(5); // 2026-01-05 … 2026-01-09

  it('counts consecutive active days ending today', () => {
    expect(currentStreak(p, '2026-01-09')).toBe(5);
  });

  it('is not broken yet if the learner has not studied today', () => {
    expect(currentStreak(p, '2026-01-10')).toBe(5);
  });

  it('resets after a full missed day', () => {
    expect(currentStreak(p, '2026-01-11')).toBe(0);
  });

  it('tracks the longest streak', () => {
    const withGap = toggleTask(p, days[10].tasks[0].id, '2026-01-20');
    expect(longestStreak(withGap)).toBe(5);
  });
});

describe('missedDays', () => {
  it('lists past days with unfinished tasks', () => {
    const p = completeDays(3);
    const today = addDays(profile.startDate, 6);
    expect(missedDays(plan, p, today).map((d) => d.index)).toEqual([3, 4, 5]);
  });

  it('is empty when everything is done', () => {
    expect(missedDays(plan, completeDays(6), addDays(profile.startDate, 6))).toEqual([]);
  });
});

describe('milestones & estimated level', () => {
  it('lists upcoming milestones until passed', () => {
    const p = emptyProgress(plan.id);
    const ms = upcomingMilestones(plan, p, profile.startDate);
    expect(ms.map((m) => m.phase.toLevel)).toEqual(['B1', 'B2']);
    expect(ms[0].daysAway).toBeGreaterThan(0);

    const passed: ProgressLog = {
      ...p,
      milestoneResults: [{ phaseId: 'p0', takenAt: '', skillScores: {} as never, overall: 80, passed: true, weakSkills: [] }],
    };
    expect(upcomingMilestones(plan, passed, profile.startDate).map((m) => m.phase.toLevel)).toEqual(['B2']);
  });

  it('estimates level from passed milestones and phase progress', () => {
    const p = emptyProgress(plan.id);
    expect(estimatedLevel(plan, p, 'A2')).toEqual({ level: 'A2', next: 'B1', progressToNext: 0 });

    const passed: ProgressLog = {
      ...completeDays(10),
      milestoneResults: [{ phaseId: 'p0', takenAt: '', skillScores: {} as never, overall: 80, passed: true, weakSkills: [] }],
    };
    const est = estimatedLevel(plan, passed, 'A2');
    expect(est.level).toBe('B1');
    expect(est.next).toBe('B2');

    const failed: ProgressLog = { ...passed, milestoneResults: [{ ...passed.milestoneResults[0], passed: false }] };
    expect(estimatedLevel(plan, failed, 'A2').level).toBe('A2');
    expect(estimatedLevel(plan, failed, 'A2').progressToNext).toBeGreaterThan(0);
  });
});
