import { useState } from 'react';
import type { Phase } from '../models/types';
import { TaskItem } from '../components/TaskItem';
import { Button, Card, cx, formatMinutes, Pill, ProgressBar, SKILL_STYLES } from '../components/ui';
import { navigate } from '../hooks/useHashRoute';
import { SKILL_LABELS, SKILLS } from '../lib/cefr';
import { formatDate } from '../lib/dates';
import { dayCompletion, isTaskDone, phaseProgress } from '../lib/progress';
import { useActivePlan } from '../state/AppState';

export function PlanView() {
  const { plan, progress, today, toggleTask } = useActivePlan();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Your plan</h1>
        <p className="text-slate-600">
          {formatDate(plan.startDate, { month: 'short', day: 'numeric', year: 'numeric' })} →{' '}
          {formatDate(plan.endDate, { month: 'short', day: 'numeric', year: 'numeric' })} · {plan.phases.length} phase
          {plan.phases.length === 1 ? '' : 's'}
        </p>
      </header>
      {plan.phases.map((phase) => (
        <PhaseCard key={phase.id} phase={phase} today={today} progress={progress} onToggle={toggleTask} result={progress.milestoneResults.find((r) => r.phaseId === phase.id)} />
      ))}
    </div>
  );
}

function PhaseCard({
  phase,
  today,
  progress,
  onToggle,
  result,
}: {
  phase: Phase;
  today: string;
  progress: ReturnType<typeof useActivePlan>['progress'];
  onToggle: (id: string) => void;
  result?: { overall: number; passed: boolean };
}) {
  const days = phase.weeks.flatMap((w) => w.days);
  const dates = days.map((d) => d.date).sort();
  const pct = Math.round(phaseProgress(phase, progress) * 100);
  const currentWeek = phase.weeks.find((w) => w.days.some((d) => d.date === today))?.id;
  const [openWeek, setOpenWeek] = useState<string | null>(currentWeek ?? null);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Phase {phase.index + 1}</p>
          <h2 className="text-xl font-extrabold text-slate-900">
            {phase.fromLevel} → {phase.toLevel}
          </h2>
          <p className="text-sm text-slate-500">
            {formatDate(dates[0])} – {formatDate(dates[dates.length - 1])} · {phase.weeks.length} week{phase.weeks.length === 1 ? '' : 's'} · ~{phase.hours} h
          </p>
        </div>
        {result && (
          <Pill className={result.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
            Test: {result.overall}% {result.passed ? '✅' : ''}
          </Pill>
        )}
      </div>
      <ProgressBar value={pct} className="mt-3" />
      <p className="mt-1 text-xs text-slate-500">{pct}% complete</p>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Skill focus</p>
        <div className="flex h-3 overflow-hidden rounded-full">
          {SKILLS.map((s) => (
            <div key={s} className={SKILL_STYLES[s].dot} style={{ width: `${phase.skillWeights[s] * 100}%` }} title={`${SKILL_LABELS[s]} ${Math.round(phase.skillWeights[s] * 100)}%`} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {SKILLS.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={cx('h-2 w-2 rounded-full', SKILL_STYLES[s].dot)} /> {SKILL_LABELS[s]} {Math.round(phase.skillWeights[s] * 100)}%
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {phase.weeks.map((week) => {
          const open = openWeek === week.id;
          const weekTasks = week.days.flatMap((d) => d.tasks);
          const done = weekTasks.filter((t) => isTaskDone(progress, t.id)).length;
          return (
            <li key={week.id} className="rounded-xl border border-slate-200">
              <button type="button" onClick={() => setOpenWeek(open ? null : week.id)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open}>
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold', week.id === currentWeek ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
                  {week.index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{week.theme}</span>
                  <span className="block text-xs text-slate-500">
                    {done}/{weekTasks.length} tasks · {formatDate(week.days[0].date)}
                  </span>
                </span>
                <span className="text-slate-400" aria-hidden>{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <div className="space-y-4 border-t border-slate-100 p-3">
                  {week.days.map((day) => (
                    <div key={day.id}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className={cx('text-sm font-semibold', day.date === today ? 'text-brand-700' : 'text-slate-800')}>
                          {formatDate(day.date)}
                          {day.date === today && ' · Today'}
                          {day.type === 'review' && ' · ↺ Review day'}
                          {day.type === 'milestone' && ' · 🏁 Milestone'}
                        </p>
                        <span className="text-xs text-slate-500">
                          {Math.round(dayCompletion(day, progress) * 100)}% · {formatMinutes(day.tasks.reduce((s, t) => s + t.minutes, 0))}
                        </span>
                      </div>
                      {day.tasks.length === 0 ? (
                        <p className="text-sm italic text-slate-400">Tasks moved to later days.</p>
                      ) : (
                        <ul className="space-y-2">
                          {day.tasks.map((t) => (
                            <TaskItem
                              key={t.id}
                              task={t}
                              done={isTaskDone(progress, t.id)}
                              onToggle={() => onToggle(t.id)}
                              action={
                                t.kind === 'milestone' ? (
                                  <Button variant="ghost" className="px-0" onClick={() => navigate(`/milestone/${phase.id}`)}>
                                    Open the test →
                                  </Button>
                                ) : undefined
                              }
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
