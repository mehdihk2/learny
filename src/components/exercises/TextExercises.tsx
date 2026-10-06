import { useMemo, useState } from 'react';
import type { ClozeExercise, FlashcardExercise, MatchExercise, McqExercise, OrderExercise } from '../../exercises/types';
import { checkGap, normalize, type GapResult } from '../../exercises/check';
import { seededRandom, shuffle } from '../../exercises/select';
import { gradeScore, type SrsGrade } from '../../exercises/srs';
import type { LanguageCode } from '../../models/types';
import { Button, cx } from '../ui';
import { Actions, ContinueButton, Feedback, Options, PlayButton, Prompt, verdictFor, type ExerciseViewProps } from './common';

// ---------------------------------------------------------------------------
// Flashcard (spaced repetition)
// ---------------------------------------------------------------------------

const GRADES: { grade: SrsGrade; label: string; hint: string; className: string }[] = [
  { grade: 'again', label: 'Again', hint: 'Forgot it', className: 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100' },
  { grade: 'hard', label: 'Hard', hint: 'Took a while', className: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' },
  { grade: 'good', label: 'Good', hint: 'Got it', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' },
  { grade: 'easy', label: 'Easy', hint: 'Instant', className: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100' },
];

export function FlashcardView({
  exercise,
  language,
  onGrade,
}: {
  exercise: FlashcardExercise;
  language: LanguageCode;
  onGrade: (grade: SrsGrade, score: number) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <Prompt label="Flashcard · do you know this?">
        <span className="text-2xl">{exercise.term}</span>
      </Prompt>
      <PlayButton text={exercise.term} language={language} autoPlay slow={false} label="Pronounce" />
      {revealed ? (
        <>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900">{exercise.meaning}</p>
            {exercise.example && (
              <p className="mt-2 flex items-center gap-2 italic text-slate-600">
                “{exercise.example}”
              </p>
            )}
          </div>
          {exercise.example && (
            <div className="mt-2">
              <PlayButton text={exercise.example} language={language} slow={false} label="Example" />
            </div>
          )}
          <p className="mt-4 text-sm font-medium text-slate-600">How well did you remember it?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                type="button"
                onClick={() => onGrade(g.grade, gradeScore(g.grade))}
                className={cx('rounded-xl border-2 px-3 py-2 text-center', g.className)}
              >
                <span className="block font-bold">{g.label}</span>
                <span className="block text-xs opacity-80">{g.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <Actions>
          <Button onClick={() => setRevealed(true)} autoFocus>
            Show meaning
          </Button>
        </Actions>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice (also "which word do you hear?")
// ---------------------------------------------------------------------------

export function McqView({ exercise, language, onComplete }: ExerciseViewProps<McqExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === exercise.answer;
  return (
    <div>
      <Prompt label={exercise.audio ? 'Listen and choose' : exercise.skill === 'grammar' ? 'Grammar · choose the right answer' : 'Vocabulary · choose the meaning'}>
        {exercise.prompt}
      </Prompt>
      {exercise.audio && (
        <div className="mb-4">
          <PlayButton text={exercise.audio} language={language} autoPlay />
        </div>
      )}
      <Options options={exercise.options} picked={picked} answer={exercise.answer} onPick={setPicked} />
      {picked !== null && (
        <>
          <Feedback verdict={correct ? 'correct' : 'wrong'}>
            {!correct && (
              <p>
                Answer: <strong>{exercise.options[exercise.answer]}</strong>
              </p>
            )}
            {exercise.explanation && <p>{exercise.explanation}</p>}
          </Feedback>
          <Actions>
            <ContinueButton onClick={() => onComplete(correct ? 1 : 0)} />
          </Actions>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fill in the gaps
// ---------------------------------------------------------------------------

const GAP_STYLE: Record<GapResult, string> = {
  correct: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  almost: 'border-amber-400 bg-amber-50 text-amber-900',
  wrong: 'border-rose-400 bg-rose-50 text-rose-900',
};

export function ClozeView({ exercise, onComplete }: ExerciseViewProps<ClozeExercise>) {
  const parts = exercise.sentence.split('___');
  const [values, setValues] = useState<string[]>(() => exercise.answers.map(() => ''));
  const [results, setResults] = useState<GapResult[] | null>(null);
  const score = results ? results.reduce((s, r) => s + (r === 'correct' ? 1 : r === 'almost' ? 0.75 : 0), 0) / results.length : 0;
  const check = () => setResults(exercise.answers.map((alts, i) => checkGap(values[i], alts)));

  return (
    <div>
      <Prompt label="Grammar · fill in the gap">
        <span className="leading-loose">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <input
                  aria-label={`Gap ${i + 1}`}
                  value={values[i]}
                  disabled={!!results}
                  autoFocus={i === 0}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
                  onKeyDown={(e) => e.key === 'Enter' && !results && values.every((v) => v.trim()) && check()}
                  className={cx(
                    'mx-1 inline-block w-36 rounded-lg border-2 px-2 py-0.5 text-center font-semibold focus:outline-none',
                    results ? GAP_STYLE[results[i]] : 'border-brand-200 bg-brand-50 focus:border-brand-500',
                  )}
                />
              )}
            </span>
          ))}
        </span>
      </Prompt>
      {exercise.hint && !results && <p className="text-sm text-slate-500">Hint: {exercise.hint}</p>}
      {results ? (
        <>
          <Feedback verdict={verdictFor(score)}>
            {results.some((r) => r !== 'correct') && (
              <p>
                Answer: <strong>{exercise.answers.map((a) => a[0]).join(' … ')}</strong>
                {results.includes('almost') && ' — watch the spelling and accents.'}
              </p>
            )}
            {exercise.explanation && <p>{exercise.explanation}</p>}
          </Feedback>
          <Actions>
            <ContinueButton onClick={() => onComplete(score)} />
          </Actions>
        </>
      ) : (
        <Actions>
          <Button variant="ghost" onClick={() => setResults(exercise.answers.map(() => 'wrong'))}>
            I don't know
          </Button>
          <Button onClick={check} disabled={values.some((v) => !v.trim())}>
            Check
          </Button>
        </Actions>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Put the words in order
// ---------------------------------------------------------------------------

export function OrderView({ exercise, language, onComplete }: ExerciseViewProps<OrderExercise>) {
  const shuffled = useMemo(() => {
    const rand = seededRandom(exercise.id);
    let s = shuffle(exercise.words.map((w, i) => ({ w, i })), rand);
    // Never start already solved.
    if (s.every((x, i) => x.i === i)) s = [...s.slice(1), s[0]];
    return s;
  }, [exercise]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const answer = chosen.map((i) => shuffled[i].w).join(' ');
  const correct = normalize(answer) === normalize(exercise.words.join(' '));

  return (
    <div>
      <Prompt label="Grammar · put the words in order">{exercise.translation || 'Build the sentence'}</Prompt>
      <div className={cx('flex min-h-14 flex-wrap gap-2 rounded-xl border-2 border-dashed p-2', checked ? (correct ? 'border-emerald-400' : 'border-rose-300') : 'border-slate-300')}>
        {chosen.length === 0 && <span className="self-center px-2 text-sm text-slate-400">Tap the words below…</span>}
        {chosen.map((idx, pos) => (
          <button
            key={idx}
            type="button"
            disabled={checked}
            onClick={() => setChosen(chosen.filter((_, p) => p !== pos))}
            className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white"
          >
            {shuffled[idx].w}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {shuffled.map((x, idx) =>
          chosen.includes(idx) ? (
            <span key={idx} className="rounded-lg border border-transparent px-3 py-1.5 text-transparent">
              {x.w}
            </span>
          ) : (
            <button
              key={idx}
              type="button"
              disabled={checked}
              onClick={() => setChosen([...chosen, idx])}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:border-brand-500"
            >
              {x.w}
            </button>
          ),
        )}
      </div>
      {checked ? (
        <>
          <Feedback verdict={correct ? 'correct' : 'wrong'}>
            {!correct && (
              <p>
                Correct order: <strong>{exercise.words.join(' ')}</strong>
              </p>
            )}
          </Feedback>
          <div className="mt-2">
            <PlayButton text={exercise.words.join(' ')} language={language} slow={false} label="Hear it" />
          </div>
          <Actions>
            <ContinueButton onClick={() => onComplete(correct ? 1 : 0)} />
          </Actions>
        </>
      ) : (
        <Actions>
          <Button variant="ghost" onClick={() => setChosen([])} disabled={chosen.length === 0}>
            Reset
          </Button>
          <Button onClick={() => setChecked(true)} disabled={chosen.length !== exercise.words.length}>
            Check
          </Button>
        </Actions>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match pairs
// ---------------------------------------------------------------------------

export function MatchView({ exercise, onComplete }: ExerciseViewProps<MatchExercise>) {
  const right = useMemo(() => shuffle(exercise.pairs.map((p, i) => ({ text: p[1], i })), seededRandom(exercise.id)), [exercise]);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const done = matched.size === exercise.pairs.length;
  const score = exercise.pairs.length / (exercise.pairs.length + mistakes);

  const pickRight = (i: number) => {
    if (selected === null || matched.has(i)) return;
    if (selected === i) {
      setMatched(new Set([...matched, i]));
    } else {
      setMistakes(mistakes + 1);
      setFlash(i);
      setTimeout(() => setFlash(null), 500);
    }
    setSelected(null);
  };

  const cell = (state: 'idle' | 'selected' | 'matched' | 'error') =>
    cx(
      'w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors',
      state === 'idle' && 'border-slate-200 bg-white hover:border-brand-300',
      state === 'selected' && 'border-brand-600 bg-brand-50',
      state === 'matched' && 'border-emerald-300 bg-emerald-50 text-emerald-800',
      state === 'error' && 'border-rose-400 bg-rose-50',
    );

  return (
    <div>
      <Prompt label="Vocabulary · match the pairs">Tap a word, then its meaning.</Prompt>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {exercise.pairs.map(([term], i) => (
            <button key={i} type="button" disabled={matched.has(i)} onClick={() => setSelected(i)} className={cell(matched.has(i) ? 'matched' : selected === i ? 'selected' : 'idle')}>
              {term}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((r) => (
            <button key={r.i} type="button" disabled={matched.has(r.i)} onClick={() => pickRight(r.i)} className={cell(matched.has(r.i) ? 'matched' : flash === r.i ? 'error' : 'idle')}>
              {r.text}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <>
          <Feedback verdict={verdictFor(score)} title={mistakes === 0 ? 'Perfect! 🎉' : `Done with ${mistakes} mistake${mistakes === 1 ? '' : 's'}`} />
          <Actions>
            <ContinueButton onClick={() => onComplete(score)} />
          </Actions>
        </>
      )}
    </div>
  );
}
