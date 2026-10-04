import { useMemo, useState } from 'react';
import type { Plan, ProgressLog } from '../models/types';
import { formatDate } from '../lib/dates';
import { previewReschedule, type RescheduleStrategy } from '../lib/reschedule';
import { Button } from './ui';

export function RescheduleBanner({
  plan,
  progress,
  today,
  onReschedule,
}: {
  plan: Plan;
  progress: ProgressLog;
  today: string;
  onReschedule: (s: RescheduleStrategy) => void;
}) {
  const preview = useMemo(() => previewReschedule(plan, progress, today), [plan, progress, today]);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  if (preview.missedDays === 0 || dismissedFor === `${today}:${preview.missedTasks}`) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>🌱</span>
        <div className="flex-1">
          <h2 className="font-bold text-amber-900">
            Life happens! You have {preview.missedTasks} unfinished task{preview.missedTasks === 1 ? '' : 's'} from {preview.missedDays} past day
            {preview.missedDays === 1 ? '' : 's'}.
          </h2>
          <p className="mt-1 text-sm text-amber-800">No guilt — let's adjust the plan so you can pick up right where you left off.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" className="h-auto flex-col items-start py-3 text-left" onClick={() => onReschedule('extend')}>
          <span>📅 Extend my plan</span>
          <span className="text-xs font-normal text-slate-500">Resume today, finish on {formatDate(preview.extendedEndDate)}</span>
        </Button>
        <Button variant="secondary" className="h-auto flex-col items-start py-3 text-left" onClick={() => onReschedule('redistribute')}>
          <span>🔀 Spread tasks out</span>
          <span className="text-xs font-normal text-slate-500">
            Keep the end date, ~{preview.extraMinutesPerDay} extra min/day for {preview.remainingDays} days
          </span>
        </Button>
      </div>
      <button type="button" onClick={() => setDismissedFor(`${today}:${preview.missedTasks}`)} className="mt-2 text-xs font-medium text-amber-800 hover:underline">
        Not now
      </button>
    </div>
  );
}
