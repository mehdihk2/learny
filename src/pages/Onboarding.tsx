import { useMemo, useState } from 'react';
import type { CefrLevel, FeasibilitySuggestion, Goal, LanguageCode, UserProfile } from '../models/types';
import { FeasibilityPanel } from '../components/FeasibilityPanel';
import { PlacementQuiz } from '../components/PlacementQuiz';
import { Button, Card, OptionCard, ProgressBar } from '../components/ui';
import {
  CURRENT_LEVEL_OPTIONS,
  GOALS,
  isHigher,
  LANGUAGES,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
  languageName,
  LEVELS,
  TARGET_LEVEL_OPTIONS,
} from '../lib/cefr';
import { todayISO } from '../lib/dates';
import { checkFeasibility } from '../lib/feasibility';
import { hasDedicatedPack } from '../content';
import { useAppState } from '../state/AppState';
import { useSession } from '../state/Session';

const DURATIONS = [
  { weeks: 2, label: '2 weeks' },
  { weeks: 4, label: '1 month' },
  { weeks: 13, label: '3 months' },
  { weeks: 26, label: '6 months' },
  { weeks: 52, label: '1 year' },
];

const DAILY = [
  { minutes: 15, label: '15 min', hint: 'A coffee break' },
  { minutes: 30, label: '30 min', hint: 'Steady habit' },
  { minutes: 60, label: '1 hour', hint: 'Serious progress' },
  { minutes: 120, label: '2 hours+', hint: 'Intensive' },
];

interface Draft {
  name: string;
  language: LanguageCode | null;
  currentLevel: CefrLevel | null;
  levelSource: UserProfile['levelSource'];
  targetLevel: CefrLevel | null;
  durationWeeks: number | null;
  dailyMinutes: number | null;
  goal: Goal | null;
  examName: string;
  startDate: string;
}

const STEPS = ['Welcome', 'Language', 'Current level', 'Target level', 'Duration', 'Daily time', 'Goal', 'Your plan'] as const;

function nextLevel(level: CefrLevel): CefrLevel {
  return LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)];
}

