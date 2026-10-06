import type { Day, DayType, Phase, Plan, Skill, SkillMap, Task, UserProfile, Week } from '../models/types';
import { resolveLevelContent, type TargetLevel } from '../content';
import { GOAL_SKILL_WEIGHTS, isHigher, SKILLS } from './cefr';
import { ruleBasedProvider, type SlotRole, type TaskContentProvider } from './contentProvider';
import { addDays } from './dates';
import { checkFeasibility } from './feasibility';

export interface GeneratePlanOptions {
  provider?: TaskContentProvider;
  /** Per-phase skill-weight overrides (used when adapting after milestone tests). */
  skillWeights?: Partial<Record<number, SkillMap>>;
}

// ---------------------------------------------------------------------------
// Small pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Split `total` into integer parts proportional to `weights`, each at least
 * `min`, using the largest-remainder method. Parts always sum to `total`.
 */
export function allocateProportionally(total: number, weights: number[], min = 1): number[] {
  if (weights.length === 0) return [];
  if (total < min * weights.length) throw new Error(`Cannot give ${weights.length} parts at least ${min} out of ${total}`);
  const free = total - min * weights.length;
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const exact = weights.map((w) => (w / sum) * free);
  const parts = exact.map((x) => Math.floor(x));
  let left = free - parts.reduce((s, x) => s + x, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k++, left--) parts[order[k % order.length].i]++;
  return parts.map((p) => p + min);
}

/** Split minutes into `n` chunks, rounded to 5-minute units where possible. Sums to `total`. */
export function splitMinutes(total: number, n: number): number[] {
  if (n <= 0 || total <= 0) return [];
  const units = Math.floor(total / 5);
  const rest = total - units * 5;
  const parts = Array.from({ length: n }, (_, i) => (Math.floor(units / n) + (i < units % n ? 1 : 0)) * 5);
  parts[n - 1] += rest;
  return parts.filter((p) => p > 0);
}

export function normalizeWeights(weights: SkillMap): SkillMap {
  const sum = SKILLS.reduce((s, k) => s + Math.max(0, weights[k]), 0) || 1;
  return Object.fromEntries(SKILLS.map((k) => [k, Math.max(0, weights[k]) / sum])) as SkillMap;
}

/** Minutes of daily flashcard warm-up. Skipped for very short sessions. */
export function warmupMinutes(dailyMinutes: number): number {
  if (dailyMinutes < 20) return 0;
  return dailyMinutes < 60 ? 5 : 10;
}

/** How many main tasks fit into `minutes`. */
export function slotCount(minutes: number): number {
  return Math.min(6, Math.max(minutes >= 10 ? 2 : 1, Math.ceil(minutes / 20)));
}

export function dayTypeFor(dayIndexInPhase: number, phaseLength: number): DayType {
  if (dayIndexInPhase === phaseLength - 1) return 'milestone';
  if ((dayIndexInPhase + 1) % 7 === 0) return 'review';
  return 'study';
}

const REVIEW_ORDER: Skill[] = ['vocabulary', 'listening', 'grammar', 'speaking', 'writing', 'reading'];
const EXAM_SKILLS: Skill[] = ['reading', 'listening', 'writing', 'speaking'];

// ---------------------------------------------------------------------------
// Phase generation
// ---------------------------------------------------------------------------

interface PhaseInput {
  profile: UserProfile;
  index: number;
  fromLevel: UserProfile['currentLevel'];
  toLevel: TargetLevel;
  isFinal: boolean;
  startDate: string;
  firstDayIndex: number;
  days: number;
  skillWeights: SkillMap;
  provider: TaskContentProvider;
}

