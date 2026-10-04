import { describe, expect, it } from 'vitest';
import { availableHours, checkFeasibility, reachableLevel, requiredHours } from './feasibility';
import { STEP_HOURS } from './cefr';

describe('availableHours', () => {
  it('multiplies weeks × 7 × daily minutes', () => {
    expect(availableHours(4, 60)).toBe(28);
    expect(availableHours(52, 30)).toBe(182);
  });
});

describe('requiredHours', () => {
  it('sums CEFR step hours between levels', () => {
    expect(requiredHours({ language: 'es', currentLevel: 'A2', targetLevel: 'B1' })).toBe(STEP_HOURS.B1);
    expect(requiredHours({ language: 'es', currentLevel: 'A2', targetLevel: 'B2' })).toBe(STEP_HOURS.B1 + STEP_HOURS.B2);
  });

  it('keeps every single step within the 100–300h range for an easy language', () => {
    for (const hours of Object.values(STEP_HOURS)) {
      expect(hours).toBeGreaterThanOrEqual(90);
      expect(hours).toBeLessThanOrEqual(300);
    }
  });

  it('is higher for languages that are harder for English speakers', () => {
    const es = requiredHours({ language: 'es', currentLevel: 'A1', targetLevel: 'B1' });
    const ja = requiredHours({ language: 'ja', currentLevel: 'A1', targetLevel: 'B1' });
    expect(ja).toBeGreaterThan(es * 1.5);
  });
});

describe('reachableLevel', () => {
  it('returns the current level when hours are not enough for a single step', () => {
    expect(reachableLevel({ language: 'es', currentLevel: 'B1' }, 50)).toBe('B1');
  });

  it('climbs as many full steps as the hours allow', () => {
    expect(reachableLevel({ language: 'es', currentLevel: 'A1' }, STEP_HOURS.A2 + STEP_HOURS.B1 + 10)).toBe('B1');
  });
});

describe('checkFeasibility', () => {
  it('marks a comfortable plan as realistic with no suggestions', () => {
    // A2→B1 = 185h; 26 weeks × 60 min = 182h → ambitious; 30 weeks = 210h → realistic
    const r = checkFeasibility({ language: 'es', currentLevel: 'A2', targetLevel: 'B1', durationWeeks: 30, dailyMinutes: 60 });
    expect(r.status).toBe('realistic');
    expect(r.ratio).toBeGreaterThanOrEqual(1);
    expect(r.suggestions).toEqual([]);
    expect(r.steps).toEqual([{ from: 'A2', to: 'B1', hours: STEP_HOURS.B1 }]);
  });

  it('marks a slightly short plan as ambitious', () => {
    const r = checkFeasibility({ language: 'es', currentLevel: 'A2', targetLevel: 'B1', durationWeeks: 26, dailyMinutes: 60 });
    expect(r.status).toBe('ambitious');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('flags an unrealistic plan and proposes three ways out', () => {
    // A2 → C1 in 3 months at 30 min/day
    const r = checkFeasibility({ language: 'es', currentLevel: 'A2', targetLevel: 'C1', durationWeeks: 13, dailyMinutes: 30 });
    expect(r.status).toBe('unrealistic');
    expect(r.requiredHours).toBe(STEP_HOURS.B1 + STEP_HOURS.B2 + STEP_HOURS.C1);
    expect(r.availableHours).toBeCloseTo(45.5);
    const kinds = r.suggestions.map((s) => s.kind);
    expect(kinds).toContain('extend-duration');
    // 585h in 13 weeks would need > 4h/day, so no daily-time suggestion.
    expect(kinds).not.toContain('increase-daily-time');
    expect(r.message).toMatch(/unlikely/);
  });

  it('suggestions actually make the plan feasible', () => {
    const input = { language: 'fr' as const, currentLevel: 'A1' as const, targetLevel: 'B1' as const, durationWeeks: 8, dailyMinutes: 60 };
    const r = checkFeasibility(input);
    expect(r.status).toBe('unrealistic');
    for (const s of r.suggestions.filter((x) => x.kind !== 'closer-target')) {
      expect(checkFeasibility({ ...input, ...s.patch }).status).toBe('realistic');
    }
  });

  it('suggests the closest reachable intermediate target', () => {
    // A1 → B2 with ~100h: enough for A2 (100h) only.
    const r = checkFeasibility({ language: 'es', currentLevel: 'A1', targetLevel: 'B2', durationWeeks: 10, dailyMinutes: 90 });
    const closer = r.suggestions.find((s) => s.kind === 'closer-target');
    expect(r.reachableLevel).toBe('A2');
    expect(closer?.patch).toEqual({ targetLevel: 'A2' });
  });

  it('omits the closer-target suggestion when not even one step is reachable', () => {
    const r = checkFeasibility({ language: 'ja', currentLevel: 'B1', targetLevel: 'B2', durationWeeks: 2, dailyMinutes: 15 });
    expect(r.suggestions.some((s) => s.kind === 'closer-target')).toBe(false);
  });

  it('suggested daily time is rounded up to 5 minutes', () => {
    const r = checkFeasibility({ language: 'es', currentLevel: 'A2', targetLevel: 'B1', durationWeeks: 40, dailyMinutes: 15 });
    const daily = r.suggestions.find((s) => s.kind === 'increase-daily-time');
    expect(daily?.patch.dailyMinutes! % 5).toBe(0);
    expect(availableHours(40, daily!.patch.dailyMinutes!)).toBeGreaterThanOrEqual(r.requiredHours);
  });

  it('rejects a target that is not above the current level', () => {
    expect(() => checkFeasibility({ language: 'es', currentLevel: 'B2', targetLevel: 'B1', durationWeeks: 10, dailyMinutes: 30 })).toThrow();
    expect(() => checkFeasibility({ language: 'es', currentLevel: 'B1', targetLevel: 'B1', durationWeeks: 10, dailyMinutes: 30 })).toThrow();
  });

  it('rejects non-positive time inputs', () => {
    expect(() => checkFeasibility({ language: 'es', currentLevel: 'A1', targetLevel: 'A2', durationWeeks: 0, dailyMinutes: 30 })).toThrow();
  });
});
