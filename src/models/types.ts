/**
 * Core domain models for LevelUp Language.
 *
 * Everything here is plain, JSON-serialisable data so it can be stored in
 * localStorage today and in a backend (Supabase / PostgreSQL) later without
 * changes. Dates are ISO calendar dates (`YYYY-MM-DD`) in the learner's local
 * time zone; timestamps are full ISO strings.
 */

/** CEFR levels. `A0` = absolute beginner (pre-A1), only valid as a starting level. */
export type CefrLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar';

export type Skill = 'listening' | 'reading' | 'speaking' | 'writing' | 'vocabulary' | 'grammar';

export type ResourceType =
  | 'podcast'
  | 'video'
  | 'article'
  | 'graded-reader'
  | 'flashcards'
  | 'shadowing'
  | 'writing-prompt'
  | 'grammar-drill'
  | 'conversation'
  | 'self-talk'
  | 'quiz'
  | 'review';

export type Goal = 'travel' | 'work' | 'exam' | 'conversation' | 'reading';

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO timestamp

export type SkillMap<T = number> = Record<Skill, T>;

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  name?: string;
  language: LanguageCode;
  currentLevel: CefrLevel;
  /** Must be strictly higher than `currentLevel`. */
  targetLevel: CefrLevel;
  durationWeeks: number;
  /** Minutes per day the learner can study. */
  dailyMinutes: number;
  goal: Goal;
  /** e.g. "DELE", "DELF", "TOEFL", "IELTS" when goal === 'exam'. */
  examName?: string;
  startDate: ISODate;
  /** How the current level was determined. */
  levelSource: 'self-assessed' | 'placement-quiz';
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type TaskKind = 'practice' | 'review' | 'milestone';

export interface Task {
  /** Stable id – progress is keyed on it, so it must survive rescheduling. */
  id: string;
  title: string;
  skill: Skill;
  minutes: number;
  instructions: string;
  resourceType: ResourceType;
  kind: TaskKind;
}

export type DayType = 'study' | 'review' | 'milestone';

export interface Day {
  id: string;
  date: ISODate;
  /** 0-based position in the whole plan. */
  index: number;
  type: DayType;
  /** Short human label for the day's theme, e.g. "Food & restaurants". */
  focus: string;
  tasks: Task[];
  /** Set when tasks were moved away from this day by a reschedule. */
  rescheduledFrom?: boolean;
}

export interface Week {
  id: string;
  /** 0-based position inside its phase. */
  index: number;
  theme: string;
  days: Day[];
}

export interface Phase {
  id: string;
  index: number;
  fromLevel: CefrLevel;
  toLevel: CefrLevel;
  /** Study hours allocated to this phase. */
  hours: number;
  /** Relative focus per skill (sums to 1). Adjusted after milestone tests. */
  skillWeights: SkillMap;
  weeks: Week[];
  /** Id of the day holding this phase's milestone test. */
  milestoneDayId: string;
}

export type FeasibilityStatus = 'realistic' | 'ambitious' | 'unrealistic';

export interface FeasibilitySuggestion {
  kind: 'extend-duration' | 'increase-daily-time' | 'closer-target';
  label: string;
  /** Partial profile that applies the suggestion. */
  patch: Partial<Pick<UserProfile, 'durationWeeks' | 'dailyMinutes' | 'targetLevel'>>;
}

export interface FeasibilityResult {
  status: FeasibilityStatus;
  requiredHours: number;
  availableHours: number;
  /** availableHours / requiredHours */
  ratio: number;
  /** Per level step, e.g. [{from:'A2',to:'B1',hours:216}] */
  steps: { from: CefrLevel; to: CefrLevel; hours: number }[];
  /** Highest level reachable with the hours available. */
  reachableLevel: CefrLevel;
  message: string;
  suggestions: FeasibilitySuggestion[];
}

export interface Plan {
  id: string;
  profileId: string;
  createdAt: ISODateTime;
  startDate: ISODate;
  endDate: ISODate;
  phases: Phase[];
  feasibility: FeasibilityResult;
  /** Which generator produced the content. */
  generator: 'rule-based' | 'ai';
  /** Incremented every time the plan is modified (reschedule / adaptation). */
  revision: number;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface MilestoneResult {
  phaseId: string;
  takenAt: ISODateTime;
  /** 0–100 per skill. */
  skillScores: SkillMap;
  overall: number;
  passed: boolean;
  weakSkills: Skill[];
}

export interface PlanEvent {
  at: ISODateTime;
  type: 'created' | 'rescheduled-extend' | 'rescheduled-redistribute' | 'adapted';
  detail: string;
}

export interface ProgressLog {
  planId: string;
  /** taskId → local date (YYYY-MM-DD) the task was ticked. */
  completedTasks: Record<string, ISODate>;
  milestoneResults: MilestoneResult[];
  events: PlanEvent[];
}
