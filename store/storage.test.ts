import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
    multiGet: vi.fn(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null])),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach((key) => storage.delete(key)); }),
  },
}));
vi.mock('@/utils/haptics', () => ({ playHaptic: vi.fn() }));
vi.mock('@/utils/sound', () => ({ soundManager: { play: vi.fn() } }));

import { createInitialState } from './AppStore';
import { clearAppState, loadAppState, saveAppState, saveCriticalAppState } from '@/utils/storage';

describe('revisioned AsyncStorage shadow', () => {
  beforeEach(() => storage.clear());

  it('loads the newer critical wallet snapshot while the primary write is behind', async () => {
    const primary = { ...createInitialState(), hydrated: true, persistenceRevision: 4, balance: 10_000 };
    const critical = {
      ...primary,
      persistenceRevision: 5,
      balance: 9_900,
      pendingRound: { id: 'journal-round', game: 'dice' as const, bet: 100, startedAt: 1 },
    };
    await saveAppState(primary);
    await saveCriticalAppState(critical);

    await expect(loadAppState()).resolves.toMatchObject({
      persistenceRevision: 5,
      balance: 9_900,
      pendingRound: { id: 'journal-round' },
    });
  });

  it('prefers a newer committed primary snapshot over an older shadow', async () => {
    const base = { ...createInitialState(), hydrated: true };
    await saveCriticalAppState({ ...base, persistenceRevision: 5, balance: 9_900 });
    await saveAppState({ ...base, persistenceRevision: 6, balance: 10_100 });
    await expect(loadAppState()).resolves.toMatchObject({ persistenceRevision: 6, balance: 10_100 });
  });

  it('clears both primary and critical snapshots on reset', async () => {
    const state = { ...createInitialState(), hydrated: true, persistenceRevision: 2 };
    await saveAppState(state);
    await saveCriticalAppState(state);
    await clearAppState();
    await expect(loadAppState()).resolves.toBeNull();
  });
});
