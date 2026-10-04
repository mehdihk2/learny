import type { LanguageCode, Skill } from '../models/types';
import { SKILLS } from '../lib/cefr';
import { genericPack } from './packs/generic';
import { spanishPack } from './packs/spanish';
import type { ContentPack, LevelContent, MultipleChoiceQuestion, TargetLevel, TaskTemplate } from './types';

export type { ContentPack, LevelContent, MultipleChoiceQuestion, TargetLevel, TaskTemplate } from './types';

/** Register additional language packs here. */
const PACKS: Partial<Record<LanguageCode, ContentPack>> = {
  es: spanishPack,
};

export function hasDedicatedPack(language: LanguageCode): boolean {
  return Boolean(PACKS[language]);
}

/**
 * Content for a phase that leads to `level` in `language`. Language-specific
 * topics and grammar win; templates are the language-specific ones followed by
 * the generic ones so there is always enough variety.
 */
export function resolveLevelContent(language: LanguageCode, level: TargetLevel): LevelContent {
  const generic = genericPack.levels[level]!;
  const specific = PACKS[language]?.levels[level];
  if (!specific) return generic;

  const templates = {} as Record<Skill, TaskTemplate[]>;
  for (const skill of SKILLS) {
    templates[skill] = [...(specific.templates[skill] ?? []), ...(generic.templates[skill] ?? [])];
  }
  return {
    topics: specific.topics.length ? specific.topics : generic.topics,
    grammar: specific.grammar.length ? specific.grammar : generic.grammar,
    templates,
  };
}

export function milestoneQuestions(language: LanguageCode, level: TargetLevel): MultipleChoiceQuestion[] {
  return PACKS[language]?.milestoneQuestions?.[level] ?? [];
}
