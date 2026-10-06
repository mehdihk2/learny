import { addDays } from '../lib/dates';
import type { ISODate, SrsCardState as SrsState } from '../models/types';

export type { SrsCardState as SrsState } from '../models/types';

/**
 * Leitner-style spaced repetition. A card climbs one box when remembered and
 * falls back to box 0 when forgotten; each box has a longer interval.
 */
export const BOX_INTERVALS = [1, 2, 4, 8, 16, 32, 64];

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy';

export function newCard(today: ISODate): SrsState {
  return { box: 0, due: today, reviews: 0, lapses: 0 };
}

export function review(state: SrsState | undefined, grade: SrsGrade, today: ISODate): SrsState {
  const s = state ?? newCard(today);
  const max = BOX_INTERVALS.length - 1;
  let box: number;
  if (grade === 'again') box = 0;
  else if (grade === 'hard') box = Math.max(0, s.box);
  else if (grade === 'good') box = Math.min(max, s.box + 1);
  else box = Math.min(max, s.box + 2);
  const interval = grade === 'again' ? 1 : grade === 'hard' ? Math.max(1, Math.floor(BOX_INTERVALS[box] / 2)) : BOX_INTERVALS[box];
  return {
    box,
    due: addDays(today, interval),
    reviews: s.reviews + 1,
    lapses: s.lapses + (grade === 'again' ? 1 : 0),
  };
}

export function isDue(state: SrsState | undefined, today: ISODate): boolean {
  return !state || state.due <= today;
}

/** Score for an SRS grade, so flashcards count as exercise attempts. */
export function gradeScore(grade: SrsGrade): number {
  return { again: 0, hard: 0.5, good: 0.9, easy: 1 }[grade];
}
