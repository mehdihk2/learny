import type { MilestoneResult, Plan, ProgressLog, Skill, SkillMap, UserProfile } from '../models/types';
import type { MultipleChoiceQuestion, TargetLevel } from '../content';
import { SKILLS } from './cefr';
import { ruleBasedProvider, type TaskContentProvider } from './contentProvider';
import { generatePhase, normalizeWeights } from './planGenerator';
import { isTaskDone } from './progress';

/** Overall score (0–100) needed to pass a milestone. */
export const PASS_MARK = 60;
/** Skills scoring below this are considered weak. */
export const WEAK_SKILL_THRESHOLD = 60;

export interface MilestoneAnswers {
  /** Auto-graded questions shown in the test (may be empty). */
  questions: MultipleChoiceQuestion[];
  /** question id → chosen option index */
  answers: Record<string, number>;
  /** Self-assessment per skill on a 0–3 scale. */
  selfRatings: Partial<Record<Skill, number>>;
}

/**
 * Score a milestone test. Each skill score blends auto-graded accuracy (when
 * the language pack has questions for that skill) with the learner's
 * self-assessment, 50/50.
 */
export function scoreMilestone(phaseId: string, input: MilestoneAnswers, takenAt: string): MilestoneResult {
  const skillScores = {} as SkillMap;
  for (const skill of SKILLS) {
    const qs = input.questions.filter((q) => q.skill === skill);
    const quiz = qs.length ? (qs.filter((q) => input.answers[q.id] === q.answer).length / qs.length) * 100 : null;
    const rating = input.selfRatings[skill];
    const self = rating === undefined ? null : (Math.min(Math.max(rating, 0), 3) / 3) * 100;
    const parts = [quiz, self].filter((x): x is number => x !== null);
    skillScores[skill] = parts.length ? Math.round(parts.reduce((s, x) => s + x, 0) / parts.length) : 0;
  }
  const overall = Math.round(SKILLS.reduce((s, k) => s + skillScores[k], 0) / SKILLS.length);
  const weakSkills = SKILLS.filter((s) => skillScores[s] < WEAK_SKILL_THRESHOLD).sort((a, b) => skillScores[a] - skillScores[b]);
  return { phaseId, takenAt, skillScores, overall, passed: overall >= PASS_MARK, weakSkills };
}

/**
 * Shift focus toward weak skills: a skill at 70/100 keeps its weight, lower
 * scores get up to +60%, higher scores down to −30%. Result is normalised.
 */
export function adaptWeights(weights: SkillMap, scores: SkillMap): SkillMap {
  const adjusted = {} as SkillMap;
  for (const s of SKILLS) {
    const factor = Math.min(1.6, Math.max(0.7, 1 + (70 - scores[s]) / 100));
    adjusted[s] = weights[s] * factor;
  }
  return normalizeWeights(adjusted);
}

/**
 * After a milestone test, regenerate the *next* phase with weights adapted to
 * the result. Days that already have completed tasks are left untouched, and
 * tasks that were moved in by a reschedule are kept.
 */
export function adaptNextPhase(
  plan: Plan,
  progress: ProgressLog,
  profile: UserProfile,
  result: MilestoneResult,
  provider?: TaskContentProvider,
): Plan {
  const current = plan.phases.find((p) => p.id === result.phaseId);
  if (!current) return plan;
  const nextPhase = plan.phases[current.index + 1];
  if (!nextPhase) return plan;

  const oldDays = nextPhase.weeks.flatMap((w) => w.days);
  const weights = adaptWeights(nextPhase.skillWeights, result.skillScores);
  const regenerated = generatePhase({
    profile,
    index: nextPhase.index,
    fromLevel: nextPhase.fromLevel,
    toLevel: nextPhase.toLevel as TargetLevel,
    isFinal: nextPhase.index === plan.phases.length - 1,
    startDate: oldDays[0].date,
    firstDayIndex: oldDays[0].index,
    days: oldDays.length,
    skillWeights: weights,
    provider: provider ?? ruleBasedProvider,
  });

  const oldById = new Map(oldDays.map((d) => [d.id, d]));
  for (const week of regenerated.weeks) {
    week.days = week.days.map((fresh) => {
      const old = oldById.get(fresh.id);
      if (!old) return fresh;
      // Keep days the learner has started, and days whose tasks were moved elsewhere
      // (regenerating them would duplicate the moved task ids).
      if (old.rescheduledFrom || old.tasks.some((t) => isTaskDone(progress, t.id))) return old;
      const movedIn = old.tasks.filter((t) => !t.id.startsWith(`${old.id}-`));
      return { ...fresh, date: old.date, tasks: [...fresh.tasks, ...movedIn] };
    });
  }

  const phases = plan.phases.map((p) => (p.id === nextPhase.id ? regenerated : p));
  return { ...plan, phases, revision: plan.revision + 1 };
}
