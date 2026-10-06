import { useEffect, useMemo, useState } from 'react';
import { ExercisePlayer } from '../components/exercises/ExercisePlayer';
import { Button, Card, formatMinutes, ProgressBar, SkillBadge } from '../components/ui';
import { navigate } from '../hooks/useHashRoute';
import { allTasks } from '../lib/planGenerator';
import { sessionScore, type PracticeResults } from '../exercises/practice';
import type { Exercise } from '../exercises/types';
import { loadSession, logAttempts } from '../services/exercises';
import { useActivePlan } from '../state/AppState';
import { useSession } from '../state/Session';

const TYPE_LABEL: Record<Exercise['type'], string> = {
  flashcard: 'Flashcard',
  mcq: 'Quiz',
  cloze: 'Fill the gap',
  order: 'Word order',
  match: 'Match',
  dictation: 'Dictation',
  listening: 'Dialogue',
  repeat: 'Listen & repeat',
  speak: 'Speaking',
};

function describe(e: Exercise): string {
  switch (e.type) {
    case 'flashcard':
      return e.term;
    case 'mcq':
      return e.audio ?? e.prompt;
    case 'cloze':
      return e.sentence;
    case 'order':
    case 'match':
      return e.type === 'order' ? e.words.join(' ') : e.pairs.map((p) => p[0]).join(', ');
    case 'dictation':
    case 'repeat':
      return e.text;
    case 'listening':
      return e.title;
    case 'speak':
      return e.prompt;
  }
}

export function Practice({ taskId }: { taskId: string }) {
  const { plan, profile, progress, today, recordPractice } = useActivePlan();
  const { session } = useSession();
  const online = session.status === 'account';
  const task = useMemo(() => allTasks(plan).find((t) => t.id === taskId), [plan, taskId]);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState<PracticeResults | null>(null);

  // Load the session once per round — later progress updates must not reshuffle it mid-way.
  // Extra rounds are built locally: the server's copy of the latest scores may not be saved yet.
  useEffect(() => {
    let cancelled = false;
    setExercises(null);
    loadSession({ online: online && round === 0, plan, profile, progress, taskId, today }).then((xs) => !cancelled && setExercises(xs));
    return () => {
      cancelled = true;
    };
  }, [taskId, round]);

  if (!task) {
    return (
      <Card>
        <p>This task doesn't exist anymore.</p>
        <Button className="mt-3" onClick={() => navigate('/')}>
          Back to today
        </Button>
      </Card>
    );
  }

  const finish = (results: PracticeResults) => {
    recordPractice(task.id, results);
    void logAttempts(online, task.id, exercises ?? [], results);
    setFinished(results);
  };

  const header = (
    <header className="mb-4">
      <button type="button" onClick={() => navigate('/')} className="mb-2 text-sm font-semibold text-brand-700 hover:underline">
        ← Back
      </button>
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{task.title}</h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <SkillBadge skill={task.skill} />
        <span className="text-sm text-slate-500">⏱ {formatMinutes(task.minutes)}</span>
      </div>
    </header>
  );

  if (finished && exercises) {
    const score = sessionScore(finished);
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <Card className="text-center">
          <div className="text-5xl" aria-hidden>{score >= 80 ? '🏆' : score >= 50 ? '💪' : '🌱'}</div>
          <p className="mt-2 text-4xl font-extrabold text-brand-700">{score}%</p>
          <p className="mt-1 text-slate-600">
            {score >= 80 ? 'Excellent work!' : score >= 50 ? 'Good effort — keep it up!' : 'Every mistake is a step forward.'} Task marked as done ✅
          </p>
        </Card>
        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-slate-900">Your results</h2>
          <ul className="space-y-3">
            {exercises.map((e) => {
              const s = Math.round((finished.scores[e.id] ?? 0) * 100);
              return (
                <li key={e.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-slate-500">{TYPE_LABEL[e.type]} · </span>
                      {describe(e)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{s}%</span>
                  </div>
                  <ProgressBar value={s} className="mt-1 h-1.5" color={s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-400' : 'bg-rose-400'} />
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setFinished(null);
              setRound(round + 1);
            }}
          >
            🔁 Practise more
          </Button>
          <Button className="flex-1" onClick={() => navigate('/')}>
            Back to today
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      {exercises === null ? (
        <Card>
          <p className="py-6 text-center text-slate-400">Preparing your exercises…</p>
        </Card>
      ) : exercises.length === 0 ? (
        <Card>
          <p className="text-slate-700">There are no interactive exercises for this task yet. Follow the instructions instead:</p>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{task.instructions}</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Back to today
          </Button>
        </Card>
      ) : (
        <ExercisePlayer key={round} exercises={exercises} language={profile.language} onFinish={finish} />
      )}
    </div>
  );
}
