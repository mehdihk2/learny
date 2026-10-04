import type { CefrLevel, FeasibilityResult, FeasibilitySuggestion, FeasibilityStatus, UserProfile } from '../models/types';
import { LEVEL_LABELS, levelIndex, levelSteps, LEVELS, stepHours } from './cefr';

export type FeasibilityInput = Pick<UserProfile, 'language' | 'currentLevel' | 'targetLevel' | 'durationWeeks' | 'dailyMinutes'>;

/** Ratio of available/required hours at or above which a goal is "realistic". */
export const REALISTIC_RATIO = 1;
/** Between this and REALISTIC_RATIO the goal is "ambitious" (doable with intense effort). */
export const AMBITIOUS_RATIO = 0.8;
/** We never suggest more than this per day — beyond it, burnout is likely. */
export const MAX_SENSIBLE_DAILY_MINUTES = 240;

export function availableHours(durationWeeks: number, dailyMinutes: number): number {
  return (durationWeeks * 7 * dailyMinutes) / 60;
}

export function requiredHours(input: Pick<FeasibilityInput, 'language' | 'currentLevel' | 'targetLevel'>): number {
  return levelSteps(input.currentLevel, input.targetLevel).reduce((sum, [, to]) => sum + stepHours(to, input.language), 0);
}

/** Highest level reachable from `from` with `hours` of study (may be `from` itself). */
export function reachableLevel(input: Pick<FeasibilityInput, 'language' | 'currentLevel'>, hours: number): CefrLevel {
  let level = input.currentLevel;
  let remaining = hours;
  for (let i = levelIndex(level) + 1; i < LEVELS.length; i++) {
    const cost = stepHours(LEVELS[i], input.language);
    if (remaining < cost) break;
    remaining -= cost;
    level = LEVELS[i];
  }
  return level;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Compare the hours needed to go from current → target level with the hours
 * the learner has (duration × daily time), and propose fixes when the goal
 * is out of reach.
 */
export function checkFeasibility(input: FeasibilityInput): FeasibilityResult {
  if (levelIndex(input.targetLevel) <= levelIndex(input.currentLevel)) {
    throw new Error('Target level must be higher than current level');
  }
  if (input.durationWeeks <= 0 || input.dailyMinutes <= 0) {
    throw new Error('Duration and daily time must be positive');
  }

  const steps = levelSteps(input.currentLevel, input.targetLevel).map(([from, to]) => ({
    from,
    to,
    hours: stepHours(to, input.language),
  }));
  const required = steps.reduce((s, x) => s + x.hours, 0);
  const available = availableHours(input.durationWeeks, input.dailyMinutes);
  const ratio = available / required;
  const reachable = reachableLevel(input, available);

  const status: FeasibilityStatus =
    ratio >= REALISTIC_RATIO ? 'realistic' : ratio >= AMBITIOUS_RATIO ? 'ambitious' : 'unrealistic';

  const suggestions: FeasibilitySuggestion[] = [];
  if (status !== 'realistic') {
    const weeksNeeded = Math.ceil((required * 60) / (input.dailyMinutes * 7));
    suggestions.push({
      kind: 'extend-duration',
      label: `Extend to ${weeksNeeded} weeks (≈ ${round1(weeksNeeded / 4.345)} months) at ${input.dailyMinutes} min/day`,
      patch: { durationWeeks: weeksNeeded },
    });

    // Round up to the next 5 minutes so the suggestion is practical.
    const minutesNeeded = Math.ceil((required * 60) / (input.durationWeeks * 7) / 5) * 5;
    if (minutesNeeded <= MAX_SENSIBLE_DAILY_MINUTES) {
      suggestions.push({
        kind: 'increase-daily-time',
        label: `Study ${minutesNeeded} min/day for ${input.durationWeeks} weeks`,
        patch: { dailyMinutes: minutesNeeded },
      });
    }

    if (levelIndex(reachable) > levelIndex(input.currentLevel)) {
      suggestions.push({
        kind: 'closer-target',
        label: `Aim for ${reachable} (${LEVEL_LABELS[reachable]}) first`,
        patch: { targetLevel: reachable },
      });
    }
  }

  const reqH = Math.round(required);
  const avH = Math.round(available);
  const message =
    status === 'realistic'
      ? `Great news! Reaching ${input.targetLevel} takes about ${reqH} h and you have ${avH} h available. Very doable.`
      : status === 'ambitious'
        ? `Ambitious but possible: you need about ${reqH} h and have ${avH} h. Expect to stay very consistent — or give yourself a little more time.`
        : `This goal is unlikely in the time available: you need about ${reqH} h but have only ${avH} h (${Math.round(ratio * 100)}%). Try one of the options below.`;

  return {
    status,
    requiredHours: reqH,
    availableHours: round1(available),
    ratio: round1(ratio * 100) / 100,
    steps,
    reachableLevel: reachable,
    message,
    suggestions,
  };
}
