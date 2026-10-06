import type { ISODate, ProgressLog } from '../models/types';
import { review, type SrsGrade } from './srs';

/** What an exercise session produced. */
export interface PracticeResults {
  /** exerciseId → score (0–1) */
  scores: Record<string, number>;
  /** flashcard id → how well the learner remembered it */
  srs: Record<string, SrsGrade>;
}

/**
 * Merge a finished session into the progress log: keep each exercise's best
 * score, schedule flashcards with spaced repetition, and tick the task.
 */
export function applyPracticeResults(progress: ProgressLog, taskId: string, results: PracticeResults, today: ISODate): ProgressLog {
  const exerciseScores = { ...(progress.exerciseScores ?? {}) };
  for (const [id, score] of Object.entries(results.scores)) {
    exerciseScores[id] = Math.max(exerciseScores[id] ?? 0, Math.min(1, Math.max(0, score)));
  }
  const srs = { ...(progress.srs ?? {}) };
  for (const [id, grade] of Object.entries(results.srs)) srs[id] = review(srs[id], grade, today);
  const completedTasks = taskId in progress.completedTasks ? progress.completedTasks : { ...progress.completedTasks, [taskId]: today };
  return { ...progress, exerciseScores, srs, completedTasks };
}

/** Average of a session's scores, 0–100. */
export function sessionScore(results: PracticeResults): number {
  const xs = Object.values(results.scores);
  return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) : 0;
}
