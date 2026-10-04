import type { CefrLevel } from '../models/types';
import type { PlacementQuestion } from '../content/placement';
import { LEVELS } from './cefr';

/** Share of a level's questions that must be right (or self-rated "mostly") to pass it. */
export const PLACEMENT_PASS_RATE = 0.66;

/**
 * Score a placement quiz. `answers` maps question id → chosen option index
 * (multiple choice) or a 0–3 self-rating (self-assessment).
 *
 * The result is the highest level for which this and every lower level was
 * passed. Unanswered questions count as wrong. Never returns C2 since a
 * learner needs somewhere to go.
 */
export function scorePlacement(questions: PlacementQuestion[], answers: Record<string, number>): CefrLevel {
  const byLevel = new Map<CefrLevel, number[]>();
  for (const q of questions) {
    const a = answers[q.id];
    const score = a === undefined ? 0 : q.kind === 'mcq' ? (a === q.answer ? 1 : 0) : Math.min(Math.max(a, 0), 3) / 3;
    byLevel.set(q.level, [...(byLevel.get(q.level) ?? []), score]);
  }

  let result: CefrLevel = 'A0';
  for (const level of LEVELS) {
    const scores = byLevel.get(level);
    if (!scores) continue;
    const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
    if (mean < PLACEMENT_PASS_RATE) break;
    result = level;
  }
  return result === 'C2' ? 'C1' : result;
}
