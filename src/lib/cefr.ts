import type { CefrLevel, Goal, LanguageCode, Skill, SkillMap } from '../models/types';

export const LEVELS: CefrLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Levels a learner can pick as "current" in the UI (A0 = complete beginner). */
export const CURRENT_LEVEL_OPTIONS: CefrLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];
export const TARGET_LEVEL_OPTIONS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LEVEL_LABELS: Record<CefrLevel, string> = {
  A0: 'Complete beginner',
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper intermediate',
  C1: 'Advanced',
  C2: 'Mastery',
};

export const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A0: "I'm starting from scratch.",
  A1: 'I can use familiar everyday expressions and very basic phrases.',
  A2: 'I can handle simple, routine exchanges on familiar topics.',
  B1: 'I can deal with most travel situations and talk about experiences.',
  B2: 'I can interact fluently with native speakers on a wide range of topics.',
  C1: 'I can express myself spontaneously and use the language flexibly at work.',
  C2: 'I understand virtually everything and express myself with precision.',
};

/**
 * Guided-learning hours needed to move from the previous level to this one,
 * for a language close to English (Spanish, French, Italian, Portuguese…).
 *
 * Derived from Cambridge English / Alliance Française guided-learning-hour
 * estimates (cumulative ≈ A1 90h, A2 190h, B1 375h, B2 575h, C1 775h, C2 1050h),
 * i.e. roughly 100–250 h per level step.
 */
export const STEP_HOURS: Record<Exclude<CefrLevel, 'A0'>, number> = {
  A1: 90,
  A2: 100,
  B1: 185,
  B2: 200,
  C1: 200,
  C2: 275,
};

/**
 * Relative difficulty for an English-speaking learner, loosely based on the
 * US Foreign Service Institute language categories.
 */
export const LANGUAGE_DIFFICULTY: Record<LanguageCode, number> = {
  en: 1,
  es: 1,
  fr: 1,
  it: 1,
  pt: 1,
  de: 1.2,
  ru: 1.6,
  ja: 2.2,
  zh: 2.2,
  ko: 2.2,
  ar: 2.2,
};

export const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export const SKILLS: Skill[] = ['listening', 'reading', 'speaking', 'writing', 'vocabulary', 'grammar'];

export const SKILL_LABELS: Record<Skill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
};

export const GOALS: { id: Goal; label: string; emoji: string; description: string }[] = [
  { id: 'travel', label: 'Travel', emoji: '✈️', description: 'Get around, order food, make friends on the road.' },
  { id: 'work', label: 'Work', emoji: '💼', description: 'Meetings, emails and professional conversations.' },
  { id: 'exam', label: 'Exam', emoji: '🎓', description: 'DELE, DELF, Goethe, TOEFL, IELTS, JLPT…' },
  { id: 'conversation', label: 'Conversation', emoji: '💬', description: 'Speak confidently and naturally.' },
  { id: 'reading', label: 'Reading', emoji: '📚', description: 'Enjoy books, news and articles.' },
];

/** Baseline skill focus per goal (each sums to 1). */
export const GOAL_SKILL_WEIGHTS: Record<Goal, SkillMap> = {
  travel: { listening: 0.22, reading: 0.1, speaking: 0.26, writing: 0.07, vocabulary: 0.22, grammar: 0.13 },
  work: { listening: 0.18, reading: 0.15, speaking: 0.2, writing: 0.17, vocabulary: 0.15, grammar: 0.15 },
  exam: { listening: 0.17, reading: 0.17, speaking: 0.16, writing: 0.17, vocabulary: 0.15, grammar: 0.18 },
  conversation: { listening: 0.25, reading: 0.08, speaking: 0.3, writing: 0.05, vocabulary: 0.2, grammar: 0.12 },
  reading: { listening: 0.12, reading: 0.32, speaking: 0.08, writing: 0.1, vocabulary: 0.23, grammar: 0.15 },
};

export function levelIndex(level: CefrLevel): number {
  return LEVELS.indexOf(level);
}

export function isHigher(a: CefrLevel, b: CefrLevel): boolean {
  return levelIndex(a) > levelIndex(b);
}

/** The ordered level steps between two levels, e.g. A2→B2 = [[A2,B1],[B1,B2]]. */
export function levelSteps(from: CefrLevel, to: CefrLevel): [CefrLevel, CefrLevel][] {
  const steps: [CefrLevel, CefrLevel][] = [];
  for (let i = levelIndex(from); i < levelIndex(to); i++) {
    steps.push([LEVELS[i], LEVELS[i + 1]]);
  }
  return steps;
}

export function stepHours(to: CefrLevel, language: LanguageCode): number {
  if (to === 'A0') return 0;
  return Math.round(STEP_HOURS[to] * LANGUAGE_DIFFICULTY[language]);
}