/** Build one phase. Exported so adaptation can regenerate a single phase. */
export function generatePhase(input: PhaseInput): Phase {
  const { profile, index, toLevel, provider } = input;
  const weights = normalizeWeights(input.skillWeights);
  const content = resolveLevelContent(profile.language, toLevel);

  // Running state for balanced skill rotation over the phase.
  const allocated = Object.fromEntries(SKILLS.map((s) => [s, 0])) as SkillMap;
  const occurrences = Object.fromEntries(SKILLS.map((s) => [s, 0])) as SkillMap;
  let allocatedTotal = 0;

  // Skills already practised in the current week — every skill should appear
  // at least once a week, whatever its weight.
  let usedThisWeek = new Set<Skill>();

  const pickSkill = (minutes: number, usedToday: Set<Skill>, slotsLeftInWeek: number): Skill => {
    const missingThisWeek = SKILLS.filter((s) => !usedThisWeek.has(s) && !usedToday.has(s));
    const mustCover = missingThisWeek.length > 0 && slotsLeftInWeek <= missingThisWeek.length;
    let best: Skill = SKILLS[0];
    let bestScore = -Infinity;
    for (const s of SKILLS) {
      if (usedToday.has(s) && usedToday.size < SKILLS.length) continue;
      if (mustCover && !missingThisWeek.includes(s)) continue;
      const deficit = weights[s] * (allocatedTotal + minutes) - allocated[s];
      if (deficit > bestScore + 1e-9) {
        bestScore = deficit;
        best = s;
      }
    }
    return best;
  };

  const weeks: Week[] = [];
  for (let d = 0; d < input.days; d++) {
    const weekIndex = Math.floor(d / 7);
    const dayInWeek = d % 7;
    const round = Math.floor(weekIndex / content.topics.length);
    const baseTopic = content.topics[weekIndex % content.topics.length];
    const topic = round > 0 ? `${baseTopic} (revisited)` : baseTopic;
    const grammar = content.grammar[weekIndex % content.grammar.length];

    if (dayInWeek === 0) {
      weeks.push({ id: `p${index}-w${weekIndex}`, index: weekIndex, theme: topic, days: [] });
      usedThisWeek = new Set();
    }

    const type = dayTypeFor(d, input.days);
    const dayId = `p${index}-w${weekIndex}-d${dayInWeek}`;
    const slots: { role: SlotRole; skill: Skill; minutes: number }[] = [];
    const daily = profile.dailyMinutes;

    if (type === 'study') {
      const warm = warmupMinutes(daily);
      if (warm > 0) slots.push({ role: 'warmup', skill: 'vocabulary', minutes: warm });
      const remaining = daily - warm;
      const used = new Set<Skill>();
      const parts = splitMinutes(remaining, slotCount(remaining));
      const examDay = profile.goal === 'exam' && dayInWeek === 4;
      const weekEnd = Math.min(d - dayInWeek + 7, input.days);
      let laterStudyDays = 0;
      for (let dd = d + 1; dd < weekEnd; dd++) if (dayTypeFor(dd, input.days) === 'study') laterStudyDays++;
      parts.forEach((minutes, i) => {
        const isExamSlot = examDay && i === parts.length - 1;
        const slotsLeftInWeek = parts.length - i + laterStudyDays * parts.length;
        const skill = isExamSlot ? EXAM_SKILLS[weekIndex % EXAM_SKILLS.length] : pickSkill(minutes, used, slotsLeftInWeek);
        used.add(skill);
        usedThisWeek.add(skill);
        slots.push({ role: isExamSlot ? 'exam' : 'practice', skill, minutes });
      });
    } else if (type === 'review') {
      const parts = splitMinutes(daily, slotCount(daily));
      parts.forEach((minutes, i) => slots.push({ role: 'review', skill: REVIEW_ORDER[i % REVIEW_ORDER.length], minutes }));
    } else {
      const testMinutes = Math.min(daily, 45);
      slots.push({ role: 'milestone', skill: 'grammar', minutes: testMinutes });
      if (daily - testMinutes >= 10) slots.push({ role: 'reflection', skill: 'writing', minutes: daily - testMinutes });
    }

    const tasks: Task[] = slots.map((slot, i) => {
      const text = provider.buildTask({
        profile,
        phase: { index, fromLevel: input.fromLevel, toLevel, isFinal: input.isFinal },
        dayType: type,
        weekIndex,
        dayIndexInPhase: d,
        topic,
        grammar,
        skill: slot.skill,
        minutes: slot.minutes,
        role: slot.role,
        occurrence: occurrences[slot.skill],
      });
      if (slot.role === 'practice' || slot.role === 'warmup' || slot.role === 'exam') {
        allocated[slot.skill] += slot.minutes;
        allocatedTotal += slot.minutes;
      }
      if (slot.role === 'practice') occurrences[slot.skill]++;
      return {
        id: `${dayId}-t${i}`,
        ...text,
        skill: slot.skill,
        minutes: slot.minutes,
        kind: slot.role === 'milestone' ? 'milestone' : slot.role === 'review' ? 'review' : 'practice',
        role: slot.role,
      };
    });

    const day: Day = {
      id: dayId,
      date: addDays(input.startDate, d),
      index: input.firstDayIndex + d,
      type,
      focus: type === 'milestone' ? `Milestone: ${toLevel}` : type === 'review' ? `Weekly review – ${topic}` : `${topic} · ${grammar}`,
      tasks,
    };
    weeks[weeks.length - 1].days.push(day);
  }

  const lastWeek = weeks[weeks.length - 1];
  return {
    id: `p${index}`,
    index,
    fromLevel: input.fromLevel,
    toLevel,
    hours: Math.round((input.days * profile.dailyMinutes) / 6) / 10,
    skillWeights: weights,
    weeks,
    milestoneDayId: lastWeek.days[lastWeek.days.length - 1].id,
  };
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

export function validateProfile(profile: UserProfile): void {
  if (!isHigher(profile.targetLevel, profile.currentLevel)) {
    throw new Error('Target level must be higher than current level');
  }
  if (!Number.isInteger(profile.durationWeeks) || profile.durationWeeks < 1 || profile.durationWeeks > 156) {
    throw new Error('Duration must be between 1 and 156 weeks');
  }
  if (profile.dailyMinutes < 5 || profile.dailyMinutes > 480) {
    throw new Error('Daily time must be between 5 and 480 minutes');
  }
}

/**
 * Pure, deterministic plan generator: same profile + options ⇒ same plan.
 *
 * The plan has one phase per CEFR step (e.g. A2→B1, B1→B2). Days are shared
 * between phases in proportion to the hours each step requires. Every 7th day
 * of a phase is a review day and the last day is the milestone test.
 */
export function generatePlan(profile: UserProfile, options: GeneratePlanOptions = {}): Plan {
  validateProfile(profile);
  const provider = options.provider ?? ruleBasedProvider;
  const feasibility = checkFeasibility(profile);
  const totalDays = profile.durationWeeks * 7;
  const steps = feasibility.steps;
  if (totalDays < steps.length) {
    throw new Error(`A ${profile.currentLevel}→${profile.targetLevel} plan needs at least ${steps.length} days`);
  }
  const minDaysPerPhase = Math.max(1, Math.min(3, Math.floor(totalDays / steps.length)));
  const dayCounts = allocateProportionally(totalDays, steps.map((s) => s.hours), minDaysPerPhase);
  const baseWeights = GOAL_SKILL_WEIGHTS[profile.goal];

  const phases: Phase[] = [];
  let offset = 0;
  steps.forEach((step, i) => {
    phases.push(
      generatePhase({
        profile,
        index: i,
        fromLevel: step.from,
        toLevel: step.to as TargetLevel,
        isFinal: i === steps.length - 1,
        startDate: addDays(profile.startDate, offset),
        firstDayIndex: offset,
        days: dayCounts[i],
        skillWeights: options.skillWeights?.[i] ?? baseWeights,
        provider,
      }),
    );
    offset += dayCounts[i];
  });

  return {
    id: `plan-${profile.id}`,
    profileId: profile.id,
    createdAt: profile.createdAt,
    startDate: profile.startDate,
    endDate: addDays(profile.startDate, totalDays - 1),
    phases,
    feasibility,
    generator: provider.id === 'rule-based' ? 'rule-based' : 'ai',
    revision: 0,
  };
}

// ---------------------------------------------------------------------------
// Plan traversal helpers
// ---------------------------------------------------------------------------

export function allDays(plan: Plan): Day[] {
  return plan.phases.flatMap((p) => p.weeks.flatMap((w) => w.days));
}

export function allTasks(plan: Plan): Task[] {
  return allDays(plan).flatMap((d) => d.tasks);
}

export function findDay(plan: Plan, dayId: string): Day | undefined {
  return allDays(plan).find((d) => d.id === dayId);
}

export function phaseOfDay(plan: Plan, dayId: string): Phase | undefined {
  return plan.phases.find((p) => p.weeks.some((w) => w.days.some((d) => d.id === dayId)));
}
