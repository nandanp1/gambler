import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PersistedAppState } from '@/types';

const STORAGE_KEY = '@nandans-gambler/state-v1';
const CRITICAL_STORAGE_KEY = '@nandans-gambler/critical-state-v1';

const parseState = (raw: string | null): Partial<PersistedAppState> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<PersistedAppState>;
  } catch {
    return null;
  }
};

const revisionOf = (state: Partial<PersistedAppState> | null): number => {
  const revision = state?.persistenceRevision;
  return typeof revision === 'number' && Number.isFinite(revision) && revision >= 0
    ? Math.floor(revision)
    : 0;
};

const serializeState = (state: PersistedAppState): string => {
  const { hydrated: _hydrated, ...persistable } = state;
  return JSON.stringify(persistable);
};

export const loadAppState = async (): Promise<Partial<PersistedAppState> | null> => {
  try {
    const entries = await AsyncStorage.multiGet([STORAGE_KEY, CRITICAL_STORAGE_KEY]);
    const primary = parseState(entries.find(([key]) => key === STORAGE_KEY)?.[1] ?? null);
    const critical = parseState(entries.find(([key]) => key === CRITICAL_STORAGE_KEY)?.[1] ?? null);
    if (!primary) return critical;
    if (!critical) return primary;
    return revisionOf(critical) >= revisionOf(primary) ? critical : primary;
  } catch {
    return null;
  }
};

export const saveAppState = async (state: PersistedAppState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch {
    // Persistence should never make a game round fail.
  }
};

/**
 * A compact write-ahead shadow for wallet/reward transitions. It deliberately
 * remains in storage; startup chooses whichever full snapshot has the greater
 * revision, avoiding cleanup races with a newer round.
 */
export const saveCriticalAppState = async (state: PersistedAppState): Promise<void> => {
  try {
    await AsyncStorage.setItem(CRITICAL_STORAGE_KEY, serializeState(state));
  } catch {
    // The primary serialized queue remains the fallback.
  }
};

export const clearAppState = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, CRITICAL_STORAGE_KEY]);
  } catch {
    // Reset still updates in-memory state if storage is unavailable.
  }
};
