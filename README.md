# LevelUp Language 🚀

LevelUp Language takes a learner from their current CEFR level to a target level with a day-by-day plan that fits the time they have.

- **Onboarding.** The learner picks a language, current level (or takes an optional 10–15 question placement quiz), target level, duration, daily time and main goal.
- **Feasibility check.** The app compares the hours the goal needs (CEFR guided-learning hours, adjusted for language difficulty) with the hours available. When the goal is out of reach it offers three fixes: more weeks, more minutes per day, or a closer intermediate level.
- **Plan.** The plan is split into phases (one per level step), then weeks, then days. Tasks rotate across listening, reading, speaking, writing, vocabulary and grammar. Every week has a review day and every phase ends with a milestone test.
- **Dashboard.** Shows today's tasks with checkboxes, overall progress, the estimated current level, a streak counter, a calendar and upcoming milestones.
- **Interactive exercises.** Vocabulary (spaced-repetition flashcards), grammar, listening (synthesised dialogues, dictation) and speaking (speech recognition, recording), for every level and daily task.
- **Backend.** Accounts, server-side storage, exercise sessions and practice statistics, with an offline mode when the server isn't running.
- **Adaptive.**
  - After missed days, the learner can *extend* the plan or *spread* the unfinished tasks over the remaining days.
  - After each milestone test, the next phase is rebuilt to add practice on weak skills.

## Getting started

Requires **Node 22.13 or newer**. The backend uses Node's built-in SQLite (`node:sqlite`), so there is no database server to install and nothing to compile, including on Windows.

```bash
npm install
npm run dev        # API on :3001 + web app on http://localhost:5173
```

Open **http://localhost:5173**. On the first visit you can create an account, which stores your data on the server, or continue without one, which keeps it in the browser. If the API isn't running, the app starts in offline mode automatically.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the backend and the frontend together (Ctrl + C stops both) |
| `npm run dev:web` / `npm run dev:api` | Starts only one of them |
| `npm test` | Runs all unit and API tests (Vitest) |
| `npm run build` | Type-checks and builds the web app into `dist/` |
| `npm start` | Production: one server on :3001 serving the API **and** the built app (run `npm run build` first) |

Configuration (environment variables, optional):
- `PORT`: API port (default `3001`).
- `DATABASE_PATH`: SQLite file (default `data/levelup.db`, which is git-ignored).

Node prints an `ExperimentalWarning` for SQLite on startup. It is harmless.

## Tech stack

- **Frontend:** React 19, TypeScript (strict), Tailwind CSS v4, Vite.
- **Backend:** Express 5, SQLite (`node:sqlite`), run with `tsx`.
- **Tests:** Vitest.

The backend imports the same pure modules as the frontend (`src/lib`, `src/exercises`, `src/content`). Plan generation and exercise selection are therefore identical online and offline.

## Project structure

```
src/
├── models/types.ts          # Data models: UserProfile, Plan, Phase, Week, Day, Task, ProgressLog…
├── lib/                     # Pure, framework-free domain logic (all unit-tested)
│   ├── cefr.ts              # Levels, guided-learning hours, language difficulty, goal → skill weights
│   ├── feasibility.ts       # checkFeasibility(): hours needed vs available + suggestions
│   ├── planGenerator.ts     # generatePlan(profile) => Plan  (pure & deterministic)
│   ├── contentProvider.ts   # Turns a "slot" (skill, minutes, role) into task text; pluggable
│   ├── progress.ts          # Completion %, streaks, missed days, estimated level, milestones
│   ├── reschedule.ts        # extendSchedule() / redistributeSchedule()
│   ├── adaptation.ts        # scoreMilestone(), adaptWeights(), adaptNextPhase()
│   ├── placement.ts         # scorePlacement()
│   └── dates.ts             # YYYY-MM-DD helpers (DST-safe)
├── content/                 # Content (data only)
│   ├── exercises/           # Exercise banks: es.ts & en.ts (A1 → C1), generic speaking prompts
│   ├── packs/generic.ts     # Language-agnostic templates & themes, A1 → C2
│   ├── packs/spanish.ts     # Spanish pack A1 → C1: themes, grammar, tasks, milestone questions
│   ├── placement.ts         # Placement quizzes (Spanish, English) + can-do self-assessment
│   ├── canDo.ts             # CEFR can-do descriptors per level & skill
│   └── index.ts             # Pack registry & resolution (specific + generic merged)
├── services/
│   ├── api.ts               # Backend client
│   ├── speech.ts            # Text-to-speech, speech recognition, microphone recording
│   ├── exercises.ts         # Sessions / attempts / stats (server or local)
│   ├── storage/             # StorageAdapter + localStorage and API implementations
│   └── ai/planEnricher.ts   # Interface for optional AI-generated task content
├── exercises/               # Exercise engine (pure, tested)
│   ├── types.ts             # Exercise models (flashcard, mcq, cloze, order, match, dictation, listening, repeat, speak)
│   ├── check.ts             # Forgiving answer checking (accents, typos, word-level similarity)
│   ├── select.ts            # buildSession(): picks exercises for a task, deterministic per task
│   ├── srs.ts               # Spaced repetition (Leitner boxes) for vocabulary
│   ├── practice.ts          # Merges a finished session into the progress log
│   └── taskSession.ts       # Plan task → exercise session (shared by client & server)
├── state/
│   ├── AppState.tsx         # React context wiring pure logic ↔ storage
│   └── Session.tsx          # Account vs local mode, login/register
├── components/              # UI building blocks (TaskItem, CalendarView, FeasibilityPanel…)
├── components/exercises/    # One interactive view per exercise type + ExercisePlayer
├── pages/                   # Auth, Onboarding, Dashboard, PlanView, Practice, MilestoneTest, Settings
└── hooks/useHashRoute.ts    # Minimal hash router
server/
├── index.ts                 # Entry point (also serves dist/ in production)
├── app.ts                   # Express app & routes
├── auth.ts                  # scrypt password hashing, session tokens
├── db.ts                    # SQLite + migrations
└── app.test.ts              # API integration tests
```

