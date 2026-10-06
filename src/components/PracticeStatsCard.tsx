import { useEffect, useState } from 'react';
import type { ProgressLog, UserProfile } from '../models/types';
import { PRACTICE_SKILLS } from '../exercises/types';
import { loadStats, type PracticeStats } from '../services/exercises';
import { SKILL_LABELS } from '../lib/cefr';
import { Card, CardTitle, ProgressBar, SKILL_STYLES } from './ui';

export function PracticeStatsCard({ online, profile, progress }: { online: boolean; profile: UserProfile; progress: ProgressLog }) {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const scores = progress.exerciseScores;

  useEffect(() => {
    let cancelled = false;
    loadStats(online, profile, progress).then((s) => !cancelled && setStats(s));
    return () => {
      cancelled = true;
    };
    // Refresh when new exercise results come in.
  }, [online, profile.language, scores]);

  const total = stats ? PRACTICE_SKILLS.reduce((s, k) => s + stats.skills[k].attempts, 0) : 0;

  return (
    <Card>
      <CardTitle>Practice accuracy</CardTitle>
      {!stats ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : total === 0 ? (
        <p className="text-sm text-slate-500">Start the exercises in today's tasks to see how you're doing in each skill.</p>
      ) : (
        <ul className="space-y-3">
          {PRACTICE_SKILLS.map((s) => {
            const st = stats.skills[s];
            return (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">
                    {SKILL_STYLES[s].icon} {SKILL_LABELS[s]}
                  </span>
                  <span className="text-slate-500">
                    {st.average === null ? '—' : `${st.average}%`} <span className="text-xs">· {st.attempts} exercises</span>
                  </span>
                </div>
                <ProgressBar value={st.average ?? 0} color={SKILL_STYLES[s].dot} className="h-1.5" />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
