import type { CefrLevel, LanguageCode, ResourceType, Skill } from '../models/types';

/**
 * A task template. Text may contain placeholders that the plan generator fills:
 *   {language} – e.g. "Spanish"
 *   {topic}    – the week's theme, e.g. "Food & restaurants"
 *   {grammar}  – the grammar point of the week
 *   {level}    – the level being worked towards, e.g. "B1"
 *   {exam}     – exam name, or "your exam"
 */
export interface TaskTemplate {
  title: string;
  instructions: string;
  resourceType: ResourceType;
}

/** Content used for a phase that leads *to* a given level. */
export interface LevelContent {
  /** Weekly themes, rotated week by week. */
  topics: string[];
  /** Grammar points, rotated week by week. */
  grammar: string[];
  templates: Partial<Record<Skill, TaskTemplate[]>>;
}

export interface MultipleChoiceQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  skill: Skill;
  level: Exclude<CefrLevel, 'A0'>;
}

export type TargetLevel = Exclude<CefrLevel, 'A0'>;

export interface ContentPack {
  language: LanguageCode | '*';
  levels: Partial<Record<TargetLevel, LevelContent>>;
  /** Auto-graded questions for milestone tests, per level reached. */
  milestoneQuestions?: Partial<Record<TargetLevel, MultipleChoiceQuestion[]>>;
}