## Data models

All models are plain JSON in `src/models/types.ts`. Dates are local calendar dates (`YYYY-MM-DD`).

| Model | Purpose |
|---|---|
| `UserProfile` | Language, current/target level, duration (weeks), daily minutes, goal (+ exam), start date |
| `Plan` | `phases[]`, start/end date, stored `FeasibilityResult`, `revision`, generator id |
| `Phase` | One CEFR step (`fromLevel → toLevel`), allocated hours, `skillWeights`, `weeks[]`, milestone day id |
| `Week` | Theme of the week + `days[]` (≤ 7) |
| `Day` | Date, type (`study` / `review` / `milestone`), focus, `tasks[]` |
| `Task` | Stable `id`, title, skill, minutes, instructions, `resourceType`, kind |
| `ProgressLog` | `completedTasks` (taskId → date), `milestoneResults[]`, `events[]` (history) |

Progress is keyed by **task id**, and ids never change. Rescheduling and adaptation can move or rebuild days without losing what the learner has already completed.

## How the plan is generated

1. **Hours per step.** Each level step needs a set number of hours: A1 90 h, A2 100 h, B1 185 h, B2 200 h, C1 200 h and C2 275 h. These come from Cambridge / Alliance Française guided-learning-hour estimates. They are multiplied by a language-difficulty factor based on the FSI categories: Spanish/French ×1, German ×1.2, Russian ×1.6, Japanese/Chinese/Korean/Arabic ×2.2.
2. **Feasibility.** The ratio is `available / required`:
   - ≥ 1 → *realistic*
   - ≥ 0.8 → *ambitious*
   - below 0.8 → *unrealistic*

   Each suggestion is calculated so that applying it makes the plan realistic. A daily time above 4 h is never suggested.
3. **Phases.** Total days are shared between phases in proportion to each step's hours, using the largest-remainder method.
4. **Days.** Every 7th day of a phase is a review day and the last day is the milestone test.
   - A study day opens with a short flashcard warm-up (when there is at least 20 min).
   - The rest of the time is split into 2–6 tasks.
   - Every day's tasks add up exactly to the learner's daily minutes.
5. **Skill balance.** A deficit scheduler picks each task's skill so that the minutes per skill follow the goal's weights (a conversation goal favours speaking and listening, a reading goal favours reading, and so on). No skill appears twice in a day, and every skill appears at least once a week. Exam goals also get a weekly timed past-paper task.
6. **Content.** The `TaskContentProvider` fills each slot from level- and language-specific templates. Language-specific templates come first, followed by generic ones for variety.

`generatePlan` is pure: the same profile always gives the same plan, which keeps it easy to test.

## Adaptive behaviour

- **Missed days**
  - `extendSchedule` moves every unfinished day forward so the plan resumes today. Days already completed stay where they are.
  - `redistributeSchedule` keeps the end date. It spreads unfinished tasks over upcoming days, same phase first and least-loaded day first. Missed milestone days move to today.
- **Milestone tests** have two parts:
  - Auto-graded questions, where the language pack has them (Spanish has them for A1–C1).
  - A self-assessment against the CEFR can-do statement for each skill.

  Each skill's score blends the two 50/50. Skills under 60 are flagged as weak. `adaptWeights` then raises weak skills by up to +60% and lowers strong ones by up to −30%. `adaptNextPhase` rebuilds the next phase with the new weights, leaving alone any day the learner has already started.

## Interactive exercises

Every daily task for **vocabulary, grammar, listening or speaking** has a **▶ Start exercises** button. Reading and writing stay as guided tasks. A session is sized to the task's minutes. Finishing it ticks the task and saves the results.

