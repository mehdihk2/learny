import { useMemo, useState } from 'react';
import type { MilestoneResult, Skill } from '../models/types';
import { Button, Card, cx, ProgressBar, SKILL_STYLES } from '../components/ui';
import { CAN_DO, SELF_ASSESSMENT_SCALE } from '../content/canDo';
import { milestoneQuestions, type TargetLevel } from '../content';
import { navigate } from '../hooks/useHashRoute';
import { PASS_MARK } from '../lib/adaptation';
import { languageName, SKILL_LABELS, SKILLS } from '../lib/cefr';
import { formatDate } from '../lib/dates';
import { useActivePlan } from '../state/AppState';

export function MilestoneTest({ phaseId }: { phaseId: string }) {
  const { plan, profile, progress, today, submitMilestone } = useActivePlan();
  const phase = plan.phases.find((p) => p.id === phaseId);
  const questions = useMemo(() => (phase ? milestoneQuestions(profile.language, phase.toLevel as TargetLevel) : []), [phase, profile.language]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [ratings, setRatings] = useState<Partial<Record<Skill, number>>>({});
  const [result, setResult] = useState<MilestoneResult | null>(null);

  if (!phase) {
    return (
      <Card>
        <p>Milestone not found.</p>
        <Button className="mt-3" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </Card>
    );
  }

  const msDay = phase.weeks.flatMap((w) => w.days).find((d) => d.id === phase.milestoneDayId);
  const early = msDay && msDay.date > today;
  const previous = progress.milestoneResults.find((r) => r.phaseId === phase.id);
  const complete = questions.every((q) => q.id in answers) && SKILLS.every((s) => s in ratings);
  const nextPhase = plan.phases[phase.index + 1];

  if (result) {
    return (
      <div className="space-y-4">
        <Card className="text-center">
          <div className="text-5xl" aria-hidden>{result.passed ? '🏆' : '💪'}</div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{result.passed ? `You've reached ${phase.toLevel}!` : 'Almost there!'}</h1>
          <p className="mt-1 text-4xl font-extrabold text-brand-700">{result.overall}%</p>
          <p className="mt-2 text-slate-600">
            {result.passed
              ? 'Fantastic work. Your hard work is paying off.'
              : `You need ${PASS_MARK}% to pass. Keep practising — you can retake the test any time.`}
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-slate-900">Skill breakdown</h2>
          <ul className="space-y-3">
            {SKILLS.map((s) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">
                    {SKILL_STYLES[s].icon} {SKILL_LABELS[s]}
                  </span>
                  <span className={cx('font-semibold', result.weakSkills.includes(s) ? 'text-rose-600' : 'text-slate-700')}>{result.skillScores[s]}%</span>
                </div>
                <ProgressBar value={result.skillScores[s]} color={result.weakSkills.includes(s) ? 'bg-rose-400' : 'bg-emerald-500'} />
              </li>
            ))}
          </ul>
          {nextPhase && (
            <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
              🔧 We've adapted your next phase ({nextPhase.fromLevel} → {nextPhase.toLevel})
              {result.weakSkills.length > 0
                ? ` with extra practice in ${result.weakSkills.map((s) => SKILL_LABELS[s].toLowerCase()).join(', ')}.`
                : ' to keep your skills balanced.'}
            </p>
          )}
        </Card>
        <Button className="w-full" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-brand-700">Milestone test · Phase {phase.index + 1}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {phase.fromLevel} → {phase.toLevel} check-in
        </h1>
        <p className="text-slate-600">
          {questions.length > 0 ? `${questions.length} quick questions plus a self-assessment` : 'A quick self-assessment'} for each skill. Be honest — it's
          used to adapt your plan, not to judge you.
        </p>
        {early && msDay && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">This test is scheduled for {formatDate(msDay.date)}. You can take it early if you feel ready.</p>}
        {previous && <p className="mt-2 text-sm text-slate-500">Previous attempt: {previous.overall}%.</p>}
      </header>

      {questions.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-slate-900">Part 1 · Quick quiz</h2>
          <ol className="space-y-5">
            {questions.map((q, i) => (
              <li key={q.id}>
                <p className="font-medium text-slate-900">
                  {i + 1}. {q.prompt}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                      aria-pressed={answers[q.id] === oi}
                      className={cx(
                        'rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors',
                        answers[q.id] === oi ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-200',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-bold text-slate-900">{questions.length > 0 ? 'Part 2 · ' : ''}Can you do this in {languageName(profile.language)}?</h2>
        <p className="mb-4 text-sm text-slate-500">Official CEFR {phase.toLevel} descriptors.</p>
        <ul className="space-y-5">
          {SKILLS.map((s) => (
            <li key={s}>
              <p className="text-sm font-semibold text-slate-500">
                {SKILL_STYLES[s].icon} {SKILL_LABELS[s]}
              </p>
              <p className="mt-0.5 text-slate-900">“{CAN_DO[phase.toLevel as TargetLevel][s]}”</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SELF_ASSESSMENT_SCALE.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={ratings[s] === opt.value}
                    onClick={() => setRatings({ ...ratings, [s]: opt.value })}
                    className={cx(
                      'rounded-xl border-2 px-2 py-2 text-sm font-medium transition-colors',
                      ratings[s] === opt.value ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-200',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => navigate('/')}>
          Later
        </Button>
        <Button className="flex-[2]" disabled={!complete} onClick={() => setResult(submitMilestone(phase.id, { questions, answers, selfRatings: ratings }))}>
          See my results
        </Button>
      </div>
    </div>
  );
}
