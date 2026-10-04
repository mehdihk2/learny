import { describe, expect, it } from 'vitest';
import { makeProfile } from '../../test/fixtures';
import { generatePlan } from '../../lib/planGenerator';
import { emptyProgress } from '../../lib/progress';
import { createMemoryStore, LocalStorageAdapter } from './localStorageAdapter';

describe('LocalStorageAdapter', () => {
  it('round-trips profile, plan and progress', async () => {
    const adapter = new LocalStorageAdapter(createMemoryStore());
    const profile = makeProfile();
    const plan = generatePlan(profile);
    const progress = emptyProgress(plan.id);
    await adapter.saveProfile(profile);
    await adapter.savePlan(plan);
    await adapter.saveProgress(progress);
    expect(await adapter.loadProfile()).toEqual(profile);
    expect(await adapter.loadPlan()).toEqual(plan);
    expect(await adapter.loadProgress()).toEqual(progress);
    await adapter.clear();
    expect(await adapter.loadPlan()).toBeNull();
  });

  it('treats corrupt data as empty', async () => {
    const store = createMemoryStore();
    store.setItem('levelup:v1:plan', '{not json');
    expect(await new LocalStorageAdapter(store).loadPlan()).toBeNull();
  });
});
