import { LocalStorageAdapter } from './localStorageAdapter';
import type { StorageAdapter } from './types';

export type { StorageAdapter } from './types';
export { LocalStorageAdapter, createMemoryStore } from './localStorageAdapter';

/** Swap this for a Supabase / REST adapter when a backend is added. */
export const storage: StorageAdapter = new LocalStorageAdapter();
