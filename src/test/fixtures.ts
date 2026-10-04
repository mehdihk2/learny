import type { UserProfile } from '../models/types';

export function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    language: 'es',
    currentLevel: 'A2',
    targetLevel: 'B1',
    durationWeeks: 12,
    dailyMinutes: 60,
    goal: 'conversation',
    startDate: '2026-01-05',
    levelSource: 'self-assessed',
    createdAt: '2026-01-04T10:00:00.000Z',
    ...overrides,
  };
}
