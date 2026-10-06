import type { CefrLevel, LanguageCode, Skill } from '../models/types';

/** Skills that have interactive exercises. Reading & writing stay as guided tasks. */
export type PracticeSkill = Extract<Skill, 'vocabulary' | 'grammar' | 'listening' | 'speaking'>;
export const PRACTICE_SKILLS: PracticeSkill[] = ['vocabulary', 'grammar', 'listening', 'speaking'];

export function isPracticeSkill(skill: Skill): skill is PracticeSkill {
  return (PRACTICE_SKILLS as Skill[]).includes(skill);
}

export type BankLevel = Exclude<CefrLevel, 'A0' | 'C2'>;

interface Base {
  id: string;
  language: LanguageCode;
  level: BankLevel;
  skill: PracticeSkill;
}

/** Vocabulary card (also used by spaced repetition). `term` is in the target language. */
export interface FlashcardExercise extends Base {
  type: 'flashcard';
  term: string;
  meaning: string;
  example?: string;
}

/** Pick the right option. Optional `audio` text is read aloud (listening). */
export interface McqExercise extends Base {
  type: 'mcq';
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  audio?: string;
}

/** Fill the gap(s) marked `___`. Each gap accepts any of its alternatives. */
export interface ClozeExercise extends Base {
  type: 'cloze';
  sentence: string;
  answers: string[][];
  hint?: string;
  explanation?: string;
}

/** Put the words back in order. */
export interface OrderExercise extends Base {
  type: 'order';
  words: string[];
  translation: string;
}

/** Match terms with meanings. */
export interface MatchExercise extends Base {
  type: 'match';
  pairs: [string, string][];
}

/** Listen and type what you hear. */
export interface DictationExercise extends Base {
  type: 'dictation';
  text: string;
  translation: string;
}

/** Listen to a short dialogue, then answer questions. */
export interface ListeningExercise extends Base {
  type: 'listening';
  title: string;
  lines: { speaker: 'A' | 'B'; text: string }[];
  questions: { prompt: string; options: string[]; answer: number }[];
}

/** Listen and repeat (shadowing / pronunciation). */
export interface RepeatExercise extends Base {
  type: 'repeat';
  text: string;
  translation: string;
}

/** Answer a question out loud. */
export interface SpeakExercise extends Base {
  type: 'speak';
  prompt: string;
  /** Words or structures to try to use. */
  targets: string[];
  seconds: number;
  modelAnswer?: string;
}

export type Exercise =
  | FlashcardExercise
  | McqExercise
  | ClozeExercise
  | OrderExercise
  | MatchExercise
  | DictationExercise
  | ListeningExercise
  | RepeatExercise
  | SpeakExercise;

export type ExerciseType = Exercise['type'];

/** Rough minutes an exercise takes, used to fill a task's time. */
export const EXERCISE_MINUTES: Record<ExerciseType, number> = {
  flashcard: 0.5,
  mcq: 0.75,
  cloze: 1,
  order: 1,
  match: 2,
  dictation: 1.5,
  listening: 4,
  repeat: 1,
  speak: 3,
};

export interface ExerciseAttempt {
  exerciseId: string;
  taskId?: string;
  skill: PracticeSkill;
  level: BankLevel;
  /** 0–1 */
  score: number;
  at: string;
}
