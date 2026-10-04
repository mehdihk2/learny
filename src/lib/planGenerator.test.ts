import { describe, expect, it } from 'vitest';
import type { Plan, Skill } from '../models/types';
import { makeProfile } from '../test/fixtures';
import { GOAL_SKILL_WEIGHTS, SKILLS } from './cefr';
import type { TaskContentProvider } from './contentProvider';
import { addDays } from './dates';
import {
  allDays,
  allocateProportionally,
  allTasks,
  dayTypeFor,
  generatePlan,
  slotCount,
  splitMinutes,
  warmupMinutes,
} from './planGenerator';

const minutesBySkill = (plan: Plan, phaseIndex = 0) => {
  const totals = Object.fromEntries(SKILLS.map((s) => [s, 0])) as Record<Skill, number>;
  for (const w of plan.phases[phaseIndex].weeks)
    for (const d of w.days) if (d.type === 'study') for (const t of d.tasks) totals[t.skill] += t.minutes;
  return totals;
};

describe('helpers', () => {
  it('allocateProportionally sums to total and respects minimum', () => {
    const parts = allocateProportionally(30, [185, 200, 200], 3);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(30);
    parts.forEach((p) => expect(p).toBeGreaterThanOrEqual(3));
    expect(allocateProportionally(10, [1, 1, 1], 1)).toEqual([4, 3, 3]);
    expect(() => allocateProportionally(2, [1, 1, 1], 1)).toThrow();
  });

  it('splitMinutes keeps the exact total in 5-minute chunks', () => {
    expect(splitMinutes(50, 3)).toEqual([20, 15, 15]);
    expect(splitMinutes(15, 2)).toEqual([10, 5]);
    expect(splitMinutes(47, 2)).toEqual([25, 22]);
    expect(splitMinutes(110, 6).reduce((s, x) => s + x, 0)).toBe(110);
  });

  it('warm-up and slot counts scale with the time available', () => {
    expect(warmupMinutes(15)).toBe(0);
    expect(warmupMinutes(30)).toBe(5);
    expect(warmupMinutes(120)).toBe(10);
    expect(slotCount(15)).toBe(2);
    expect(slotCount(50)).toBe(3);
    expect(slotCount(110)).toBe(6);
    expect(slotCount(400)).toBe(6);
  });

  it('dayTypeFor puts a review every 7th day and a milestone at the end', () => {
    expect(dayTypeFor(0, 30)).toBe('study');
    expect(dayTypeFor(6, 30)).toBe('review');
    expect(dayTypeFor(13, 30)).toBe('review');
    expect(dayTypeFor(29, 30)).toBe('milestone');
    expect(dayTypeFor(6, 7)).toBe('milestone');
  });
});

