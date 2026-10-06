import type { CefrLevel, ISODate, LanguageCode } from '../models/types';
import { BANK_LEVELS, exerciseBank, toBankLevel } from '../content/exercises';
import { isDue, type SrsState } from './srs';
import {
  EXERCISE_MINUTES,
  type BankLevel,
  type Exercise,
  type FlashcardExercise,
  type McqExercise,
  type PracticeSkill,
} from './types';

export type SessionMode = 'practice' | 'warmup' | 'review';

export interface SessionRequest {
  language: LanguageCode;
  /** Level the learner is working towards (phase.toLevel). */
  level: CefrLevel;
  /** Level the phase started from — used as a fallback pool. */
  fromLevel?: CefrLevel;
  skill: PracticeSkill;
  minutes: number;
  mode: SessionMode;
  /** Makes selection deterministic per task (usually the task id). */
  seed: string;
  today: ISODate;
  /** exerciseId → best score so far (0–1). */
  history?: Record<string, number>;
  /** flashcard id → SRS state. */
  srs?: Record<string, SrsState>;
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Derived vocabulary exercises
// ---------------------------------------------------------------------------

function meaningQuiz(card: FlashcardExercise, pool: FlashcardExercise[], rand: () => number): McqExercise {
  const distractors = shuffle(pool.filter((c) => c.id !== card.id), rand).slice(0, 3).map((c) => c.meaning);
  const options = shuffle([card.meaning, ...distractors], rand);
  return {
    id: `${card.id}~meaning`,
    language: card.language,
    level: card.level,
    skill: 'vocabulary',
    type: 'mcq',
    prompt: `What does “${card.term}” mean?`,
    options,
    answer: options.indexOf(card.meaning),
    explanation: card.example,
  };
}

/** "Which word do you hear?" — listening practice built from vocabulary. */
function hearWordQuiz(card: FlashcardExercise, pool: FlashcardExercise[], rand: () => number): McqExercise {
  const distractors = shuffle(pool.filter((c) => c.id !== card.id), rand).slice(0, 3).map((c) => c.term);
  const options = shuffle([card.term, ...distractors], rand);
  return {
    id: `${card.id}~hear`,
    language: card.language,
    level: card.level,
    skill: 'listening',
    type: 'mcq',
    prompt: 'Which word or phrase do you hear?',
    options,
    answer: options.indexOf(card.term),
    audio: card.term,
    explanation: `${card.term} — ${card.meaning}`,
  };
}

// ---------------------------------------------------------------------------
// Session building
// ---------------------------------------------------------------------------

function levelsUpTo(level: BankLevel): BankLevel[] {
  return BANK_LEVELS.slice(0, BANK_LEVELS.indexOf(level) + 1);
}

/**
 * Order a pool: in practice mode unseen exercises first, in review mode the
 * ones with the lowest score first; ties broken by a seeded shuffle.
 */
function prioritise<T extends Exercise>(pool: T[], req: SessionRequest, rand: () => number): T[] {
  const h = req.history ?? {};
  const rank = (e: Exercise) => {
    const s = h[e.id];
    if (req.mode === 'review') return s === undefined ? 2 : s;
    return s === undefined ? 0 : 1 + s;
  };
  return shuffle(pool, rand).sort((a, b) => rank(a) - rank(b));
}

/** Take items until their estimated time fills `minutes` (at least `min` items when available). */
function fill(items: Exercise[], minutes: number, min = 1): Exercise[] {
  const out: Exercise[] = [];
  let used = 0;
  for (const e of items) {
    const cost = EXERCISE_MINUTES[e.type];
    if (out.length >= min && used + cost > minutes) continue;
    out.push(e);
    used += cost;
    if (used >= minutes) break;
  }
  return out;
}

/**
 * Build the list of exercises for one task. Pure and deterministic for a
 * given request, so the same task shows the same session on every device.
 */
export function buildSession(req: SessionRequest): Exercise[] {
  const rand = seededRandom(`${req.seed}:${req.mode}`);
  const level = toBankLevel(req.level);
  const from = req.fromLevel ? toBankLevel(req.fromLevel) : level;
  const bank = exerciseBank(req.language);
  const atLevel = (lvls: BankLevel[]) => bank.filter((e) => lvls.includes(e.level));
  // Review sessions recycle everything learnt so far; practice focuses on the target level.
  const levels = req.mode === 'review' ? levelsUpTo(level) : from === level ? [level] : [level, from];
  const pool = atLevel(levels);
  const cards = (src: Exercise[]) => src.filter((e): e is FlashcardExercise => e.type === 'flashcard');

  switch (req.skill) {
    case 'vocabulary': {
      const allCards = cards(atLevel(levelsUpTo(level)));
      if (allCards.length === 0) return [];
      if (req.mode === 'warmup') {
        const srs = req.srs ?? {};
        const due = shuffle(allCards.filter((c) => srs[c.id] && isDue(srs[c.id], req.today)), rand).sort(
          (a, b) => srs[a.id]!.due.localeCompare(srs[b.id]!.due),
        );
        const fresh = shuffle(cards(pool).filter((c) => !srs[c.id]), rand).slice(0, 5);
        return fill([...due, ...fresh], req.minutes, Math.min(3, due.length + fresh.length));
      }
      const levelCards = cards(pool);
      const chosen = prioritise(levelCards, req, rand).slice(0, Math.max(4, Math.round(req.minutes / 2)));
      const quiz: Exercise[] = [];
      if (chosen.length >= 3) {
        quiz.push({
          id: `${req.seed}~match`,
          language: req.language,
          level,
          skill: 'vocabulary',
          type: 'match',
          pairs: chosen.slice(0, 5).map((c) => [c.term, c.meaning]),
        });
      }
      chosen.forEach((c) => quiz.push(meaningQuiz(c, allCards, rand)));
      return fill([...chosen, ...quiz], req.minutes, chosen.length);
    }
    case 'grammar': {
      return fill(prioritise(pool.filter((e) => e.skill === 'grammar'), req, rand), req.minutes, 3);
    }
    case 'listening': {
      const dialogues = prioritise(pool.filter((e) => e.type === 'listening'), req, rand);
      const dictations = prioritise(pool.filter((e) => e.type === 'dictation'), req, rand);
      const vocab = cards(pool);
      const hear = shuffle(vocab, rand)
        .slice(0, 3)
        .map((c) => hearWordQuiz(c, vocab, rand));
      const ordered = [...dialogues.slice(0, 1), ...dictations.slice(0, 3), ...hear, ...dialogues.slice(1), ...dictations.slice(3)];
      return fill(ordered, req.minutes, Math.min(2, ordered.length));
    }
    case 'speaking': {
      const repeats = prioritise(pool.filter((e) => e.type === 'repeat'), req, rand);
      const prompts = prioritise(pool.filter((e) => e.type === 'speak'), req, rand);
      // Warm up the mouth with a few repeats, then one free-speaking prompt.
      const ordered = [...repeats.slice(0, 3), ...prompts.slice(0, 1), ...repeats.slice(3), ...prompts.slice(1)];
      return fill(ordered, req.minutes, Math.min(2, ordered.length));
    }
  }
}
