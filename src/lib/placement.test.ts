import { describe, expect, it } from 'vitest';
import { placementQuiz } from '../content/placement';
import { scorePlacement } from './placement';

describe('placementQuiz', () => {
  it('has 10–15 questions for every language', () => {
    for (const lang of ['es', 'en', 'fr', 'ja'] as const) {
      const q = placementQuiz(lang);
      expect(q.length).toBeGreaterThanOrEqual(10);
      expect(q.length).toBeLessThanOrEqual(15);
    }
  });

  it('has valid answer indices', () => {
    for (const q of [...placementQuiz('es'), ...placementQuiz('en')]) {
      if (q.kind === 'mcq') expect(q.options[q.answer]).toBeDefined();
    }
  });
});

describe('scorePlacement', () => {
  const quiz = placementQuiz('es');
  const correctUpTo = (levels: string[]) =>
    Object.fromEntries(quiz.filter((q) => q.kind === 'mcq' && levels.includes(q.level)).map((q) => [q.id, q.kind === 'mcq' ? q.answer : 0]));

  it('returns A0 when nothing is right', () => {
    expect(scorePlacement(quiz, {})).toBe('A0');
  });

  it('returns the highest consecutively passed level', () => {
    expect(scorePlacement(quiz, correctUpTo(['A1', 'A2']))).toBe('A2');
    expect(scorePlacement(quiz, correctUpTo(['A1', 'A2', 'B1']))).toBe('B1');
  });

  it('does not skip a failed level', () => {
    expect(scorePlacement(quiz, correctUpTo(['A1', 'B1', 'B2']))).toBe('A1');
  });

  it('caps at C1 so there is always a higher target', () => {
    expect(scorePlacement(quiz, correctUpTo(['A1', 'A2', 'B1', 'B2', 'C1']))).toBe('C1');
  });

  it('scores self-assessment ratings', () => {
    const self = placementQuiz('fr');
    const answers = Object.fromEntries(self.map((q) => [q.id, ['A1', 'A2'].includes(q.level) ? 3 : q.level === 'B1' ? 2 : 0]));
    expect(scorePlacement(self, answers)).toBe('B1');
  });
});
