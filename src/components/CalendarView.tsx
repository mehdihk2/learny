import { useMemo, useState } from 'react';
import type { Day, ISODate, Plan, ProgressLog } from '../models/types';
import { addDays, dayOfWeek } from '../lib/dates';
import { allDays } from '../lib/planGenerator';
import { activeDates, dayCompletion } from '../lib/progress';
import { cx } from './ui';

type CellState = 'done' | 'partial' | 'missed' | 'upcoming' | 'none';

const CELL: Record<CellState, string> = {
  done: 'bg-emerald-500 text-white',
  partial: 'bg-amber-200 text-amber-900',
  missed: 'bg-rose-100 text-rose-700',
  upcoming: 'bg-slate-100 text-slate-700',
  none: 'text-slate-300',
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthStart(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(month: ISODate, delta: number): ISODate {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

export function CalendarView({ plan, progress, today }: { plan: Plan; progress: ProgressLog; today: ISODate }) {
  const [month, setMonth] = useState(() => monthStart(today < plan.startDate ? plan.startDate : today));

  const byDate = useMemo(() => {
    const map = new Map<ISODate, Day[]>();
    for (const d of allDays(plan)) map.set(d.date, [...(map.get(d.date) ?? []), d]);
    return map;
  }, [plan]);
  const active = useMemo(() => activeDates(progress), [progress]);

  const stateFor = (date: ISODate): { state: CellState; marker?: string } => {
    const days = (byDate.get(date) ?? []).filter((d) => d.tasks.length > 0);
    if (days.length === 0) return { state: active.has(date) ? 'done' : 'none' };
    const marker = days.some((d) => d.type === 'milestone') ? '🏁' : days.some((d) => d.type === 'review') ? '↺' : undefined;
    const completion = days.reduce((s, d) => s + dayCompletion(d, progress), 0) / days.length;
    if (completion >= 1) return { state: 'done', marker };
    if (date > today) return { state: 'upcoming', marker };
    if (completion > 0) return { state: 'partial', marker };
    return { state: date < today ? 'missed' : 'upcoming', marker };
  };

  // Monday-first grid.
  const lead = (dayOfWeek(month) + 6) % 7;
  const nextMonth = shiftMonth(month, 1);
  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = month; d < nextMonth; d = addDays(d, 1)) cells.push(d);

  const title = new Date(`${month}T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const canPrev = month > monthStart(plan.startDate);
  const canNext = nextMonth <= plan.endDate;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <span className="font-semibold capitalize text-slate-800">{title}</span>
        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 font-medium text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const { state, marker } = stateFor(date);
          return (
            <div
              key={date}
              title={`${date}${marker === '🏁' ? ' · milestone test' : marker ? ' · review day' : ''}`}
              className={cx(
                'relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium',
                CELL[state],
                date === today && 'ring-2 ring-brand-600 ring-offset-1',
              )}
            >
              {Number(date.slice(8))}
              {marker && <span className="absolute -right-0.5 -top-1 text-[10px]">{marker}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <Legend className="bg-emerald-500" label="Done" />
        <Legend className="bg-amber-200" label="Partly done" />
        <Legend className="bg-rose-100" label="Missed" />
        <Legend className="bg-slate-100" label="Planned" />
        <span>↺ review · 🏁 milestone</span>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cx('h-3 w-3 rounded', className)} /> {label}
    </span>
  );
}
