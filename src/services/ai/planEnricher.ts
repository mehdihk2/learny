import type { Day, Plan, UserProfile } from '../../models/types';

/**
 * Optional, asynchronous layer on top of the pure rule-based generator.
 *
 * `generatePlan` always produces a complete, usable plan offline. A
 * PlanEnricher can then rewrite task titles/instructions with richer,
 * AI-generated content (e.g. a concrete reading passage, a dialogue to
 * shadow, a writing prompt tailored to the learner's job). It must keep task
 * ids, skills, minutes and dates unchanged so progress stays valid.
 */
export interface PlanEnricher {
  readonly id: string;
  enrichDay(day: Day, ctx: { profile: UserProfile; plan: Plan }): Promise<Day>;
}

/** Default: no enrichment. */
export const noopEnricher: PlanEnricher = {
  id: 'none',
  enrichDay: async (day) => day,
};

/**
 * Example enricher that delegates to a backend endpoint (never call an LLM API
 * directly from the browser — the API key would be exposed). The endpoint
 * receives the day skeleton and returns the same tasks with better text.
 *
 *   POST {endpoint}  { profile, day }  →  { tasks: [{ id, title, instructions }] }
 */
export function createHttpEnricher(endpoint: string): PlanEnricher {
  return {
    id: 'http',
    async enrichDay(day, { profile }) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, day }),
      });
      if (!res.ok) return day;
      const body = (await res.json()) as { tasks?: { id: string; title?: string; instructions?: string }[] };
      const byId = new Map((body.tasks ?? []).map((t) => [t.id, t]));
      return {
        ...day,
        tasks: day.tasks.map((t) => {
          const e = byId.get(t.id);
          return e ? { ...t, title: e.title ?? t.title, instructions: e.instructions ?? t.instructions } : t;
        }),
      };
    },
  };
}
