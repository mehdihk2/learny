import { describe, expect, it } from 'vitest';
import { BANK_LEVELS, exerciseBank, exercisesFor, hasFullExerciseBank, toBankLevel } from '../content/exercises';
import { checkGap, normalize, sentenceSimilarity, targetCoverage, wordMatches } from './check';
import { buildSession, seededRandom, shuffle } from './select';
import { isDue, review } from './srs';
import { EXERCISE_MINUTES, PRACTICE_SKILLS, type Exercise } from './types';

describe('check', () => {
  it('normalises case, accents and Spanish punctuation', () => {
    expect(normalize('¿Dónde está el BAÑO?')).toBe('donde esta el bano');
    expect(normalize('¿Dónde está?', { keepAccents: true })).toBe('dónde está');
  });

  it('accepts exact answers and flags missing accents', () => {
    expect(checkGap('está', ['está'])).toBe('correct');
    expect(checkGap(' Está ', ['está'])).toBe('correct');
    expect(checkGap('esta', ['está'])).toBe('almost');
    expect(checkGap('es', ['está'])).toBe('wrong');
    expect(checkGap('', ['está'])).toBe('wrong');
  });

  it('tolerates one typo on long words only', () => {
    expect(checkGap('vivimis', ['vivimos'])).toBe('almost');
    expect(checkGap('sio', ['soy'])).toBe('wrong');
  });

  it('accepts alternatives and contractions', () => {
    expect(checkGap("doesn't", ["doesn't", 'does not'])).toBe('correct');
    expect(checkGap('does not', ["doesn't", 'does not'])).toBe('correct');
  });

  it('scores sentence similarity word by word', () => {
    expect(sentenceSimilarity('Hola, me llamo Pablo.', 'hola me llamo pablo')).toBe(1);
    expect(sentenceSimilarity('Hola, me llamo Pablo.', 'hola me llamo')).toBe(0.75);
    expect(sentenceSimilarity('Hola', '')).toBe(0);
  });

  it('marks which expected words were said', () => {
    expect(wordMatches('Me gusta el café', 'me gusta el te')).toEqual([
      { word: 'Me', ok: true },
      { word: 'gusta', ok: true },
      { word: 'el', ok: true },
      { word: 'café', ok: false },
    ]);
  });

  it('measures coverage of target phrases', () => {
    const r = targetCoverage(['me llamo', 'soy de', 'vivo en'], 'Hola, me llamo Ana y vivo en París');
    expect(r.used).toEqual(['me llamo', 'vivo en']);
    expect(r.score).toBeCloseTo(2 / 3);
  });
});

describe('srs', () => {
  it('moves cards up the boxes and resets on failure', () => {
    let s = review(undefined, 'good', '2026-01-01');
    expect(s).toMatchObject({ box: 1, due: '2026-01-03', reviews: 1 });
    s = review(s, 'good', '2026-01-03');
    expect(s).toMatchObject({ box: 2, due: '2026-01-07' });
    s = review(s, 'again', '2026-01-07');
    expect(s).toMatchObject({ box: 0, due: '2026-01-08', lapses: 1 });
  });

  it('easy skips a box; hard keeps it with a shorter interval', () => {
    expect(review(undefined, 'easy', '2026-01-01').box).toBe(2);
    const hard = review({ box: 3, due: '2026-01-01', reviews: 3, lapses: 0 }, 'hard', '2026-01-01');
    expect(hard.box).toBe(3);
    expect(hard.due).toBe('2026-01-05');
  });

  it('knows when a card is due', () => {
    expect(isDue(undefined, '2026-01-01')).toBe(true);
    expect(isDue({ box: 1, due: '2026-01-03', reviews: 1, lapses: 0 }, '2026-01-02')).toBe(false);
    expect(isDue({ box: 1, due: '2026-01-03', reviews: 1, lapses: 0 }, '2026-01-03')).toBe(true);
  });
});

