import { useMemo, useState } from 'react';
import type { CefrLevel, LanguageCode } from '../models/types';
import { placementQuiz } from '../content/placement';
import { SELF_ASSESSMENT_SCALE } from '../content/canDo';
import { LEVEL_LABELS, languageName } from '../lib/cefr';
import { scorePlacement } from '../lib/placement';
import { Button, Card, cx, ProgressBar } from './ui';

export function PlacementQuiz({
  language,
  onDone,
  onCancel,
}: {
  language: LanguageCode;
  onDone: (level: CefrLevel) => void;
  onCancel: () => void;
}) {
  const questions = useMemo(() => placementQuiz(language), [language]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CefrLevel | null>(null);
  const q = questions[index];
  const isSelf = q?.kind === 'self';

  const answer = (value: number) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (index + 1 < questions.length) setIndex(index + 1);
    else setResult(scorePlacement(questions, next));
  };

  if (result) {
    return (
      <Card className="text-center">
        <div className="text-5xl" aria-hidden>🎯</div>
        <h2 className="mt-3 text-xl font-bold text-slate-900">Your estimated level: {result}</h2>
        <p className="mt-1 text-slate-600">{LEVEL_LABELS[result]}</p>
        <p className="mt-3 text-sm text-slate-500">This is a quick estimate — you can always adjust it.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => onDone(result)}>Use {result}</Button>
          <Button variant="secondary" onClick={onCancel}>
            Pick manually
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <button type="button" className="font-medium text-brand-700 hover:underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <ProgressBar value={(index / questions.length) * 100} className="mb-5" />

      {isSelf ? (
        <>
          <p className="text-sm font-medium text-slate-500">How well does this describe you in {languageName(language)}?</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">“{q.prompt}”</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {SELF_ASSESSMENT_SCALE.map((s) => (
              <Button key={s.value} variant="secondary" onClick={() => answer(s.value)}>
                {s.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-500">Choose the best answer</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{q.prompt}</p>
          <div className="mt-5 grid gap-2">
            {q.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => answer(i)}
                className={cx('rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-medium hover:border-brand-500 hover:bg-brand-50')}
              >
                {opt}
              </button>
            ))}
            <button type="button" className="mt-1 text-sm text-slate-500 hover:underline" onClick={() => answer(-1)}>
              I don't know
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