| Skill | Exercises |
|---|---|
| Vocabulary | Flashcards with pronunciation and spaced repetition (Again / Hard / Good / Easy), match the pairs, "what does X mean?" quizzes. The daily warm-up reviews the cards that are due, then adds up to 5 new ones. |
| Grammar | Fill-in-the-gap (accepts missing accents and small typos, but flags them), multiple choice with explanations, put the words in order. |
| Listening | Dialogues read aloud by two voices, with comprehension questions shown after the first listen. Dictation with word-by-word feedback. "Which word do you hear?" quizzes. All at normal or slow speed. |
| Speaking | Listen and repeat: speech recognition compares what you said with the model sentence. Free speaking: a prompt with a timer and target expressions to use; the transcript shows which ones you used. You can play back your own recording. |

How sessions are built:
- **Content:** Spanish and English have a full bank for every level from A1 to C1, with about 44 items per level (≈ 440 in total), plus quizzes generated from the vocabulary. Plans that go to C2 reuse the C1 bank. Other languages get speaking prompts (the learner answers in the target language). Their other exercises fall back to the task's written instructions.
- **Choice of exercises:** practice sessions use the phase's target level, plus the starting level as a fallback. Exercises the learner hasn't done yet come first. Review-day sessions recycle every level studied so far, weakest scores first. Selection is deterministic per task, so a session is the same on every device.
- **Audio:** everything runs in the browser through the Web Speech API, so there are no audio files and no API keys.
  - Text-to-speech works in all modern browsers.
  - Speech recognition works in Chrome, Edge and Safari. Without it, learners record themselves, listen back, and rate themselves.

## Backend API

All routes are under `/api` and return JSON. Authenticated routes need `Authorization: Bearer <token>`.

| Method & route | Purpose |
|---|---|
| `GET /health` | Liveness check (the client uses it to choose online or offline mode) |
| `POST /auth/register` · `POST /auth/login` | `{ email, password, name? }` → `{ token, user }` |
| `POST /auth/logout` · `GET /me` | End the session / current user |
| `GET /data` | `{ profile, plan, progress }` |
| `PUT /data/profile` · `/data/plan` · `/data/progress` | Save one part |
| `DELETE /data` | Delete the plan, progress and attempts |
| `POST /plan` | `{ profile }` → generates the plan on the server and stores it |
| `POST /sessions` | `{ taskId, today }` → the exercises for that task, chosen using the user's history |
| `POST /attempts` | `{ attempts: [{ exerciseId, skill, level, score }] }`, the attempt log |
| `GET /stats` | Accuracy per skill and activity over the last 14 days |

Security:
- Passwords are hashed with scrypt.
- Only a SHA-256 hash of each session token is stored.
- Every query is scoped to the signed-in user.

When someone creates an account after using the app offline, their local plan is uploaded to it.

## Adding a language

- **Plan content:** create `src/content/packs/<lang>.ts` exporting a `ContentPack` (see `spanish.ts`) and register it in `src/content/index.ts`. Any level or skill the pack leaves out falls back to the generic pack. You can also add a placement quiz in `content/placement.ts`.
- **Exercises:** create `src/content/exercises/<lang>.ts` following `es.ts`, which uses a compact format per level: vocabulary, grammar, dictation, dialogues, repeat sentences and speaking prompts. Register it in `src/content/exercises/index.ts`. The tests check every bank automatically: unique ids, every level and skill covered, valid answers.

## Storage

All persistence goes through `StorageAdapter` (`src/services/storage/types.ts`). There are two implementations:
- `LocalStorageAdapter`: offline mode.
- `ApiStorageAdapter`: account mode. Progress saves are debounced.

To move to another backend, such as Supabase or PostgreSQL, you only need to:
- implement the adapter, or
- swap `server/db.ts` and keep the same routes.

## AI-generated content (optional)

There are two extension points:

- **Your own `TaskContentProvider`.** Pass it to `generatePlan(profile, { provider })`. It must be synchronous and pure.
- **A `PlanEnricher`** (`src/services/ai/planEnricher.ts`). It rewrites task text asynchronously after the plan is generated. `createHttpEnricher(endpoint)` shows the pattern: the browser calls *your* backend, which calls the LLM, so no API key ever reaches the browser. Enrichers must keep task ids, skills, minutes and dates unchanged.

## Limitations

- Accounts have no email verification or password reset yet, and there is no rate limiting on login. Add these before exposing the server publicly.
- If two devices edit progress at the same time, the last save wins.
- Listening, speaking and writing in milestone tests are partly self-assessed. Speech recognition checks words, not the fine details of pronunciation.
- Full exercise banks exist for Spanish and English only. Other languages get speaking prompts and the generic task templates.
- In offline mode, data lives in the browser's localStorage. The largest possible plan (3 years, A0 → C2) is about 2.3 MB.