describe('exercise banks', () => {
  for (const language of ['es', 'en'] as const) {
    describe(language, () => {
      const bank = exerciseBank(language);

      it('has unique ids', () => {
        const ids = bank.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('covers every level and practice skill', () => {
        for (const level of BANK_LEVELS) {
          for (const skill of PRACTICE_SKILLS) {
            expect(exercisesFor(language, level, skill).length, `${level} ${skill}`).toBeGreaterThanOrEqual(4);
          }
          expect(exercisesFor(language, level).filter((e) => e.type === 'listening').length).toBeGreaterThanOrEqual(2);
          expect(exercisesFor(language, level).filter((e) => e.type === 'speak').length).toBeGreaterThanOrEqual(4);
        }
      });

      it('has well-formed exercises', () => {
        for (const e of bank) {
          switch (e.type) {
            case 'mcq':
              expect(e.options[e.answer], e.id).toBeDefined();
              expect(new Set(e.options).size, e.id).toBe(e.options.length);
              break;
            case 'cloze':
              expect((e.sentence.match(/___/g) ?? []).length, e.id).toBe(e.answers.length);
              e.answers.forEach((alts) => expect(alts.length, e.id).toBeGreaterThan(0));
              break;
            case 'order':
              expect(e.words.length, e.id).toBeGreaterThanOrEqual(4);
              break;
            case 'listening':
              expect(e.lines.length, e.id).toBeGreaterThanOrEqual(3);
              e.questions.forEach((q) => expect(q.options[q.answer], e.id).toBeDefined());
              break;
            case 'flashcard':
              expect(e.term && e.meaning, e.id).toBeTruthy();
              break;
            case 'speak':
              expect(e.seconds, e.id).toBeGreaterThan(0);
              break;
          }
        }
      });
    });
  }

  it('gives other languages generic speaking prompts', () => {
    expect(hasFullExerciseBank('ja')).toBe(false);
    const ja = exerciseBank('ja');
    expect(ja.length).toBeGreaterThan(0);
    expect(ja.every((e) => e.type === 'speak' && e.language === 'ja')).toBe(true);
  });

  it('maps A0/C2 onto the bank', () => {
    expect(toBankLevel('A0')).toBe('A1');
    expect(toBankLevel('C2')).toBe('C1');
    expect(toBankLevel('B1')).toBe('B1');
  });
});

describe('buildSession', () => {
  const base = { language: 'es' as const, level: 'B1' as const, fromLevel: 'A2' as const, minutes: 15, mode: 'practice' as const, seed: 'p0-w0-d1-t1', today: '2026-01-05' };
  const minutes = (xs: Exercise[]) => xs.reduce((s, e) => s + EXERCISE_MINUTES[e.type], 0);

  it('is deterministic for the same seed and varies across seeds', () => {
    const a = buildSession({ ...base, skill: 'grammar' }).map((e) => e.id);
    expect(buildSession({ ...base, skill: 'grammar' }).map((e) => e.id)).toEqual(a);
    expect(buildSession({ ...base, skill: 'grammar', seed: 'other' }).map((e) => e.id)).not.toEqual(a);
  });

  it('builds a non-empty session for every skill and level', () => {
    for (const language of ['es', 'en'] as const) {
      for (const level of BANK_LEVELS) {
        for (const skill of PRACTICE_SKILLS) {
          const s = buildSession({ ...base, language, level, fromLevel: level, skill });
          expect(s.length, `${language} ${level} ${skill}`).toBeGreaterThan(0);
          expect(s.every((e) => e.skill === skill || (skill === 'listening' && e.type === 'mcq'))).toBe(true);
        }
      }
    }
  });

  it('roughly fills the task time', () => {
    for (const skill of PRACTICE_SKILLS) {
      const s = buildSession({ ...base, skill, minutes: 15 });
      expect(minutes(s), skill).toBeLessThanOrEqual(15 + 4);
    }
    expect(minutes(buildSession({ ...base, skill: 'grammar', minutes: 30 }))).toBeGreaterThan(minutes(buildSession({ ...base, skill: 'grammar', minutes: 5 })));
  });

  it('prefers exercises not done yet', () => {
    const first = buildSession({ ...base, skill: 'grammar', minutes: 5 });
    const history = Object.fromEntries(first.map((e) => [e.id, 1]));
    const second = buildSession({ ...base, skill: 'grammar', minutes: 5, history });
    expect(second.some((e) => first.some((f) => f.id === e.id))).toBe(false);
  });

  it('review mode starts with the weakest exercises', () => {
    const pool = exercisesFor('es', 'A2', 'grammar');
    const history = Object.fromEntries(pool.map((e, i) => [e.id, i === 4 ? 0.1 : 0.9]));
    const s = buildSession({ ...base, level: 'A2', skill: 'grammar', mode: 'review', history });
    expect(s[0].id).toBe(pool[4].id);
  });

  it('vocabulary sessions introduce cards then quiz them', () => {
    const s = buildSession({ ...base, skill: 'vocabulary' });
    expect(s[0].type).toBe('flashcard');
    expect(s.some((e) => e.type === 'match')).toBe(true);
    const mcq = s.find((e) => e.type === 'mcq');
    if (mcq?.type === 'mcq') expect(mcq.options).toHaveLength(4);
  });

  it('warm-up reviews due cards first, then a few new ones', () => {
    const card = exercisesFor('es', 'A2', 'vocabulary')[0];
    const notDue = exercisesFor('es', 'A2', 'vocabulary')[1];
    const srs = {
      [card.id]: { box: 2, due: '2026-01-04', reviews: 2, lapses: 0 },
      [notDue.id]: { box: 3, due: '2026-02-01', reviews: 3, lapses: 0 },
    };
    const s = buildSession({ ...base, skill: 'vocabulary', mode: 'warmup', minutes: 5, srs });
    expect(s[0].id).toBe(card.id);
    expect(s.some((e) => e.id === notDue.id)).toBe(false);
    expect(s.every((e) => e.type === 'flashcard')).toBe(true);
  });

  it('speaking sessions mix listen-and-repeat with a free prompt', () => {
    const s = buildSession({ ...base, skill: 'speaking', minutes: 10 });
    expect(s.some((e) => e.type === 'repeat')).toBe(true);
    expect(s.some((e) => e.type === 'speak')).toBe(true);
  });

  it('listening sessions use dialogues and dictations', () => {
    const s = buildSession({ ...base, skill: 'listening', minutes: 15 });
    expect(s[0].type).toBe('listening');
    expect(s.some((e) => e.type === 'dictation')).toBe(true);
  });

  it('only offers speaking for languages without a full bank', () => {
    expect(buildSession({ ...base, language: 'ja', skill: 'speaking' }).length).toBeGreaterThan(0);
    expect(buildSession({ ...base, language: 'ja', skill: 'grammar' })).toEqual([]);
  });

  it('seeded shuffle is a permutation', () => {
    const xs = [1, 2, 3, 4, 5, 6];
    expect(shuffle(xs, seededRandom('x')).sort()).toEqual(xs);
  });
});

describe('applyPracticeResults', () => {
  it('keeps best scores, schedules cards and ticks the task', async () => {
    const { applyPracticeResults, sessionScore } = await import('./practice');
    const p0 = { planId: 'p', completedTasks: {}, milestoneResults: [], events: [], exerciseScores: { a: 0.9 } };
    const p1 = applyPracticeResults(p0, 'task-1', { scores: { a: 0.5, b: 1 }, srs: { card: 'good' } }, '2026-01-05');
    expect(p1.exerciseScores).toEqual({ a: 0.9, b: 1 });
    expect(p1.srs?.card).toMatchObject({ box: 1, due: '2026-01-07' });
    expect(p1.completedTasks).toEqual({ 'task-1': '2026-01-05' });
    expect(p0.completedTasks).toEqual({});
    // Doing it again later doesn't move the completion date.
    expect(applyPracticeResults(p1, 'task-1', { scores: {}, srs: {} }, '2026-01-09').completedTasks['task-1']).toBe('2026-01-05');
    expect(sessionScore({ scores: { a: 1, b: 0.5 }, srs: {} })).toBe(75);
  });
});
