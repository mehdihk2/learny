/**
 * Answer checking helpers. Learners type on phones without accent keys and
 * speech recognition drops punctuation, so comparisons are forgiving.
 */

/** Lowercase, strip accents, punctuation (incl. ¿¡) and extra spaces. */
export function normalize(text: string, { keepAccents = false } = {}): string {
  let t = text.toLowerCase().normalize('NFD');
  if (!keepAccents) t = t.replace(/\p{M}/gu, '');
  else t = t.normalize('NFC');
  return t
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Levenshtein distance over arrays (works for characters or words). */
export function editDistance<T>(a: T[], b: T[]): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** 0–1 similarity between two sentences, word by word. */
export function sentenceSimilarity(expected: string, actual: string): number {
  const e = words(expected);
  const a = words(actual);
  if (e.length === 0) return a.length === 0 ? 1 : 0;
  return Math.max(0, 1 - editDistance(e, a) / Math.max(e.length, a.length));
}

/** Per-word diff for feedback: which expected words were heard/typed. */
export function wordMatches(expected: string, actual: string): { word: string; ok: boolean }[] {
  const got = new Set(words(actual));
  return expected
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w, ok: got.has(normalize(w)) }));
}

export type GapResult = 'correct' | 'almost' | 'wrong';

/**
 * Check one gap. A right answer with missing/wrong accents is accepted but
 * flagged ("almost") so the learner can learn the spelling.
 */
export function checkGap(input: string, accepted: string[]): GapResult {
  const exact = normalize(input, { keepAccents: true });
  if (accepted.some((a) => normalize(a, { keepAccents: true }) === exact)) return 'correct';
  const loose = normalize(input);
  if (loose && accepted.some((a) => normalize(a) === loose)) return 'almost';
  // Allow one typo on longer words.
  if (loose.length >= 6 && accepted.some((a) => editDistance([...normalize(a)], [...loose]) <= 1)) return 'almost';
  return 'wrong';
}

/** Share of target words/phrases found in a spoken or written answer. */
export function targetCoverage(targets: string[], answer: string): { used: string[]; score: number } {
  const said = ` ${normalize(answer)} `;
  const used = targets.filter((t) => said.includes(` ${normalize(t)} `));
  return { used, score: targets.length ? used.length / targets.length : 1 };
}
