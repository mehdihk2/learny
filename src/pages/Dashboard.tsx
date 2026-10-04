import { useMemo } from 'react';
import { CalendarView } from '../components/CalendarView';
import { RescheduleBanner } from '../components/RescheduleBanner';
import { TaskItem } from '../components/TaskItem';
import { Button, Card, CardTitle, formatMinutes, ProgressBar } from '../components/ui';
import { navigate } from '../hooks/useHashRoute';
import { languageName, LEVEL_LABELS, SKILL_LABELS } from '../lib/cefr';
import { diffDays, formatDate } from '../lib/dates';
import { allDays, phaseOfDay } from '../lib/planGenerator';
import {
  currentStreak,
  daysOn,
  estimatedLevel,
  isTaskDone,
  longestStreak,
  planStats,
  upcomingMilestones,
} from '../lib/progress';
import { useActivePlan } from '../state/AppState';

const CHEERS = ['You showed up — that\'s what counts.', 'Small steps, big results.', 'Your future self says thanks!', 'Consistency is your superpower.'];

export function Dashboard() {
  const { plan, progress, profile, today, toggleTask, reschedule } = useActivePlan();

  const stats = useMemo(() => planStats(plan, progress), [plan, progress]);
  const level = useMemo(() => estimatedLevel(plan, progress, profile.currentLevel), [plan, progress, profile.currentLevel]);
  const streak = currentStreak(progress, today);
  const best = longestStreak(progress);
  const todayDays = useMemo(() => daysOn(plan, today).filter((d) => d.tasks.length > 0), [plan, today]);
  const todayTasks = todayDays.flatMap((d) => d.tasks);
  const todayDone = todayTasks.filter((t) => isTaskDone(progress, t.id)).length;
  const milestones = useMemo(() => upcomingMilestones(plan, progress, today), [plan, progress, today]);
  const lastResult = progress.milestoneResults.at(-1);

  const days = allDays(plan);
  const beforeStart = today < plan.startDate;
  const afterEnd = today > plan.endDate;
  const dayNumber = diffDays(plan.startDate, today) + 1;
  const totalDays = diffDays(plan.startDate, plan.endDate) + 1;
  const nextDay = beforeStart ? days[0] : undefined;
  const phase = todayDays[0] ? phaseOfDay(plan, todayDays[0].id) : undefined;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {profile.name ? `Hi ${profile.name}!` : 'Hi there!'} <span aria-hidden>👋</span>
        </h1>
        <p className="text-slate-600">
          {beforeStart
            ? `Your ${languageName(profile.language)} plan starts ${formatDate(plan.startDate)}.`
            : afterEnd
              ? `Your plan ended ${formatDate(plan.endDate)}.`
              : `Day ${dayNumber} of ${totalDays} · ${languageName(profile.language)} ${profile.currentLevel} → ${profile.targetLevel}`}
        </p>
      </header>

      <RescheduleBanner plan={plan} progress={progress} today={today} onReschedule={reschedule} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan progress</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.percent}%</p>
          <ProgressBar value={stats.percent} className="mt-2" />
          <p className="mt-2 text-xs text-slate-500">
            {stats.doneTasks} / {stats.totalTasks} tasks · {formatMinutes(stats.doneMinutes)} studied
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated level</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">{level.level}</p>
          <p className="text-xs text-slate-500">{LEVEL_LABELS[level.level]}</p>
          {level.next && (
            <>
              <ProgressBar value={level.progressToNext * 100} className="mt-2 h-1.5" color="bg-brand-500" />
              <p className="mt-1 text-xs text-slate-500">
                {Math.round(level.progressToNext * 100)}% to {level.next}
              </p>
            </>
          )}
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Streak</p>
          <p className="mt-1 text-3xl font-extrabold text-orange-500">
            {streak} <span className="text-2xl" aria-hidden>🔥</span>
          </p>
          <p className="text-xs text-slate-500">{streak === 1 ? 'day' : 'days'} in a row</p>
          <p className="mt-2 text-xs text-slate-500">Best: {best} {best === 1 ? 'day' : 'days'}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle
            action={todayTasks.length > 0 && <span className="text-sm font-medium text-slate-500">{todayDone}/{todayTasks.length}</span>}
          >
            Today's tasks
          </CardTitle>
          {todayTasks.length > 0 ? (
            <>
              {phase && <p className="-mt-2 mb-3 text-sm text-slate-500">{todayDays.map((d) => d.focus).join(' + ')}</p>}
              {todayDone === todayTasks.length && (
                <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-center text-emerald-800">
                  <span className="text-xl" aria-hidden>🎉</span> <strong>Day complete!</strong> {CHEERS[dayNumber % CHEERS.length]}
                </div>
              )}
              <ul className="space-y-2">
                {todayTasks.map((t) => {
                  const p = phaseOfDay(plan, todayDays.find((d) => d.tasks.includes(t))!.id);
                  return (
                    <TaskItem
                      key={t.id}
                      task={t}
                      done={isTaskDone(progress, t.id)}
                      onToggle={() => toggleTask(t.id)}
                      action={
                        t.kind === 'milestone' && p ? (
                          <Button className="w-full sm:w-auto" onClick={() => navigate(`/milestone/${p.id}`)}>
                            Start the test →
                          </Button>
                        ) : undefined
                      }
                    />
                  );
                })}
              </ul>
            </>
          ) : beforeStart && nextDay ? (
            <EmptyState icon="🗓️" title="Get ready!" text={`Your first day (${formatDate(nextDay.date)}) starts with: ${nextDay.tasks.map((t) => t.title).join(', ')}.`} />
          ) : afterEnd ? (
            <EmptyState icon="🏆" title="You reached the end of your plan!" text="Take any remaining milestone tests, or start a new plan to keep levelling up." />
          ) : (
            <EmptyState icon="☕" title="Nothing scheduled today" text="Enjoy the break — or review your flashcards for bonus points." />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Upcoming milestones</CardTitle>
            {milestones.length === 0 ? (
              <p className="text-sm text-slate-500">All milestones passed. Amazing work! 🏆</p>
            ) : (
              <ul className="space-y-2">
                {milestones.slice(0, 3).map(({ phase: p, day, daysAway }) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">{p.toLevel}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {p.fromLevel} → {p.toLevel} test
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(day.date, { weekday: 'short', month: 'short', day: 'numeric', ...(day.date.slice(0, 4) !== today.slice(0, 4) && { year: 'numeric' }) })} ·{' '}
                        {daysAway > 0 ? `in ${daysAway} day${daysAway === 1 ? '' : 's'}` : daysAway === 0 ? 'today' : 'ready to take'}
                      </p>
                    </div>
                    {daysAway <= 0 && (
                      <Button variant="ghost" onClick={() => navigate(`/milestone/${p.id}`)}>
                        Take
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {lastResult && (
              <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                Last test: <strong>{lastResult.overall}%</strong> {lastResult.passed ? '— passed ✅' : '— keep going 💪'}
                {lastResult.weakSkills.length > 0 && <> Next phase adds practice for {lastResult.weakSkills.map((s) => SKILL_LABELS[s].toLowerCase()).join(', ')}.</>}
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Calendar</CardTitle>
            <CalendarView plan={plan} progress={progress} today={today} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="py-6 text-center">
      <div className="text-4xl" aria-hidden>{icon}</div>
      <p className="mt-2 font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}
