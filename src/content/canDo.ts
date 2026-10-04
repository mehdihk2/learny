import type { Skill } from '../models/types';
import type { TargetLevel } from './types';

/**
 * CEFR-style "can-do" statements used for self-assessment in milestone tests
 * (for skills that can't be auto-graded offline) and in the generic placement
 * check for languages without a dedicated quiz.
 */
export const CAN_DO: Record<TargetLevel, Record<Skill, string>> = {
  A1: {
    listening: 'I can understand slow, clear speech about myself, my family and immediate surroundings.',
    reading: 'I can understand familiar names, words and very simple sentences on signs and posters.',
    speaking: 'I can introduce myself and ask/answer simple questions about familiar topics.',
    writing: 'I can fill in forms and write a short, simple postcard.',
    vocabulary: 'I know basic words for family, food, numbers, days and common objects.',
    grammar: 'I can use the present tense of common verbs and form simple questions.',
  },
  A2: {
    listening: 'I can catch the main point in short, clear messages and announcements.',
    reading: 'I can find specific information in menus, timetables and short personal letters.',
    speaking: 'I can handle short social exchanges and describe my background and routine.',
    writing: 'I can write short notes and a simple personal letter, e.g. a thank-you note.',
    vocabulary: 'I know everyday words for shopping, travel, health, work and hobbies.',
    grammar: 'I can talk about the past and future using basic tenses.',
  },
  B1: {
    listening: 'I can understand the main points of clear speech on work, school or leisure topics.',
    reading: 'I can understand texts with high-frequency everyday or job-related language.',
    speaking: 'I can deal with most travel situations and tell a story or describe an experience.',
    writing: 'I can write simple connected text on familiar topics and personal letters about experiences.',
    vocabulary: 'I can express myself on most everyday topics, sometimes with circumlocution.',
    grammar: 'I can combine past tenses in a narrative and express wishes and opinions.',
  },
  B2: {
    listening: 'I can follow extended speech and complex arguments when the topic is reasonably familiar.',
    reading: 'I can read articles and reports on contemporary problems and contemporary prose.',
    speaking: 'I can interact fluently and spontaneously with native speakers and defend my views.',
    writing: 'I can write clear, detailed text and essays giving reasons for or against a point of view.',
    vocabulary: 'I have a broad vocabulary on general and field-related topics and vary my wording.',
    grammar: 'I use hypothetical and complex structures with good control, making few errors.',
  },
  C1: {
    listening: 'I can understand extended speech even when not clearly structured, and most films without effort.',
    reading: 'I can understand long, complex factual and literary texts, appreciating distinctions of style.',
    speaking: 'I can express myself fluently and spontaneously, using language flexibly for social and professional purposes.',
    writing: 'I can write well-structured, detailed text on complex subjects, choosing an appropriate style.',
    vocabulary: 'I have a broad lexical repertoire, including idioms and colloquialisms.',
    grammar: 'I consistently maintain a high degree of grammatical accuracy; errors are rare.',
  },
  C2: {
    listening: 'I have no difficulty understanding any kind of spoken language, even at fast native speed.',
    reading: 'I can read with ease virtually all forms of written language, including abstract and complex texts.',
    speaking: 'I can take part effortlessly in any conversation and convey finer shades of meaning precisely.',
    writing: 'I can write clear, smoothly flowing, complex texts in an appropriate and effective style.',
    vocabulary: 'I have a very broad repertoire including idiomatic and colloquial expressions with awareness of connotation.',
    grammar: 'I maintain consistent grammatical control of complex language, even while attending to other things.',
  },
};

/** Answer scale for self-assessment questions. */
export const SELF_ASSESSMENT_SCALE = [
  { value: 0, label: 'Not yet' },
  { value: 1, label: 'With difficulty' },
  { value: 2, label: 'Mostly' },
  { value: 3, label: 'Easily' },
] as const;
