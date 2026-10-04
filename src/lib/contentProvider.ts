import type { CefrLevel, DayType, ResourceType, Skill, UserProfile } from '../models/types';
import { resolveLevelContent, type LevelContent, type TargetLevel, type TaskTemplate } from '../content';
import { languageName, SKILL_LABELS } from './cefr';

/**
 * What a slot in a day is for. The generator decides the role, skill and
 * minutes; a content provider decides the actual title/instructions.
 */
export type SlotRole = 'warmup' | 'practice' | 'exam' | 'review' | 'milestone' | 'reflection';

export interface SlotContext {
  profile: UserProfile;
  phase: { index: number; fromLevel: CefrLevel; toLevel: TargetLevel; isFinal: boolean };
  dayType: DayType;
  weekIndex: number;
  dayIndexInPhase: number;
  topic: string;
  grammar: string;
  skill: Skill;
  minutes: number;
  role: SlotRole;
  /** How many times this skill was already used in this phase (for rotating templates). */
  occurrence: number;
}

export interface TaskContent {
  title: string;
  instructions: string;
  resourceType: ResourceType;
}

/**
 * Produces the text of a task for a slot. Implementations must be pure &
 * synchronous so `generatePlan` stays a pure function. Richer AI-generated
 * content is layered on afterwards via `PlanEnricher` (see services/ai).
 */
export interface TaskContentProvider {
  readonly id: string;
  buildTask(ctx: SlotContext): TaskContent;
}

export function fillTemplate(text: string, ctx: SlotContext): string {
  return text
    .replaceAll('{language}', languageName(ctx.profile.language))
    .replaceAll('{topic}', ctx.topic)
    .replaceAll('{grammar}', ctx.grammar)
    .replaceAll('{level}', ctx.phase.toLevel)
    .replaceAll('{exam}', ctx.profile.examName?.trim() || 'your exam');
}

function fromTemplate(t: TaskTemplate, ctx: SlotContext): TaskContent {
  return { title: fillTemplate(t.title, ctx), instructions: fillTemplate(t.instructions, ctx), resourceType: t.resourceType };
}

const REVIEW_TEMPLATES: Record<Skill, TaskTemplate> = {
  vocabulary: {
    title: 'Weekly review: flashcards',
    instructions: 'Review every card you added this week. Mark the ones you keep forgetting and write a new example sentence for each.',
    resourceType: 'flashcards',
  },
  listening: {
    title: 'Re-listen to your favourite audio',
    instructions: 'Replay the best listening piece of the week. Notice how much more you understand than the first time.',
    resourceType: 'review',
  },
  grammar: {
    title: 'Grammar recap: {grammar}',
    instructions: 'Re-read your notes on {grammar} and redo the exercises you got wrong. Update your error log.',
    resourceType: 'grammar-drill',
  },
  speaking: {
    title: 'Weekly recap out loud',
    instructions: 'Talk for 2–3 minutes about {topic} using the words and structures you learned this week. Record it and compare with last week.',
    resourceType: 'self-talk',
  },
  writing: {
    title: 'Write a weekly summary',
    instructions: 'Write a short paragraph in {language} about what you learned this week and what you want to improve next week.',
    resourceType: 'writing-prompt',
  },
  reading: {
    title: 'Re-read & retell',
    instructions: 'Re-read one text from this week, then retell it from memory in {language} (spoken or written).',
    resourceType: 'review',
  },
};

/** Default provider: rule-based templates per CEFR level and language. */
export const ruleBasedProvider: TaskContentProvider = {
  id: 'rule-based',
  buildTask(ctx) {
    switch (ctx.role) {
      case 'warmup':
        return {
          title: 'Daily flashcard warm-up',
          instructions: 'Review all due cards in your spaced-repetition app (Anki, Quizlet…). Say each word out loud before flipping the card.',
          resourceType: 'flashcards',
        };
      case 'review':
        return fromTemplate(REVIEW_TEMPLATES[ctx.skill], ctx);
      case 'milestone':
        return {
          title: ctx.phase.isFinal ? `Final test: are you ${ctx.phase.toLevel} yet? 🏁` : `Milestone test: ${ctx.phase.fromLevel} → ${ctx.phase.toLevel}`,
          instructions:
            'Take the milestone test in the app. It checks every skill and adapts the next phase of your plan to focus on what needs more work.',
          resourceType: 'quiz',
        };
      case 'reflection':
        return {
          title: 'Reflect & celebrate',
          instructions: `Write down three things you can do now in ${languageName(ctx.profile.language)} that you couldn't at the start of this phase. You earned it! 🎉`,
          resourceType: 'writing-prompt',
        };
      case 'exam':
        return {
          title: `Exam practice: ${SKILL_LABELS[ctx.skill]} (${ctx.profile.examName?.trim() || 'exam'} ${ctx.phase.toLevel})`,
          instructions: fillTemplate(
            `Do one ${SKILL_LABELS[ctx.skill].toLowerCase()} section from an official {exam} {level} sample paper under timed conditions. Check your answers and note the question types that cost you points.`,
            ctx,
          ),
          resourceType: 'quiz',
        };
      case 'practice': {
        const content: LevelContent = resolveLevelContent(ctx.profile.language, ctx.phase.toLevel);
        const list = content.templates[ctx.skill] ?? [];
        if (list.length === 0) {
          return { title: `${SKILL_LABELS[ctx.skill]} practice`, instructions: fillTemplate('Practise {topic}.', ctx), resourceType: 'review' };
        }
        return fromTemplate(list[ctx.occurrence % list.length], ctx);
      }
    }
  },
};
