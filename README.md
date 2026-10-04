# LevelUp Language 🚀

LevelUp Language takes a learner from their current CEFR level to a target level with a day-by-day plan that fits the time they have.

- **Onboarding.** The learner picks a language, current level (or takes an optional 10–15 question placement quiz), target level, duration, daily time and main goal.
- **Feasibility check.** The app compares the hours the goal needs (CEFR guided-learning hours, adjusted for language difficulty) with the hours available. When the goal is out of reach it offers three fixes: more weeks, more minutes per day, or a closer intermediate level.
- **Plan.** The plan is split into phases (one per level step), then weeks, then days. Tasks rotate across listening, reading, speaking, writing, vocabulary and grammar. Every week has a review day and every phase ends with a milestone test.
- **Dashboard.** Shows today's tasks with checkboxes, overall progress, the estimated current level, a streak counter, a calendar and upcoming milestones.
- **Adaptive.**
  - After missed days, the learner can *extend* the plan or *spread* the unfinished tasks over the remaining days.
  - After each milestone test, the next phase is rebuilt to add practice on weak skills.

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Tech stack

React 19, TypeScript (strict), Tailwind CSS v4, Vite and Vitest. The app has no router or state library. A small hash router and a React context are enough for four screens.

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
├── content/                 # Content templates (data only)
│   ├── packs/generic.ts     # Language-agnostic templates & themes, A1 → C2
│   ├── packs/spanish.ts     # Spanish pack A1 → C1: themes, grammar, tasks, milestone questions
│   ├── placement.ts         # Placement quizzes (Spanish, English) + can-do self-assessment
│   ├── canDo.ts             # CEFR can-do descriptors per level & skill
│   └── index.ts             # Pack registry & resolution (specific + generic merged)
├── services/
│   ├── storage/             # StorageAdapter interface + localStorage implementation
│   └── ai/planEnricher.ts   # Interface for optional AI-generated task content
├── state/AppState.tsx       # React context wiring pure logic ↔ storage
├── components/              # UI building blocks (TaskItem, CalendarView, FeasibilityPanel…)
├── pages/                   # Onboarding, Dashboard, PlanView, MilestoneTest, Settings
└── hooks/useHashRoute.ts    # Minimal hash router
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

## Adding a language pack

Create `src/content/packs/<lang>.ts` exporting a `ContentPack` (see `spanish.ts`), then register it in `src/content/index.ts`. Any level or skill the pack leaves out falls back to the generic pack. You can also add a placement quiz in `content/placement.ts`.

## Adding a backend

All persistence goes through `StorageAdapter` (`src/services/storage/types.ts`), which is async so a network backend can drop in. To add one:

1. Implement the adapter against Supabase or a REST API. The interface comment suggests a table layout.
2. Export it from `src/services/storage/index.ts` instead of `LocalStorageAdapter`.

## AI-generated content (optional)

There are two extension points:

- **Your own `TaskContentProvider`.** Pass it to `generatePlan(profile, { provider })`. It must be synchronous and pure.
- **A `PlanEnricher`** (`src/services/ai/planEnricher.ts`). It rewrites task text asynchronously after the plan is generated. `createHttpEnricher(endpoint)` shows the pattern: the browser calls *your* backend, which calls the LLM, so no API key ever reaches the browser. Enrichers must keep task ids, skills, minutes and dates unchanged.

## Limitations (v1)

- Data lives in the browser's localStorage, so there is no sync across devices. Use **Profile → Export my data** to back it up. The largest possible plan (3 years, A0 → C2) is about 2.3 MB.
- Listening, speaking and writing are measured by self-assessment, because grading them offline isn't possible.
- Only Spanish has tailored content and milestone questions. The other languages use the generic templates and can-do self-assessments.