describe('generatePlan', () => {
  it('is pure: same profile ⇒ identical plan', () => {
    const p = makeProfile();
    expect(generatePlan(p)).toEqual(generatePlan(p));
  });

  it('creates one phase per CEFR step', () => {
    const plan = generatePlan(makeProfile({ currentLevel: 'A2', targetLevel: 'C1', durationWeeks: 52 }));
    expect(plan.phases.map((p) => `${p.fromLevel}→${p.toLevel}`)).toEqual(['A2→B1', 'B1→B2', 'B2→C1']);
  });

  it('covers exactly durationWeeks × 7 consecutive days', () => {
    const profile = makeProfile({ durationWeeks: 10 });
    const plan = generatePlan(profile);
    const days = allDays(plan);
    expect(days).toHaveLength(70);
    days.forEach((d, i) => {
      expect(d.index).toBe(i);
      expect(d.date).toBe(addDays(profile.startDate, i));
    });
    expect(plan.startDate).toBe(profile.startDate);
    expect(plan.endDate).toBe(addDays(profile.startDate, 69));
  });

  it('splits days between phases in proportion to required hours', () => {
    const plan = generatePlan(makeProfile({ currentLevel: 'A1', targetLevel: 'B1', durationWeeks: 20 }));
    const [a2, b1] = plan.phases.map((p) => p.weeks.reduce((s, w) => s + w.days.length, 0));
    expect(a2 + b1).toBe(140);
    // A1→A2 = 100h, A2→B1 = 185h
    expect(b1).toBeGreaterThan(a2 * 1.6);
  });

  it('groups days into weeks of at most 7', () => {
    const plan = generatePlan(makeProfile({ durationWeeks: 5 }));
    for (const phase of plan.phases) {
      phase.weeks.forEach((w, i) => {
        expect(w.index).toBe(i);
        expect(w.days.length).toBeGreaterThan(0);
        expect(w.days.length).toBeLessThanOrEqual(7);
      });
    }
  });

  it('fills every day with exactly the daily time available', () => {
    for (const dailyMinutes of [15, 30, 45, 60, 120]) {
      const plan = generatePlan(makeProfile({ dailyMinutes, durationWeeks: 4 }));
      for (const day of allDays(plan)) {
        expect(day.tasks.reduce((s, t) => s + t.minutes, 0)).toBe(dailyMinutes);
      }
    }
  });

  it('gives every task a title, instructions, a resource type and no leftover placeholders', () => {
    const plan = generatePlan(makeProfile({ language: 'de', currentLevel: 'A0', targetLevel: 'C2', durationWeeks: 104, goal: 'exam', examName: 'Goethe' }));
    for (const t of allTasks(plan)) {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.instructions.length).toBeGreaterThan(10);
      expect(t.resourceType).toBeTruthy();
      expect(t.minutes).toBeGreaterThan(0);
      expect(`${t.title} ${t.instructions}`).not.toMatch(/\{\w+\}/);
    }
  });

  it('uses unique, stable task ids', () => {
    const plan = generatePlan(makeProfile({ durationWeeks: 26 }));
    const ids = allTasks(plan).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes a weekly review day and ends each phase with a milestone test', () => {
    const plan = generatePlan(makeProfile({ currentLevel: 'A2', targetLevel: 'B2', durationWeeks: 40 }));
    for (const phase of plan.phases) {
      const days = phase.weeks.flatMap((w) => w.days);
      const last = days[days.length - 1];
      expect(last.type).toBe('milestone');
      expect(last.id).toBe(phase.milestoneDayId);
      expect(last.tasks.some((t) => t.kind === 'milestone')).toBe(true);
      expect(days.filter((d) => d.type === 'milestone')).toHaveLength(1);
      // every complete week (except possibly the last) has a review day
      for (const w of phase.weeks.slice(0, -1)) {
        expect(w.days.filter((d) => d.type === 'review')).toHaveLength(1);
        expect(w.days[6].type).toBe('review');
      }
    }
  });

  it('covers all four skills plus vocabulary and grammar each week', () => {
    const plan = generatePlan(makeProfile({ dailyMinutes: 30, durationWeeks: 12 }));
    for (const week of plan.phases[0].weeks.slice(0, -1)) {
      const skills = new Set(week.days.filter((d) => d.type === 'study').flatMap((d) => d.tasks.map((t) => t.skill)));
      for (const s of SKILLS) expect(skills).toContain(s);
    }
  });

  it('balances minutes across skills according to goal weights', () => {
    const plan = generatePlan(makeProfile({ goal: 'conversation', durationWeeks: 20, dailyMinutes: 60 }));
    const totals = minutesBySkill(plan);
    const sum = Object.values(totals).reduce((s, x) => s + x, 0);
    for (const s of SKILLS) {
      expect(totals[s] / sum).toBeCloseTo(GOAL_SKILL_WEIGHTS.conversation[s], 1);
    }
    expect(totals.speaking).toBeGreaterThan(totals.writing * 3);
  });

  it('honours skill-weight overrides per phase', () => {
    const profile = makeProfile({ durationWeeks: 12 });
    const weights = { listening: 0.1, reading: 0.1, speaking: 0.1, writing: 0.5, vocabulary: 0.1, grammar: 0.1 };
    const plan = generatePlan(profile, { skillWeights: { 0: weights } });
    const totals = minutesBySkill(plan);
    expect(totals.writing).toBe(Math.max(...Object.values(totals)));
    expect(plan.phases[0].skillWeights.writing).toBeCloseTo(0.5);
  });

  it('never repeats a skill within a single day (except the warm-up)', () => {
    const plan = generatePlan(makeProfile({ dailyMinutes: 120, durationWeeks: 4 }));
    for (const day of allDays(plan).filter((d) => d.type === 'study')) {
      const practice = day.tasks.slice(1).map((t) => t.skill);
      expect(new Set(practice).size).toBe(practice.length);
    }
  });

  it('uses Spanish-specific content for Spanish learners', () => {
    const plan = generatePlan(makeProfile({ language: 'es', currentLevel: 'A1', targetLevel: 'A2', durationWeeks: 8 }));
    expect(plan.phases[0].weeks[0].theme).toBe('Viajes y transporte');
    const text = allTasks(plan).map((t) => `${t.title} ${t.instructions}`).join('\n');
    expect(text).toMatch(/pretérito indefinido/);
  });

  it('falls back to generic content for other languages', () => {
    const plan = generatePlan(makeProfile({ language: 'ja', currentLevel: 'A1', targetLevel: 'A2', durationWeeks: 8 }));
    expect(plan.phases[0].weeks[0].theme).toBe('Travel & transport');
    expect(allTasks(plan).some((t) => t.instructions.includes('Japanese'))).toBe(true);
  });

  it('adds weekly exam practice for exam goals', () => {
    const plan = generatePlan(makeProfile({ goal: 'exam', examName: 'DELE', durationWeeks: 8 }));
    const exam = allTasks(plan).filter((t) => t.title.startsWith('Exam practice'));
    expect(exam.length).toBeGreaterThanOrEqual(7);
    expect(exam[0].title).toContain('DELE');
  });

  it('handles very short plans with many level steps', () => {
    const plan = generatePlan(makeProfile({ currentLevel: 'A0', targetLevel: 'C2', durationWeeks: 1, dailyMinutes: 15 }));
    expect(plan.phases).toHaveLength(6);
    expect(allDays(plan)).toHaveLength(7);
    plan.phases.forEach((p) => expect(p.weeks[0].days.length).toBeGreaterThanOrEqual(1));
  });

  it('allocates phase hours from days × daily time', () => {
    const plan = generatePlan(makeProfile({ durationWeeks: 10, dailyMinutes: 30 }));
    expect(plan.phases[0].hours).toBe(35);
  });

  it('uses a custom content provider when given one', () => {
    const provider: TaskContentProvider = {
      id: 'test-ai',
      buildTask: (ctx) => ({ title: `AI ${ctx.skill}`, instructions: `Generated for ${ctx.topic}`, resourceType: 'article' }),
    };
    const plan = generatePlan(makeProfile({ durationWeeks: 2 }), { provider });
    expect(plan.generator).toBe('ai');
    expect(allTasks(plan).every((t) => t.title.startsWith('AI '))).toBe(true);
  });

  it('validates the profile', () => {
    expect(() => generatePlan(makeProfile({ currentLevel: 'B2', targetLevel: 'B1' }))).toThrow(/higher/);
    expect(() => generatePlan(makeProfile({ durationWeeks: 0 }))).toThrow();
    expect(() => generatePlan(makeProfile({ dailyMinutes: 0 }))).toThrow();
  });

  it('stores feasibility with the plan', () => {
    const plan = generatePlan(makeProfile({ currentLevel: 'A2', targetLevel: 'C1', durationWeeks: 4, dailyMinutes: 15 }));
    expect(plan.feasibility.status).toBe('unrealistic');
  });
});
