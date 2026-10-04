import type { Plan, ProgressLog, UserProfile } from '../../models/types';
import type { StorageAdapter } from './types';

const PREFIX = 'levelup:v1:';
const KEYS = { profile: `${PREFIX}profile`, plan: `${PREFIX}plan`, progress: `${PREFIX}progress` } as const;

/** Minimal Storage-like surface so tests can inject an in-memory store. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly store: KeyValueStore;

  constructor(store?: KeyValueStore) {
    this.store = store ?? (typeof localStorage !== 'undefined' ? localStorage : createMemoryStore());
  }

  private read<T>(key: string): T | null {
    try {
      const raw = this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      // Corrupt or inaccessible storage: behave as if empty.
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.store.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Quota exceeded / private mode: keep running in memory rather than crash.
      console.warn(`LevelUp: could not save "${key}"`, err);
    }
  }

  async loadProfile() {
    return this.read<UserProfile>(KEYS.profile);
  }
  async saveProfile(profile: UserProfile) {
    this.write(KEYS.profile, profile);
  }
  async loadPlan() {
    return this.read<Plan>(KEYS.plan);
  }
  async savePlan(plan: Plan) {
    this.write(KEYS.plan, plan);
  }
  async loadProgress() {
    return this.read<ProgressLog>(KEYS.progress);
  }
  async saveProgress(progress: ProgressLog) {
    this.write(KEYS.progress, progress);
  }
  async clear() {
    Object.values(KEYS).forEach((k) => this.store.removeItem(k));
  }
}
