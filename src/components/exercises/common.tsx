import { useEffect, useState, type ReactNode } from 'react';
import type { LanguageCode } from '../../models/types';
import { speak, stopSpeaking, ttsAvailable } from '../../services/speech';
import { Button, cx } from '../ui';

export interface ExerciseViewProps<E> {
  exercise: E;
  language: LanguageCode;
  /** Called when the learner moves on. `score` is 0–1. */
  onComplete: (score: number) => void;
}

export function Prompt({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{label}</p>
      <div className="mt-1 text-lg font-semibold leading-snug text-slate-900">{children}</div>
    </div>
  );
}

/** 🔊 button that reads text aloud, with an optional slow mode. */
export function PlayButton({
  text,
  language,
  autoPlay,
  slow = true,
  label = 'Listen',
  variant,
}: {
  text: string;
  language: LanguageCode;
  autoPlay?: boolean;
  slow?: boolean;
  label?: string;
  variant?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const play = async (rate?: number) => {
    stopSpeaking();
    setPlaying(true);
    await speak(text, language, { rate, variant });
    setPlaying(false);
  };
  useEffect(() => {
    if (autoPlay) void play();
    return () => stopSpeaking();
  }, [text]);

  if (!ttsAvailable()) return <p className="text-sm text-amber-700">Audio isn't available in this browser.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => play()} aria-label={`${label} at normal speed`}>
        <span aria-hidden>{playing ? '🔉' : '🔊'}</span> {label}
      </Button>
      {slow && (
        <Button variant="ghost" onClick={() => play(0.65)} aria-label={`${label} slowly`}>
          🐢 Slower
        </Button>
      )}
    </div>
  );
}

export type Verdict = 'correct' | 'almost' | 'wrong';

const VERDICT = {
  correct: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', title: 'Correct! 🎉' },
  almost: { box: 'border-amber-200 bg-amber-50 text-amber-900', title: 'Almost! 👍' },
  wrong: { box: 'border-rose-200 bg-rose-50 text-rose-900', title: 'Not quite' },
};

export function Feedback({ verdict, title, children }: { verdict: Verdict; title?: string; children?: ReactNode }) {
  return (
    <div className={cx('mt-4 rounded-xl border p-3 text-sm', VERDICT[verdict].box)} role="status">
      <p className="font-bold">{title ?? VERDICT[verdict].title}</p>
      {children && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

export function verdictFor(score: number): Verdict {
  return score >= 0.95 ? 'correct' : score >= 0.6 ? 'almost' : 'wrong';
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">{children}</div>;
}

export function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} className="sm:min-w-40" autoFocus>
      Continue →
    </Button>
  );
}

/** Multiple-choice options with right/wrong colouring after answering. */
export function Options({
  options,
  picked,
  answer,
  onPick,
}: {
  options: string[];
  picked: number | null;
  answer: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt, i) => {
        const done = picked !== null;
        const state = !done ? 'idle' : i === answer ? 'right' : i === picked ? 'wrong' : 'other';
        return (
          <button
            key={`${opt}-${i}`}
            type="button"
            disabled={done}
            onClick={() => onPick(i)}
            className={cx(
              'rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors',
              state === 'idle' && 'border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50',
              state === 'right' && 'border-emerald-500 bg-emerald-50 text-emerald-900',
              state === 'wrong' && 'border-rose-400 bg-rose-50 text-rose-900',
              state === 'other' && 'border-slate-200 bg-white opacity-60',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
