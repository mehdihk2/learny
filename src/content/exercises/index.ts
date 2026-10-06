import type { CefrLevel, LanguageCode } from '../../models/types';
import type { BankLevel, Exercise, PracticeSkill } from '../../exercises/types';
import { englishExercises } from './en';
import { spanishExercises } from './es';

/**
 * Speaking prompts usable for any language (the learner answers in the
 * language they are learning). Languages without a full bank still get
 * speaking practice from these.
 */
const GENERIC_SPEAK: Record<BankLevel, [string, number][]> = {
  A1: [
    ['Introduce yourself: name, where you are from, where you live.', 45],
    ['Describe your family or your best friend.', 60],
    ['Say what you like and don’t like eating.', 45],
    ['Describe your house or your room.', 60],
  ],
  A2: [
    ['Talk about what you did last weekend.', 60],
    ['Describe your daily routine from morning to night.', 60],
    ['Talk about your last holiday.', 60],
    ['Explain how to get from your home to the nearest shop.', 45],
  ],
  B1: [
    ['Tell a funny or surprising story from your life.', 90],
    ['Talk about your plans and dreams for the next five years.', 90],
    ['Give your opinion: city life or country life?', 90],
    ['Describe a film or series you enjoyed and recommend it.', 90],
  ],
  B2: [
    ['What would you do if you won the lottery? Justify your choices.', 120],
    ['Discuss the pros and cons of social media.', 120],
    ['Describe a mistake you made and what you would do differently.', 120],
    ['Argue for or against remote work.', 120],
  ],
  C1: [
    ['Present a social issue in your country: causes and solutions.', 180],
    ['Argue convincingly for an unpopular opinion.', 150],
    ['Role-play a negotiation for a pay rise.', 150],
    ['Discuss a book or article that changed your mind.', 150],
  ],
};

const BANK_LEVELS: BankLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function genericSpeaking(language: LanguageCode): Exercise[] {
  return BANK_LEVELS.flatMap((level) =>
    GENERIC_SPEAK[level].map(([prompt, seconds], i) => ({
      id: `${language}-${level.toLowerCase()}-gs-${i + 1}`,
      language,
      level,
      skill: 'speaking' as const,
      type: 'speak' as const,
      prompt,
      targets: [],
      seconds,
    })),
  );
}

const FULL_BANKS: Partial<Record<LanguageCode, Exercise[]>> = {
  es: spanishExercises,
  en: englishExercises,
};

const cache = new Map<LanguageCode, Exercise[]>();

/** Every exercise available for a language. */
export function exerciseBank(language: LanguageCode): Exercise[] {
  let bank = cache.get(language);
  if (!bank) {
    bank = FULL_BANKS[language] ?? genericSpeaking(language);
    cache.set(language, bank);
  }
  return bank;
}

export function hasFullExerciseBank(language: LanguageCode): boolean {
  return Boolean(FULL_BANKS[language]);
}

/** Map any CEFR level onto a bank level (A0 → A1, C2 → C1). */
export function toBankLevel(level: CefrLevel): BankLevel {
  if (level === 'A0') return 'A1';
  if (level === 'C2') return 'C1';
  return level;
}

export function exercisesFor(language: LanguageCode, level: BankLevel, skill?: PracticeSkill): Exercise[] {
  return exerciseBank(language).filter((e) => e.level === level && (!skill || e.skill === skill));
}

export function findExercise(language: LanguageCode, id: string): Exercise | undefined {
  return exerciseBank(language).find((e) => e.id === id);
}

export { BANK_LEVELS };
