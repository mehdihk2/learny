import type { Plan, ProgressLog, UserProfile } from '../../models/types';
import { api } from '../api';
import type { StorageAdapter } from './types';

interface UserData {
  profile: UserProfile | null;
  plan: Plan | null;
  progress: ProgressLog | null;
}

/**
 * Stores everything on the LevelUp backend. Progress changes (ticking tasks)
 * are frequent, so they are debounced; plan & profile are saved immediately.
 */
export class ApiStorageAdapter implements StorageAdapter {
  private data: Promise<UserData> | null = null;
  private progressTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingProgress: ProgressLog | null = null;

  constructor(private readonly onError: (err: unknown) => void = (e) => console.error(e)) {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => void this.flush(true));
    }
  }

  private load(): Promise<UserData> {
    this.data ??= api<UserData>('GET', '/data');
    return this.data;
  }

  async loadProfile() {
    return (await this.load()).profile;
  }
  async loadPlan() {
    return (await this.load()).plan;
  }
  async loadProgress() {
    return (await this.load()).progress;
  }

  async saveProfile(profile: UserProfile) {
    await api('PUT', '/data/profile', profile).catch(this.onError);
  }
  async savePlan(plan: Plan) {
    await api('PUT', '/data/plan', plan).catch(this.onError);
  }

  async saveProgress(progress: ProgressLog) {
    this.pendingProgress = progress;
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.progressTimer = setTimeout(() => void this.flush(), 600);
  }

  async flush(keepalive = false) {
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.progressTimer = null;
    const p = this.pendingProgress;
    this.pendingProgress = null;
    if (p) await api('PUT', '/data/progress', p, { keepalive }).catch(this.onError);
  }

  async clear() {
    this.pendingProgress = null;
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.data = null;
    await api('DELETE', '/data').catch(this.onError);
  }
}
