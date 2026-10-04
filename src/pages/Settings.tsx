import { useState } from 'react';
import { FeasibilityPanel } from '../components/FeasibilityPanel';
import { Button, Card, CardTitle } from '../components/ui';
import { GOALS, languageName, LEVEL_LABELS } from '../lib/cefr';
import { useActivePlan } from '../state/AppState';

export function Settings() {
  const { profile, plan, progress, reset } = useActivePlan();
  const [confirming, setConfirming] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, plan, progress }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `levelup-${profile.language}-${plan.startDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows: [string, string][] = [
    ['Language', languageName(profile.language)],
    ['Starting level', `${profile.currentLevel} · ${LEVEL_LABELS[profile.currentLevel]}${profile.levelSource === 'placement-quiz' ? ' (placement quiz)' : ''}`],
    ['Target level', `${profile.targetLevel} · ${LEVEL_LABELS[profile.targetLevel]}`],
    ['Duration', `${profile.durationWeeks} weeks`],
    ['Daily time', `${profile.dailyMinutes} min`],
    ['Goal', `${GOALS.find((g) => g.id === profile.goal)?.label ?? profile.goal}${profile.examName ? ` (${profile.examName})` : ''}`],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Profile & settings</h1>
      <Card>
        <CardTitle>Your profile</CardTitle>
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardTitle>Feasibility at plan creation</CardTitle>
        <FeasibilityPanel result={plan.feasibility} />
      </Card>

      {progress.events.length > 0 && (
        <Card>
          <CardTitle>Plan history</CardTitle>
          <ul className="space-y-2 text-sm">
            {[...progress.events].reverse().map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 text-slate-400">{new Date(e.at).toLocaleDateString()}</span>
                <span className="text-slate-700">{e.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>Data</CardTitle>
        <p className="mb-3 text-sm text-slate-600">Your plan and progress are stored on this device only.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={exportData}>
            ⬇️ Export my data
          </Button>
          {confirming ? (
            <>
              <Button variant="danger" onClick={reset}>
                Yes, delete everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              🔄 Start a new plan
            </Button>
          )}
        </div>
        {confirming && <p className="mt-2 text-sm text-rose-600">This deletes your current plan and progress. This can't be undone.</p>}
      </Card>
    </div>
  );
}
