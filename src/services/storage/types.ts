import type { Plan, ProgressLog, UserProfile } from '../../models/types';

/**
 * Persistence boundary. v1 ships a localStorage implementation; a backend
 * (Supabase, Node/Express + PostgreSQL…) only needs to implement this
 * interface — the rest of the app never touches storage directly.
 *
 * Suggested SQL mapping:
 *   profiles(id, ...UserProfile fields)
 *   plans(id, profile_id, revision, data jsonb)      -- phases/weeks/days as JSON
 *   task_completions(plan_id, task_id, completed_on)  -- ProgressLog.completedTasks
 *   milestone_results(plan_id, phase_id, ...)         -- ProgressLog.milestoneResults
 *   plan_events(plan_id, at, type, detail)            -- ProgressLog.events
 */
export interface StorageAdapter {
  loadProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  loadPlan(): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<void>;
  loadProgress(): Promise<ProgressLog | null>;
  saveProgress(progress: ProgressLog): Promise<void>;
  clear(): Promise<void>;
}
