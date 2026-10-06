import { useEffect, useRef, useState } from 'react';
import type { DictationExercise, ListeningExercise, RepeatExercise, SpeakExercise } from '../../exercises/types';
import { sentenceSimilarity, targetCoverage, wordMatches } from '../../exercises/check';
import type { LanguageCode } from '../../models/types';
import { listen, recognitionAvailable, recordingAvailable, speak, startRecording, stopSpeaking, ttsAvailable, type Listening, type Recording } from '../../services/speech';
import { Button, cx } from '../ui';
import { Actions, ContinueButton, Feedback, Options, PlayButton, Prompt, verdictFor, type ExerciseViewProps } from './common';

function WordDiff({ expected, actual }: { expected: string; actual: string }) {
  return (
    <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-base">
      {wordMatches(expected, actual).map((w, i) => (
        <span key={i} className={w.ok ? 'text-emerald-700' : 'rounded bg-rose-100 px-1 font-semibold text-rose-700'}>
          {w.word}
        </span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Dictation
// ---------------------------------------------------------------------------

export function DictationView({ exercise, language, onComplete }: ExerciseViewProps<DictationExercise>) {
  const [text, setText] = useState('');
  const [score, setScore] = useState<number | null>(null);
  return (
    <div>
      <Prompt label="Listening · dictation">Listen and type exactly what you hear.</Prompt>
      <PlayButton text={exercise.text} language={language} autoPlay />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={score !== null}
        rows={2}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Type what you hear…"
        className="mt-4 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-lg focus:border-brand-500 focus:outline-none"
      />
      {score !== null ? (
        <>
          <Feedback verdict={verdictFor(score)} title={`${Math.round(score * 100)}% of the words`}>
            <WordDiff expected={exercise.text} actual={text} />
            {exercise.translation && <p className="text-slate-600">{exercise.translation}</p>}
          </Feedback>
          <Actions>
            <ContinueButton onClick={() => onComplete(score)} />
          </Actions>
        </>
      ) : (
        <Actions>
          <Button onClick={() => setScore(sentenceSimilarity(exercise.text, text))} disabled={!text.trim()}>
            Check
          </Button>
        </Actions>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogue comprehension
// ---------------------------------------------------------------------------

export function ListeningView({ exercise, language, onComplete }: ExerciseViewProps<ListeningExercise>) {
  const [playingLine, setPlayingLine] = useState<number | null>(null);
  const [plays, setPlays] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => exercise.questions.map(() => null));
  const [showScript, setShowScript] = useState(false);
  const cancelled = useRef(false);
  const allAnswered = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === exercise.questions[i].answer).length / exercise.questions.length;

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      stopSpeaking();
    };
  }, []);

  const playDialogue = async (rate = 0.95) => {
    stopSpeaking();
    setPlays((p) => p + 1);
    for (let i = 0; i < exercise.lines.length && !cancelled.current; i++) {
      setPlayingLine(i);
      await speak(exercise.lines[i].text, language, { rate, variant: exercise.lines[i].speaker === 'B' ? 1 : 0 });
    }
    setPlayingLine(null);
  };

  return (
    <div>
      <Prompt label="Listening · dialogue">🎧 {exercise.title}</Prompt>
      {ttsAvailable() ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => playDialogue()} disabled={playingLine !== null}>
            {playingLine !== null ? `🔉 Playing ${playingLine + 1}/${exercise.lines.length}` : plays ? '🔁 Play again' : '▶️ Play the dialogue'}
          </Button>
          <Button variant="ghost" onClick={() => playDialogue(0.7)} disabled={playingLine !== null}>
            🐢 Slower
          </Button>
        </div>
      ) : (
        <p className="text-sm text-amber-700">Audio isn't available in this browser — read the transcript instead.</p>
      )}

      {ttsAvailable() && plays === 0 && <p className="mt-4 text-sm text-slate-500">Listen first — the questions appear once the dialogue starts.</p>}
      <ol className={cx('mt-5 space-y-5', ttsAvailable() && plays === 0 && 'hidden')}>
        {exercise.questions.map((q, qi) => (
          <li key={qi}>
            <p className="mb-2 font-semibold text-slate-900">
              {qi + 1}. {q.prompt}
            </p>
            <Options options={q.options} answer={q.answer} picked={answers[qi]} onPick={(i) => setAnswers(answers.map((a, j) => (j === qi ? i : a)))} />
          </li>
        ))}
      </ol>

      {(allAnswered || !ttsAvailable()) && (
        <div className="mt-4">
          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setShowScript(!showScript)}>
            {showScript ? 'Hide' : 'Show'} transcript
          </button>
          {showScript && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
              {exercise.lines.map((l, i) => (
                <p key={i} className={cx(playingLine === i && 'font-semibold text-brand-700')}>
                  <span className="mr-1 font-bold text-slate-400">{l.speaker}:</span>
                  {l.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {allAnswered && (
        <>
          <Feedback verdict={verdictFor(score)} title={`${Math.round(score * exercise.questions.length)} / ${exercise.questions.length} correct`} />
          <Actions>
            <ContinueButton onClick={() => onComplete(score)} />
          </Actions>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Microphone helper: speech recognition + recording for playback
// ---------------------------------------------------------------------------

function useMic(language: LanguageCode, continuous: boolean) {
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle');
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<{ listening?: Listening; recording?: Recording } | null>(null);
  const canRecognise = recognitionAvailable();
  const canRecord = recordingAvailable();

  useEffect(
    () => () => {
      session.current?.listening?.stop();
      void session.current?.recording?.stop();
    },
    [],
  );

  const start = async () => {
    stopSpeaking();
    setError(null);
    setTranscript('');
    setAudioUrl(null);
    const s: { listening?: Listening; recording?: Recording } = {};
    session.current = s;
    setState('listening');
    if (canRecord) {
      try {
        s.recording = await startRecording();
      } catch {
        if (!canRecognise) {
          setError('Microphone access was blocked. Allow it in your browser settings.');
          setState('idle');
          return;
        }
      }
    }
    if (canRecognise) {
      s.listening = listen(language, { continuous, onText: setTranscript });
      s.listening.result
        .then((t) => {
          setTranscript(t);
          if (!continuous) void stop();
        })
        .catch((e: Error) => setError(e.message));
    }
  };

  const stop = async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    s.listening?.stop();
    if (s.recording) setAudioUrl(await s.recording.stop());
    setState('done');
  };

  return { state, transcript, audioUrl, error, start, stop, canRecognise, canRecord, available: canRecognise || canRecord };
}

function SelfRating({ onRate, question }: { onRate: (score: number) => void; question: string }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-slate-600">{question}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { label: '😕 Not yet', score: 0.3 },
          { label: '🙂 Okay', score: 0.7 },
          { label: '😄 Great', score: 1 },
        ].map((r) => (
          <Button key={r.label} variant="secondary" onClick={() => onRate(r.score)}>
            {r.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listen & repeat
// ---------------------------------------------------------------------------

export function RepeatView({ exercise, language, onComplete }: ExerciseViewProps<RepeatExercise>) {
  const mic = useMic(language, false);
  const score = mic.canRecognise && mic.transcript ? sentenceSimilarity(exercise.text, mic.transcript) : null;

  return (
    <div>
      <Prompt label="Speaking · listen and repeat">{exercise.text}</Prompt>
      {exercise.translation && <p className="-mt-2 mb-4 text-sm text-slate-500">{exercise.translation}</p>}
      <PlayButton text={exercise.text} language={language} autoPlay label="Model" />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {mic.state === 'listening' ? (
          <Button variant="danger" onClick={mic.stop}>
            ⏹ Stop
          </Button>
        ) : (
          <Button onClick={mic.start} disabled={!mic.available}>
            🎙️ {mic.state === 'done' ? 'Try again' : 'Record yourself'}
          </Button>
        )}
        {mic.state === 'listening' && <span className="animate-pulse text-sm font-medium text-rose-600">● Listening…</span>}
      </div>
      {!mic.available && <p className="mt-2 text-sm text-amber-700">Your browser can't use the microphone here. Repeat out loud, then rate yourself.</p>}
      {mic.error && <p className="mt-2 text-sm text-rose-600">{mic.error}</p>}
      {mic.transcript && mic.state === 'listening' && <p className="mt-3 text-slate-600">“{mic.transcript}”</p>}

      {mic.state === 'done' && (
        <>
          {mic.audioUrl && <audio className="mt-4 w-full" controls src={mic.audioUrl} />}
          {score !== null ? (
            <>
              <Feedback verdict={verdictFor(score)} title={`Pronunciation match: ${Math.round(score * 100)}%`}>
                <WordDiff expected={exercise.text} actual={mic.transcript} />
                <p className="text-slate-600">We heard: “{mic.transcript}”</p>
              </Feedback>
              <Actions>
                <ContinueButton onClick={() => onComplete(score)} />
              </Actions>
            </>
          ) : (
            <SelfRating question="Compare with the model. How close were you?" onRate={onComplete} />
          )}
        </>
      )}
      {!mic.available && <SelfRating question="How well did you say it?" onRate={onComplete} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free speaking
// ---------------------------------------------------------------------------

export function SpeakView({ exercise, language, onComplete }: ExerciseViewProps<SpeakExercise>) {
  const mic = useMic(language, true);
  const [left, setLeft] = useState(exercise.seconds);
  const [showModel, setShowModel] = useState(false);
  const coverage = targetCoverage(exercise.targets, mic.transcript);
  const wordCount = mic.transcript ? mic.transcript.split(/\s+/).length : 0;

  useEffect(() => {
    if (mic.state !== 'listening') return;
    setLeft(exercise.seconds);
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [mic.state, exercise.seconds]);

  useEffect(() => {
    if (left <= 0 && mic.state === 'listening') void mic.stop();
  }, [left, mic]);

  const finish = (selfScore: number) => {
    // Blend: use of target structures (if measurable) + how it felt.
    const measurable = exercise.targets.length > 0 && mic.canRecognise && mic.transcript;
    onComplete(measurable ? 0.5 * coverage.score + 0.5 * selfScore : selfScore);
  };

  return (
    <div>
      <Prompt label="Speaking · answer out loud">{exercise.prompt}</Prompt>
      {exercise.targets.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600">Try to use:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {exercise.targets.map((t) => {
              const used = coverage.used.includes(t);
              return (
                <span key={t} className={cx('rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset', used ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-slate-50 text-slate-700 ring-slate-200')}>
                  {used && '✓ '}
                  {t}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-sm text-slate-500">
        Aim for about {exercise.seconds >= 60 ? `${Math.round(exercise.seconds / 60)} min` : `${exercise.seconds} s`}. Don't worry about mistakes — keep talking!
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {mic.state === 'listening' ? (
          <>
            <Button variant="danger" onClick={mic.stop}>
              ⏹ I'm done
            </Button>
            <span className="font-mono text-lg font-bold tabular-nums text-rose-600">
              {Math.floor(left / 60)}:{String(Math.max(0, left) % 60).padStart(2, '0')}
            </span>
          </>
        ) : (
          <Button onClick={mic.start} disabled={!mic.available}>
            🎙️ {mic.state === 'done' ? 'Try again' : 'Start speaking'}
          </Button>
        )}
      </div>
      {mic.error && <p className="mt-2 text-sm text-rose-600">{mic.error}</p>}
      {!mic.available && <p className="mt-2 text-sm text-amber-700">Microphone not available — speak out loud anyway, then rate yourself.</p>}
      {mic.transcript && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What we heard · {wordCount} words</p>
          <p className="mt-1 text-slate-800">{mic.transcript}</p>
        </div>
      )}

      {(mic.state === 'done' || !mic.available) && (
        <>
          {mic.audioUrl && <audio className="mt-4 w-full" controls src={mic.audioUrl} />}
          {exercise.targets.length > 0 && mic.canRecognise && mic.state === 'done' && (
            <Feedback verdict={verdictFor(coverage.score)} title={`You used ${coverage.used.length} of ${exercise.targets.length} target expressions`} />
          )}
          {exercise.modelAnswer && (
            <div className="mt-3">
              <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setShowModel(!showModel)}>
                {showModel ? 'Hide' : 'Show'} an example answer
              </button>
              {showModel && (
                <div className="mt-2 space-y-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                  <p>{exercise.modelAnswer}</p>
                  <PlayButton text={exercise.modelAnswer} language={language} slow={false} label="Hear it" />
                </div>
              )}
            </div>
          )}
          <SelfRating question="How fluent did you feel?" onRate={finish} />
        </>
      )}
    </div>
  );
}
