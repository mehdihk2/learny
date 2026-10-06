import type { LanguageCode } from '../models/types';

/**
 * Browser speech features:
 *  - Text-to-speech (all modern browsers) for listening exercises.
 *  - Speech recognition (Chrome, Edge, Safari) to check pronunciation.
 *  - MediaRecorder to let learners hear themselves back.
 * Everything degrades gracefully when a feature is missing.
 */

export const SPEECH_LANG: Record<LanguageCode, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ru: 'ru-RU',
  ar: 'ar-SA',
};

// ---------------------------------------------------------------------------
// Text to speech
// ---------------------------------------------------------------------------

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(lang: string, variant = 0): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
  const family = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const pool = exact.length ? exact : family;
  return pool.length ? pool[variant % pool.length] : undefined;
}

/** Voices load asynchronously in Chrome; wait for them once. */
let voicesReady: Promise<void> | null = null;
function waitForVoices(): Promise<void> {
  if (!ttsAvailable()) return Promise.resolve();
  voicesReady ??= new Promise((resolve) => {
    if (window.speechSynthesis.getVoices().length) return resolve();
    const done = () => resolve();
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesReady;
}

export interface SpeakOptions {
  rate?: number;
  /** Use a different voice (e.g. second speaker in a dialogue). */
  variant?: number;
}

export async function speak(text: string, language: LanguageCode, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsAvailable()) return;
  await waitForVoices();
  const lang = SPEECH_LANG[language];
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = opts.rate ?? 0.95;
    const voice = pickVoice(lang, opts.variant ?? 0);
    if (voice) u.voice = voice;
    // Without a second voice, make speaker B sound different.
    if (opts.variant && (!voice || voice === pickVoice(lang, 0))) u.pitch = 0.75;
    // Some browsers occasionally never fire `onend`: don't let a dialogue hang.
    const safety = setTimeout(resolve, 2000 + (text.length * 90) / u.rate);
    const done = () => {
      clearTimeout(safety);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Speech recognition
// ---------------------------------------------------------------------------

interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionAvailable(): boolean {
  return recognitionCtor() !== null;
}

export interface Listening {
  /** Resolves with the full transcript once stopped. */
  result: Promise<string>;
  stop(): void;
}

/**
 * Start listening. `onText` receives the live transcript (final + interim).
 * Rejects with a readable message when the mic is blocked or unavailable.
 */
export function listen(language: LanguageCode, { continuous = false, onText }: { continuous?: boolean; onText?: (t: string) => void } = {}): Listening {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.reject(new Error('Speech recognition is not supported in this browser.')), stop: () => {} };
  const rec = new Ctor();
  rec.lang = SPEECH_LANG[language];
  rec.continuous = continuous;
  rec.interimResults = true;
  let finalText = '';
  let interim = '';
  let failed: string | null = null;

  const result = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      onText?.(`${finalText}${interim}`.trim());
    };
    rec.onerror = (e) => {
      failed =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings.'
          : e.error === 'no-speech'
            ? null
            : `Speech recognition error: ${e.error}`;
    };
    rec.onend = () => (failed ? reject(new Error(failed)) : resolve(`${finalText}${interim}`.trim()));
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}

// ---------------------------------------------------------------------------
// Recording (to listen back)
// ---------------------------------------------------------------------------

export function recordingAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export interface Recording {
  /** Resolves with an object URL for an <audio> element. */
  stop(): Promise<string>;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
        };
        recorder.stop();
      }),
  };
}
