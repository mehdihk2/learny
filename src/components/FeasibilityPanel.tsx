import type { FeasibilityResult, FeasibilitySuggestion } from '../models/types';
import { Button, cx, ProgressBar } from './ui';

const STATUS_STYLE = {
  realistic: { box: 'border-emerald-200 bg-emerald-50', title: 'text-emerald-800', icon: '✅', label: 'Realistic', bar: 'bg-emerald-500' },
  ambitious: { box: 'border-amber-200 bg-amber-50', title: 'text-amber-800', icon: '⚡', label: 'Ambitious', bar: 'bg-amber-500' },
  unrealistic: { box: 'border-rose-200 bg-rose-50', title: 'text-rose-800', icon: '⚠️', label: 'Unrealistic', bar: 'bg-rose-500' },
} as const;

export function FeasibilityPanel({
  result,
  onApply,
}: {
  result: FeasibilityResult;
  onApply?: (s: FeasibilitySuggestion) => void;
}) {
  const s = STATUS_STYLE[result.status];
  return (
    <div className={cx('rounded-2xl border p-4', s.box)}>
      <div className={cx('flex items-center gap-2 text-lg font-bold', s.title)}>
        <span aria-hidden>{s.icon}</span> {s.label}
      </div>
      <p className="mt-1 text-sm text-slate-700">{result.message}</p>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>Available: {Math.round(result.availableHours)} h</span>
          <span>Needed: ~{result.requiredHours} h</span>
        </div>
        <ProgressBar value={result.ratio * 100} color={s.bar} className="bg-white" />
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
        {result.steps.map((st) => (
          <li key={st.to} className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600 ring-1 ring-slate-200">
            {st.from} → {st.to}: ~{st.hours} h
          </li>
        ))}
      </ul>

      {result.suggestions.length > 0 && onApply && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Make it work:</p>
          {result.suggestions.map((sug) => (
            <Button key={sug.kind} variant="secondary" className="w-full justify-start text-left" onClick={() => onApply(sug)}>
              <span aria-hidden>{sug.kind === 'extend-duration' ? '📅' : sug.kind === 'increase-daily-time' ? '⏱️' : '🎯'}</span>
              {sug.label}
            </Button>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Estimates are based on CEFR guided-learning hours and adjusted for how hard the language is for English speakers.
      </p>
    </div>
  );
}