export function Onboarding() {
  const { createPlan } = useAppState();
  const { session } = useSession();
  const [step, setStep] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [customWeeks, setCustomWeeks] = useState('');
  const [draft, setDraft] = useState<Draft>({
    name: session.status === 'account' ? (session.user.name ?? '') : '',
    language: null,
    currentLevel: null,
    levelSource: 'self-assessed',
    targetLevel: null,
    durationWeeks: null,
    dailyMinutes: null,
    goal: null,
    examName: '',
    startDate: todayISO(),
  });

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const setCurrent = (level: CefrLevel, source: UserProfile['levelSource']) =>
    setDraft((d) => ({
      ...d,
      currentLevel: level,
      levelSource: source,
      targetLevel: d.targetLevel && isHigher(d.targetLevel, level) ? d.targetLevel : nextLevel(level),
    }));

  const feasibility = useMemo(() => {
    const { language, currentLevel, targetLevel, durationWeeks, dailyMinutes } = draft;
    if (!language || !currentLevel || !targetLevel || !durationWeeks || !dailyMinutes) return null;
    if (!isHigher(targetLevel, currentLevel)) return null;
    return checkFeasibility({ language, currentLevel, targetLevel, durationWeeks, dailyMinutes });
  }, [draft]);

  const canContinue = [
    true,
    !!draft.language,
    !!draft.currentLevel,
    !!draft.targetLevel && !!draft.currentLevel && isHigher(draft.targetLevel, draft.currentLevel),
    !!draft.durationWeeks && draft.durationWeeks >= 1 && draft.durationWeeks <= 156,
    !!draft.dailyMinutes,
    !!draft.goal,
    !!feasibility,
  ][step];

  const applySuggestion = (s: FeasibilitySuggestion) => {
    update(s.patch);
    if (s.patch.durationWeeks && !DURATIONS.some((d) => d.weeks === s.patch.durationWeeks)) setCustomWeeks(String(s.patch.durationWeeks));
  };

  const finish = () => {
    const d = draft;
    if (!d.language || !d.currentLevel || !d.targetLevel || !d.durationWeeks || !d.dailyMinutes || !d.goal) return;
    createPlan({
      id: crypto.randomUUID?.() ?? `u-${Date.now()}`,
      name: d.name.trim() || undefined,
      language: d.language,
      currentLevel: d.currentLevel,
      targetLevel: d.targetLevel,
      durationWeeks: d.durationWeeks,
      dailyMinutes: d.dailyMinutes,
      goal: d.goal,
      examName: d.goal === 'exam' ? d.examName.trim() || undefined : undefined,
      startDate: d.startDate,
      levelSource: d.levelSource,
      createdAt: new Date().toISOString(),
    });
    window.location.hash = '/';
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-28 pt-6">
      <header className="mb-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-extrabold tracking-tight text-brand-700">LevelUp Language</span>
          <span className="text-slate-500">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} />
      </header>

      <main className="flex-1">
        {step === 0 && (
          <div className="pt-6 text-center">
            <div className="text-6xl" aria-hidden>🚀</div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Level up your language skills</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Tell us where you are, where you want to go and how much time you have. We'll build a realistic, day-by-day plan to get you there.
            </p>
            <label className="mx-auto mt-8 block max-w-xs text-left">
              <span className="text-sm font-medium text-slate-700">What should we call you? (optional)</span>
              <input
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Your first name"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <StepShell title="Which language are you learning?">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LANGUAGES.map((l) => (
                <OptionCard
                  key={l.code}
                  icon={l.flag}
                  title={l.name}
                  subtitle={hasDedicatedPack(l.code) ? 'Tailored content' : undefined}
                  selected={draft.language === l.code}
                  onClick={() => update({ language: l.code })}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && draft.language && (
          <StepShell title="What's your current level?" subtitle="Be honest — a good plan starts from where you really are.">
            {quizOpen ? (
              <PlacementQuiz
                language={draft.language}
                onCancel={() => setQuizOpen(false)}
                onDone={(level) => {
                  setCurrent(level, 'placement-quiz');
                  setQuizOpen(false);
                }}
              />
            ) : (
              <>
                <Button variant="secondary" className="mb-4 w-full" onClick={() => setQuizOpen(true)}>
                  🤔 Not sure? Take a 2-minute placement quiz
                </Button>
                <div className="grid gap-2">
                  {CURRENT_LEVEL_OPTIONS.map((lvl) => (
                    <OptionCard
                      key={lvl}
                      icon={<LevelChip level={lvl} />}
                      title={LEVEL_LABELS[lvl]}
                      subtitle={LEVEL_DESCRIPTIONS[lvl]}
                      selected={draft.currentLevel === lvl}
                      onClick={() => setCurrent(lvl, 'self-assessed')}
                    />
                  ))}
                </div>
              </>
            )}
          </StepShell>
        )}

        {step === 3 && draft.currentLevel && (
          <StepShell title="Where do you want to get to?" subtitle={`You're starting at ${draft.currentLevel}. Pick a higher level.`}>
            <div className="grid gap-2">
              {TARGET_LEVEL_OPTIONS.map((lvl) => (
                <OptionCard
                  key={lvl}
                  icon={<LevelChip level={lvl} />}
                  title={LEVEL_LABELS[lvl]}
                  subtitle={LEVEL_DESCRIPTIONS[lvl]}
                  selected={draft.targetLevel === lvl}
                  disabled={!isHigher(lvl, draft.currentLevel!)}
                  onClick={() => update({ targetLevel: lvl })}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="How long do you have?" subtitle="Your deadline — a trip, an exam, a new job…">
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((d) => (
                <OptionCard
                  key={d.weeks}
                  title={d.label}
                  subtitle={`${d.weeks} weeks`}
                  selected={draft.durationWeeks === d.weeks && !customWeeks}
                  onClick={() => {
                    setCustomWeeks('');
                    update({ durationWeeks: d.weeks });
                  }}
                />
              ))}
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">Or a custom number of weeks</span>
              <input
                type="number"
                min={1}
                max={156}
                inputMode="numeric"
                value={customWeeks}
                onChange={(e) => {
                  setCustomWeeks(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  update({ durationWeeks: Number.isFinite(n) ? n : null });
                }}
                placeholder="e.g. 10"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">Start date</span>
              <input
                type="date"
                value={draft.startDate}
                min={todayISO()}
                onChange={(e) => e.target.value && update({ startDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="How much time can you study each day?" subtitle="Consistency beats intensity. Pick what you can really keep up.">
            <div className="grid gap-2">
              {DAILY.map((d) => (
                <OptionCard
                  key={d.minutes}
                  icon="⏱️"
                  title={d.label}
                  subtitle={d.hint}
                  selected={draft.dailyMinutes === d.minutes}
                  onClick={() => update({ dailyMinutes: d.minutes })}
                />
              ))}
              {draft.dailyMinutes && !DAILY.some((d) => d.minutes === draft.dailyMinutes) && (
                <OptionCard icon="⏱️" title={`${draft.dailyMinutes} min`} subtitle="Suggested" selected onClick={() => {}} />
              )}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="What's your main goal?" subtitle="We'll tune the balance of skills to match it.">
            <div className="grid gap-2">
              {GOALS.map((g) => (
                <OptionCard key={g.id} icon={g.emoji} title={g.label} subtitle={g.description} selected={draft.goal === g.id} onClick={() => update({ goal: g.id })} />
              ))}
            </div>
            {draft.goal === 'exam' && (
              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">Which exam?</span>
                <input
                  value={draft.examName}
                  onChange={(e) => update({ examName: e.target.value })}
                  placeholder="e.g. DELE, DELF, TOEFL, IELTS, JLPT"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
            )}
          </StepShell>
        )}

        {step === 7 && feasibility && draft.language && (
          <StepShell title="Is this goal realistic?" subtitle="Here's how your time compares to what research says you'll need.">
            <Card className="mb-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Summary label="Language" value={languageName(draft.language)} />
                <Summary label="Levels" value={`${draft.currentLevel} → ${draft.targetLevel}`} />
                <Summary label="Duration" value={`${draft.durationWeeks} weeks`} />
                <Summary label="Daily" value={`${draft.dailyMinutes} min`} />
              </dl>
            </Card>
            <FeasibilityPanel result={feasibility} onApply={applySuggestion} />
            {feasibility.status === 'unrealistic' && (
              <p className="mt-3 text-center text-sm text-slate-500">You can still continue — we'll build the best plan possible in your time.</p>
            )}
          </StepShell>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue || quizOpen} className="flex-[2]">
              {step === 0 ? "Let's go" : 'Continue'}
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canContinue} className="flex-[2]">
              Generate my plan ✨
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function LevelChip({ level }: { level: CefrLevel }) {
  return <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">{level}</span>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
