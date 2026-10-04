import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MilestoneResult, Plan, PlanEvent, ProgressLog, UserProfile } from '../models/types';
import { adaptNextPhase, scoreMilestone, type MilestoneAnswers } from '../lib/adaptation';
import { todayISO } from '../lib/dates';
import { generatePlan } from '../lib/planGenerator';
import { emptyProgress, toggleTask as toggleTaskPure } from '../lib/progress';
import { reschedule as reschedulePure, type RescheduleStrategy } from '../lib/reschedule';
import { storage as defaultStorage, type StorageAdapter } from '../services/storage';

interface AppStateValue {
  loading: boolean;
  today: string;
  profile: UserProfile | null;
  plan: Plan | null;
  progress: ProgressLog | null;
  createPlan(profile: UserProfile): void;
  toggleTask(taskId: string): void;
  reschedule(strategy: RescheduleStrategy): void;
  submitMilestone(phaseId: string, answers: MilestoneAnswers): MilestoneResult;
  reset(): void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function event(type: PlanEvent['type'], detail: string): PlanEvent {
  return { at: new Date().toISOString(), type, detail };
}

export function AppStateProvider({ children, storage = defaultStorage }: { children: ReactNode; storage?: StorageAdapter }) {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(todayISO());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [progress, setProgress] = useState<ProgressLog | null>(null);
  const hydrated = useRef(false);

  // Load once.
  useEffect(() => {
    Promise.all([storage.loadProfile(), storage.loadPlan(), storage.loadProgress()]).then(([pr, pl, pg]) => {
      if (pr && pl) {
        setProfile(pr);
        setPlan(pl);
        setProgress(pg && pg.planId === pl.id ? pg : emptyProgress(pl.id));
      }
      hydrated.current = true;
      setLoading(false);
    });
  }, [storage]);

  // Persist on change.
  useEffect(() => {
    if (hydrated.current && profile) void storage.saveProfile(profile);
  }, [profile, storage]);
  useEffect(() => {
    if (hydrated.current && plan) void storage.savePlan(plan);
  }, [plan, storage]);
  useEffect(() => {
    if (hydrated.current && progress) void storage.saveProgress(progress);
  }, [progress, storage]);

  // Keep "today" fresh if the app stays open past midnight.
  useEffect(() => {
    const tick = () => setToday(todayISO());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const createPlan = useCallback((p: UserProfile) => {
    const newPlan = generatePlan(p);
    setProfile(p);
    setPlan(newPlan);
    setProgress({ ...emptyProgress(newPlan.id), events: [event('created', `${p.currentLevel} → ${p.targetLevel} in ${p.durationWeeks} weeks`)] });
  }, []);

  const toggleTask = useCallback(
    (taskId: string) => setProgress((prev) => (prev ? toggleTaskPure(prev, taskId, todayISO()) : prev)),
    [],
  );

  const reschedule = useCallback(
    (strategy: RescheduleStrategy) => {
      if (!plan || !progress) return;
      const next = reschedulePure(plan, progress, today, strategy);
      setPlan(next);
      setProgress({
        ...progress,
        events: [
          ...progress.events,
          event(
            strategy === 'extend' ? 'rescheduled-extend' : 'rescheduled-redistribute',
            strategy === 'extend' ? `Plan extended to ${next.endDate}` : 'Missed tasks spread over upcoming days',
          ),
        ],
      });
    },
    [plan, progress, today],
  );

  const submitMilestone = useCallback(
    (phaseId: string, answers: MilestoneAnswers): MilestoneResult => {
      if (!plan || !progress || !profile) throw new Error('No active plan');
      const result = scoreMilestone(phaseId, answers, new Date().toISOString());
      const adapted = adaptNextPhase(plan, progress, profile, result);
      // Tick the milestone task(s) once the test has been taken.
      const phase = plan.phases.find((p) => p.id === phaseId);
      const msDay = phase?.weeks.flatMap((w) => w.days).find((d) => d.id === phase.milestoneDayId);
      const completedTasks = { ...progress.completedTasks };
      msDay?.tasks.filter((t) => t.kind === 'milestone').forEach((t) => (completedTasks[t.id] ??= todayISO()));
      const events = [...progress.events];
      if (adapted !== plan) {
        events.push(
          event('adapted', result.weakSkills.length ? `Next phase focuses more on: ${result.weakSkills.join(', ')}` : 'Next phase rebalanced'),
        );
      }
      setPlan(adapted);
      setProgress({
        ...progress,
        completedTasks,
        milestoneResults: [...progress.milestoneResults.filter((r) => r.phaseId !== phaseId), result],
        events,
      });
      return result;
    },
    [plan, progress, profile],
  );

  const reset = useCallback(() => {
    void storage.clear();
    setProfile(null);
    setPlan(null);
    setProgress(null);
  }, [storage]);

  const value = useMemo<AppStateValue>(
    () => ({ loading, today, profile, plan, progress, createPlan, toggleTask, reschedule, submitMilestone, reset }),
    [loading, today, profile, plan, progress, createPlan, toggleTask, reschedule, submitMilestone, reset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}

/** For pages that only render when a plan exists. */
export function useActivePlan() {
  const s = useAppState();
  if (!s.plan || !s.progress || !s.profile) throw new Error('No active plan');
  return { ...s, plan: s.plan, progress: s.progress, profile: s.profile };
}
