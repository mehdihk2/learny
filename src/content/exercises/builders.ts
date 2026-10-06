import type { LanguageCode } from '../../models/types';
import type { BankLevel, Exercise } from '../../exercises/types';

/** Compact authoring format for one level of an exercise bank. */
export interface LevelBankSource {
  /** [term, meaning (English), example sentence] */
  vocab: [string, string, string?][];
  grammar: GrammarSource[];
  /** [text, translation] */
  dictation: [string, string][];
  dialogues: {
    title: string;
    /** Alternating speakers A / B. */
    lines: string[];
    /** [question, options, answerIndex] */
    questions: [string, string[], number][];
  }[];
  /** [text, translation] — listen & repeat */
  repeat: [string, string][];
  speak: { prompt: string; targets: string[]; seconds?: number; model?: string }[];
}

export type GrammarSource =
  | { c: string; a: string | string[] | string[][]; hint?: string; why?: string }
  | { m: string; o: string[]; a: number; why?: string }
  | { order: string; tr: string };

/** Turns `{ c: 'Yo ___ de Madrid.', a: 'soy' }` etc. into typed exercises with stable ids. */
export function buildLevel(language: LanguageCode, level: BankLevel, src: LevelBankSource): Exercise[] {
  const id = (kind: string, i: number) => `${language}-${level.toLowerCase()}-${kind}-${i + 1}`;
  const base = { language, level } as const;
  const out: Exercise[] = [];

  src.vocab.forEach(([term, meaning, example], i) =>
    out.push({ ...base, id: id('v', i), skill: 'vocabulary', type: 'flashcard', term, meaning, example }),
  );

  src.grammar.forEach((g, i) => {
    if ('c' in g) {
      const gaps = (g.c.match(/___/g) ?? []).length;
      const answers: string[][] =
        typeof g.a === 'string' ? [[g.a]] : Array.isArray(g.a[0]) ? (g.a as string[][]) : gaps > 1 ? (g.a as string[]).map((x) => [x]) : [g.a as string[]];
      out.push({ ...base, id: id('g', i), skill: 'grammar', type: 'cloze', sentence: g.c, answers, hint: g.hint, explanation: g.why });
    } else if ('m' in g) {
      out.push({ ...base, id: id('g', i), skill: 'grammar', type: 'mcq', prompt: g.m, options: g.o, answer: g.a, explanation: g.why });
    } else {
      out.push({ ...base, id: id('g', i), skill: 'grammar', type: 'order', words: g.order.split(' '), translation: g.tr });
    }
  });

  src.dictation.forEach(([text, translation], i) =>
    out.push({ ...base, id: id('d', i), skill: 'listening', type: 'dictation', text, translation }),
  );

  src.dialogues.forEach((d, i) =>
    out.push({
      ...base,
      id: id('l', i),
      skill: 'listening',
      type: 'listening',
      title: d.title,
      lines: d.lines.map((text, j) => ({ speaker: j % 2 === 0 ? 'A' : 'B', text })),
      questions: d.questions.map(([prompt, options, answer]) => ({ prompt, options, answer })),
    }),
  );

  src.repeat.forEach(([text, translation], i) =>
    out.push({ ...base, id: id('r', i), skill: 'speaking', type: 'repeat', text, translation }),
  );

  src.speak.forEach((s, i) =>
    out.push({ ...base, id: id('s', i), skill: 'speaking', type: 'speak', prompt: s.prompt, targets: s.targets, seconds: s.seconds ?? 60, modelAnswer: s.model }),
  );

  return out;
}
