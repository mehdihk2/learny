import { describe, expect, it } from 'vitest';
import type { SkillMap } from '../models/types';
import { milestoneQuestions } from '../content';
import { makeProfile } from '../test/fixtures';
import { adaptNextPhase, adaptWeights, PASS_MARK, scoreMilestone } from './adaptation';
import { SKILLS } from './cefr';
import { allDays, generatePlan } from './planGenerator';
import { emptyProgress, toggleTask } from './progress';
import { redistributeSchedule } from './reschedule';
import { addDays } from './dates';

const uniform = (v: number) => Object.fromEntries(SKILLS.map((s) => [s, v])) as SkillMap;

describe('scoreMilestone', () => {
  const questions = milestoneQuestions('es', 'B1');

  it('blends quiz accuracy with self-assessment', () => {
    const allRight = Object.fromEntries(questions.map((q) => [q.id, q.answer]));
    const r = scoreMilestone('p0', { questions, answers: allRight, selfRatings: { grammar: 0, speaking: 3, listening: 3, reading: 3, writing: 3, vocabulary: 3 } }, 'now');
    expect(r.skillScores.grammar).toBe(50); // 100% quiz, 0% self
    expect(r.skillScores.speaking).toBe(100); // self only
    expect(r.passed).toBe(true);
  });

  it('detects weak skills, weakest first', () => {
    const r = scoreMilestone('p0', { questions: [], answers: {}, selfRatings: { listening: 1, speaking: 0, reading: 3, writing: 2, vocabulary: 3, grammar: 3 } }, 'now');
    expect(r.weakSkills).toEqual(['speaking', 'listening']);
  });

  it('fails below the pass mark', () => {
    const r = scoreMilestone('p0', { questions, answers: {}, selfRatings: uniform(1) }, 'now');
    expect(r.overall).toBeLessThan(PASS_MARK);
    expect(r.passed).toBe(false);
  });
});

describe('adaptWeights', () => {
  it('boosts weak skills and trims strong ones, keeping a sum of 1', () => {
    const before = uniform(1 / 6);
    const after = adaptWeights(before, { listening: 30, speaking: 40, reading: 90, writing: 70, vocabulary: 95, grammar: 70 });
    expect(after.listening).toBeGreaterThan(before.listening);
    expect(after.speaking).toBeGreaterThan(before.speaking);
    expect(after.vocabulary).toBeLessThan(before.vocabulary);
    expect(SKILLS.reduce((s, k) => s + after[k], 0)).toBeCloseTo(1);
  });

  it('is neutral when every skill scores 70', () => {
    const before = uniform(1 / 6);
    const after = adaptWeights(before, uniform(70));
    SKILLS.forEach((s) => expect(after[s]).toBeCloseTo(before[s]));
  });
});

describe('adaptNextPhase', () => {
  const profile = makeProfile({ currentLevel: 'A2', targetLevel: 'B2', durationWeeks: 30, dailyMinutes: 60 });
  const plan = generatePlan(profile);
  const weakWriting = scoreMilestone('p0', { questions: [], answers: {}, selfRatings: { listening: 3, speaking: 3, reading: 3, writing: 0, vocabulary: 3, grammar: 3 } }, 'now');

  const minutes = (p: typeof plan, skill: string) =>
    p.phases[1].weeks.flatMap((w) => w.days).flatMap((d) => d.tasks).filter((t) => t.skill === skill).reduce((s, t) => s + t.minutes, 0);

  it('puts more practice on weak skills in the next phase', () => {
    const adapted = adaptNextPhase(plan, emptyProgress(plan.id), profile, weakWriting);
    expect(adapted.phases[1].skillWeights.writing).toBeGreaterThan(plan.phases[1].skillWeights.writing);
    expect(minutes(adapted, 'writing')).toBeGreaterThan(minutes(plan, 'writing'));
    expect(adapted.revision).toBe(plan.revision + 1);
  });

  it('leaves the current phase and dates untouched', () => {
    const adapted = adaptNextPhase(plan, emptyProgress(plan.id), profile, weakWriting);
    expect(adapted.phases[0]).toEqual(plan.phases[0]);
    expect(allDays(adapted).map((d) => d.date)).toEqual(allDays(plan).map((d) => d.date));
  });

  it('keeps days the learner already started', () => {
    const firstNextDay = plan.phases[1].weeks[0].days[0];
    const progress = toggleTask(emptyProgress(plan.id), firstNextDay.tasks[0].id, firstNextDay.date);
    const adapted = adaptNextPhase(plan, progress, profile, weakWriting);
    expect(adapted.phases[1].weeks[0].days[0]).toEqual(firstNextDay);
  });

  it('keeps tasks moved in by a reschedule and never duplicates ids', () => {
    const lastP0 = plan.phases[0].weeks.at(-1)!.days.at(-1)!;
    // Skip the last week of phase 0 so its tasks are spread over phase 1.
    const days = allDays(plan);
    let progress = emptyProgress(plan.id);
    for (const d of days.filter((x) => x.index < lastP0.index - 5)) for (const t of d.tasks) progress = toggleTask(progress, t.id, d.date);
    const rescheduled = redistributeSchedule(plan, progress, addDays(lastP0.date, 1));
    const adapted = adaptNextPhase(rescheduled, progress, profile, weakWriting);
    const ids = allDays(adapted).flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(allDays(rescheduled).flatMap((d) => d.tasks.map((t) => t.id)).sort());
  });

  it('does nothing after the final phase', () => {
    const last = scoreMilestone('p1', { questions: [], answers: {}, selfRatings: uniform(3) }, 'now');
    expect(adaptNextPhase(plan, emptyProgress(plan.id), profile, last)).toBe(plan);
  });
});
