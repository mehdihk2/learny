import { useState } from 'react';
import type { Exercise } from '../../exercises/types';
import type { PracticeResults } from '../../exercises/practice';
import type { LanguageCode } from '../../models/types';
import { Card, ProgressBar } from '../ui';
import { DictationView, ListeningView, RepeatView, SpeakView } from './AudioExercises';
import { ClozeView, FlashcardView, MatchView, McqView, OrderView } from './TextExercises';

/** Runs a list of exercises one after the other and reports the results. */
export function ExercisePlayer({
  exercises,
  language,
  onFinish,
}: {
  exercises: Exercise[];
  language: LanguageCode;
  onFinish: (results: PracticeResults) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PracticeResults>({ scores: {}, srs: {} });
  const exercise = exercises[index];

  const next = (score: number, extra?: Partial<PracticeResults>) => {
    const updated: PracticeResults = {
      scores: { ...results.scores, [exercise.id]: score },
      srs: { ...results.srs, ...extra?.srs },
    };
    setResults(updated);
    if (index + 1 < exercises.length) setIndex(index + 1);
    else onFinish(updated);
  };

  const props = { language, onComplete: (s: number) => next(s) };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <ProgressBar value={(index / exercises.length) * 100} />
        <span className="shrink-0 text-sm font-medium tabular-nums text-slate-500">
          {index + 1}/{exercises.length}
        </span>
      </div>
      <Card>
        {/* `key` resets each view's internal state between exercises. */}
        <div key={exercise.id}>
          {exercise.type === 'flashcard' && (
            <FlashcardView exercise={exercise} language={language} onGrade={(grade, score) => next(score, { srs: { [exercise.id]: grade } })} />
          )}
          {exercise.type === 'mcq' && <McqView exercise={exercise} {...props} />}
          {exercise.type === 'cloze' && <ClozeView exercise={exercise} {...props} />}
          {exercise.type === 'order' && <OrderView exercise={exercise} {...props} />}
          {exercise.type === 'match' && <MatchView exercise={exercise} {...props} />}
          {exercise.type === 'dictation' && <DictationView exercise={exercise} {...props} />}
          {exercise.type === 'listening' && <ListeningView exercise={exercise} {...props} />}
          {exercise.type === 'repeat' && <RepeatView exercise={exercise} {...props} />}
          {exercise.type === 'speak' && <SpeakView exercise={exercise} {...props} />}
        </div>
      </Card>
    </div>
  );
}
