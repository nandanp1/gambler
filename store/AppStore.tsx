import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { evaluateAchievements } from '@/store/achievements';
import { canAfford as walletCanAfford, debitBalance, STARTING_BALANCE } from '@/store/wallet';
import type {
  AppSettings,
  GameResult,
  GameSlug,
  GlobalStats,
  HistoryEvent,
  PendingRound,
  PerGameStats,
  PersistedAppState,
  RewardsState,
} from '@/types';
import { isYesterday, localDateKey } from '@/utils/format';
import { playHaptic, type HapticKind } from '@/utils/haptics';
import { makeId, randomInt } from '@/utils/random';
import { soundManager, type SoundEvent } from '@/utils/sound';
import { clearAppState, loadAppState, saveAppState, saveCriticalAppState } from '@/utils/storage';

const emptyStats = (): GlobalStats => ({
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  coinsWagered: 0,
  coinsWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  perGame: {},
});

const MAX_SAFE_COINS = Number.MAX_SAFE_INTEGER;
const STATE_VERSION = 3;
const MYSTERY_COOLDOWN_MS = 12 * 60 * 60 * 1_000;
const MAX_PLAUSIBLE_CLOCK_ROLLBACK_MS = 366 * 24 * 60 * 60 * 1_000;

const GAME_SLUGS: readonly GameSlug[] = [
  'blackjack',
  'roulette',
  'baccarat',
  'video-poker',
  'slots',
  'plinko',
  'mines',
  'crash',
  'dice',
  'limbo',
  'keno',
  'hilo',
  'wheel',
  'towers',
  'coin-flip',
  'diamonds',
  'roshambo',
  'dragon-tower',
  'poker',
  'scratch',
  'lucky-cups',
  'red-dog',
];
const GAME_SLUG_SET = new Set<string>(GAME_SLUGS);

const isGameSlug = (value: unknown): value is GameSlug =>
  typeof value === 'string' && GAME_SLUG_SET.has(value);

const safeWhole = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_SAFE_COINS, Math.max(0, Math.floor(value)));
};

const safePayout = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(MAX_SAFE_COINS, Math.max(0, Math.round(value)));
};

const safeAdd = (left: number, right: number): number =>
  Math.min(MAX_SAFE_COINS, safeWhole(left) + safeWhole(right));

const isCanonicalDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === value;
};

const isCanonicalMondayKey = (value: unknown): value is string => {
  if (!isCanonicalDateKey(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText), 12).getDay() === 1;
};

export const localWeekKey = (date = new Date()): string => {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
};

const initialRewards = (now = Date.now()): RewardsState => ({
  lastDailyClaimDate: null,
  streak: 0,
  mysteryAvailableAt: now,
  rewardClockAt: now,
  weeklyKey: localWeekKey(new Date(now)),
  weeklyWins: 0,
  weeklyClaimed: false,
  unlockedAchievements: [],
});

export const createInitialState = (now = Date.now()): PersistedAppState => ({
  version: STATE_VERSION,
  persistenceRevision: 0,
  hydrated: false,
  hasCompletedOnboarding: false,
  balance: STARTING_BALANCE,
  xp: 2_140,
  settings: { sound: true, haptics: true, reducedMotion: false, theme: 'lavender' },
  rewards: initialRewards(now),
  stats: emptyStats(),
  history: [],
  pendingRound: null,
});

type Action =
  | { type: 'HYDRATE'; state: Partial<PersistedAppState> | null; now: number }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'START_ROUND'; round: PendingRound }
  | { type: 'ADD_TO_ROUND'; amount: number; game: GameSlug; roundId: string }
  | { type: 'CREDIT'; amount: number }
  | { type: 'SETTLE_ROUND'; roundId: string; game: GameSlug; payout: number; detail?: string; settledAt: number }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'CLAIM_DAILY'; date: string; streak: number; amount: number; claimedAt: number }
  | { type: 'CLAIM_MYSTERY'; amount: number; claimedAt: number }
  | { type: 'CLAIM_WEEKLY'; claimedAt: number }
  | { type: 'SYNC_REWARD_CLOCK'; observedAt: number }
  | { type: 'RESET'; now: number };

const normalizePerGameStats = (value: unknown): GlobalStats['perGame'] => {
  if (!value || typeof value !== 'object') return {};
  const normalized: GlobalStats['perGame'] = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isGameSlug(key) || !raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<PerGameStats>;
    normalized[key] = {
      plays: safeWhole(entry.plays),
      wins: safeWhole(entry.wins),
      losses: safeWhole(entry.losses),
      pushes: safeWhole(entry.pushes),
      coinsWagered: safeWhole(entry.coinsWagered),
      coinsWon: safeWhole(entry.coinsWon),
      bestResult: typeof entry.bestResult === 'number' && Number.isFinite(entry.bestResult)
        ? Math.max(-MAX_SAFE_COINS, Math.min(MAX_SAFE_COINS, Math.round(entry.bestResult)))
        : 0,
    };
  }
  return normalized;
};

const normalizeStats = (value: unknown): GlobalStats => {
  if (!value || typeof value !== 'object') return emptyStats();
  const stats = value as Partial<GlobalStats>;
  return {
    gamesPlayed: safeWhole(stats.gamesPlayed),
    wins: safeWhole(stats.wins),
    losses: safeWhole(stats.losses),
    pushes: safeWhole(stats.pushes),
    coinsWagered: safeWhole(stats.coinsWagered),
    coinsWon: safeWhole(stats.coinsWon),
    currentStreak: safeWhole(stats.currentStreak),
    bestStreak: safeWhole(stats.bestStreak),
    perGame: normalizePerGameStats(stats.perGame),
  };
};

const normalizeHistory = (value: unknown): HistoryEvent[] => {
  if (!Array.isArray(value)) return [];
  const normalized: HistoryEvent[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const event = raw as Partial<HistoryEvent>;
    if (typeof event.id !== 'string' || event.id.length === 0 || !isGameSlug(event.game)) continue;
    const bet = safeWhole(event.bet);
    const payout = safePayout(event.payout);
    normalized.push({
      id: event.id,
      timestamp: safeWhole(event.timestamp),
      game: event.game,
      bet,
      payout,
      net: payout - bet,
      result: payout > bet ? 'win' : payout === bet ? 'push' : 'loss',
      detail: typeof event.detail === 'string' ? event.detail : undefined,
    });
    if (normalized.length === 100) break;
  }
  return normalized;
};

const normalizePendingRound = (value: unknown, now: number): PendingRound | null => {
  if (!value || typeof value !== 'object') return null;
  const pending = value as Partial<PendingRound>;
  if (
    typeof pending.id !== 'string'
    || pending.id.length === 0
    || !isGameSlug(pending.game)
    || typeof pending.bet !== 'number'
    || !Number.isFinite(pending.bet)
    || pending.bet <= 0
  ) return null;
  return {
    id: pending.id,
    game: pending.game,
    bet: Math.min(MAX_SAFE_COINS, Math.ceil(pending.bet)),
    startedAt: typeof pending.startedAt === 'number' && Number.isFinite(pending.startedAt)
      ? safeWhole(pending.startedAt, now)
      : now,
  };
};

const normalizeRewards = (value: unknown, now: number): RewardsState => {
  const base = initialRewards(now);
  if (!value || typeof value !== 'object') return base;
  const rewards = value as Partial<RewardsState>;
  const persistedClock = typeof rewards.rewardClockAt === 'number' && Number.isFinite(rewards.rewardClockAt)
    && rewards.rewardClockAt >= 0
    && rewards.rewardClockAt <= now + MAX_PLAUSIBLE_CLOCK_ROLLBACK_MS
    ? safeWhole(rewards.rewardClockAt, now)
    : now;
  const rewardClockAt = Math.max(now, persistedClock);
  const clockDateKey = localDateKey(new Date(rewardClockAt));
  const weekKey = localWeekKey(new Date(rewardClockAt));
  const persistedWeekMatches = isCanonicalMondayKey(rewards.weeklyKey) && rewards.weeklyKey === weekKey;

  let lastDailyClaimDate: string | null = null;
  if (isCanonicalDateKey(rewards.lastDailyClaimDate)) {
    // A date beyond the persisted clock is corrupt. Mark the clock's date as
    // claimed instead of granting another bonus during recovery.
    lastDailyClaimDate = rewards.lastDailyClaimDate <= clockDateKey
      ? rewards.lastDailyClaimDate
      : clockDateKey;
  }

  const maximumMysteryWait = rewardClockAt + MYSTERY_COOLDOWN_MS;
  const mysteryAvailableAt = typeof rewards.mysteryAvailableAt === 'number'
    && Number.isFinite(rewards.mysteryAvailableAt)
    && rewards.mysteryAvailableAt >= 0
    ? Math.min(maximumMysteryWait, safeWhole(rewards.mysteryAvailableAt, rewardClockAt))
    : rewardClockAt;

  return {
    lastDailyClaimDate,
    streak: Math.min(7, safeWhole(rewards.streak)),
    mysteryAvailableAt,
    rewardClockAt,
    weeklyKey: weekKey,
    weeklyWins: persistedWeekMatches ? Math.min(10, safeWhole(rewards.weeklyWins)) : 0,
    weeklyClaimed: persistedWeekMatches && rewards.weeklyClaimed === true,
    unlockedAchievements: Array.isArray(rewards.unlockedAchievements)
      ? [...new Set(rewards.unlockedAchievements.filter((id): id is string => typeof id === 'string'))]
      : [],
  };
};

const normalizeSettings = (value: unknown, base: AppSettings): AppSettings => {
  if (!value || typeof value !== 'object') return base;
  const settings = value as Partial<AppSettings>;
  return {
    sound: typeof settings.sound === 'boolean' ? settings.sound : base.sound,
    haptics: typeof settings.haptics === 'boolean' ? settings.haptics : base.haptics,
    reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : base.reducedMotion,
    theme: settings.theme === 'light' || settings.theme === 'lavender' ? settings.theme : base.theme,
  };
};

const normalizeDebitAmount = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(MAX_SAFE_COINS, Math.ceil(value));
};

const advanceRewardClock = (rewards: RewardsState, observedAt: number): RewardsState => {
  if (!Number.isFinite(observedAt) || observedAt < 0) return rewards;
  const rewardClockAt = Math.max(rewards.rewardClockAt, safeWhole(observedAt));
  const observedWeek = localWeekKey(new Date(rewardClockAt));
  const weekAdvanced = observedWeek > rewards.weeklyKey;
  if (!weekAdvanced && rewardClockAt === rewards.rewardClockAt) return rewards;
  return {
    ...rewards,
    rewardClockAt,
    weeklyKey: weekAdvanced ? observedWeek : rewards.weeklyKey,
    weeklyWins: weekAdvanced ? 0 : rewards.weeklyWins,
    weeklyClaimed: weekAdvanced ? false : rewards.weeklyClaimed,
  };
};

const syncRewardWeek = (rewards: RewardsState, observedAt: number): RewardsState => {
  if (!Number.isFinite(observedAt) || observedAt < 0) return rewards;
  const rewardClockAt = Math.max(rewards.rewardClockAt, safeWhole(observedAt));
  const observedWeek = localWeekKey(new Date(rewardClockAt));
  if (observedWeek <= rewards.weeklyKey) return rewards;
  return {
    ...rewards,
    rewardClockAt,
    weeklyKey: observedWeek,
    weeklyWins: 0,
    weeklyClaimed: false,
  };
};

const updateStats = (stats: GlobalStats, event: HistoryEvent): GlobalStats => {
  const previous: PerGameStats = stats.perGame[event.game] ?? {
    plays: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    coinsWagered: 0,
    coinsWon: 0,
    bestResult: 0,
  };
  const win = event.result === 'win';
  const loss = event.result === 'loss';
  const push = event.result === 'push';
  const currentStreak = win ? safeAdd(stats.currentStreak, 1) : 0;
  return {
    ...stats,
    gamesPlayed: safeAdd(stats.gamesPlayed, 1),
    wins: safeAdd(stats.wins, win ? 1 : 0),
    losses: safeAdd(stats.losses, loss ? 1 : 0),
    pushes: safeAdd(stats.pushes, push ? 1 : 0),
    coinsWagered: safeAdd(stats.coinsWagered, event.bet),
    coinsWon: safeAdd(stats.coinsWon, event.payout),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    perGame: {
      ...stats.perGame,
      [event.game]: {
        plays: safeAdd(previous.plays, 1),
        wins: safeAdd(previous.wins, win ? 1 : 0),
        losses: safeAdd(previous.losses, loss ? 1 : 0),
        pushes: safeAdd(previous.pushes, push ? 1 : 0),
        coinsWagered: safeAdd(previous.coinsWagered, event.bet),
        coinsWon: safeAdd(previous.coinsWon, event.payout),
        bestResult: Math.max(previous.bestResult, event.net),
      },
    },
  };
};

const recordSettlement = (
  state: PersistedAppState,
  pending: PendingRound,
  rawPayout: number,
  detail: string | undefined,
  settledAt: number,
): PersistedAppState => {
  if (state.history.some((event) => event.id === pending.id)) {
    return { ...state, pendingRound: null };
  }
  const payout = safePayout(rawPayout);
  const settledTime = Number.isFinite(settledAt) ? settledAt : Date.now();
  const result: GameResult = payout > pending.bet ? 'win' : payout === pending.bet ? 'push' : 'loss';
  const event: HistoryEvent = {
    id: pending.id,
    timestamp: safeWhole(settledTime, Date.now()),
    game: pending.game,
    bet: pending.bet,
    payout,
    net: payout - pending.bet,
    result,
    detail,
  };
  const stats = updateStats(state.stats, event);
  const weekly = advanceRewardClock(state.rewards, settledTime);
  const unlockedAchievements = evaluateAchievements(stats, event, weekly.unlockedAchievements);
  return {
    ...state,
    balance: safeAdd(state.balance, payout),
    xp: safeAdd(state.xp, 20 + (result === 'win' ? 40 : 0)),
    stats,
    rewards: {
      ...weekly,
      weeklyWins: safeAdd(weekly.weeklyWins, result === 'win' ? 1 : 0),
      unlockedAchievements,
    },
    history: [event, ...state.history].slice(0, 100),
    pendingRound: null,
  };
};

export const normalizeHydratedState = (
  incoming: Partial<PersistedAppState> | null,
  now = Date.now(),
): PersistedAppState => {
  const base = createInitialState(now);
  if (!incoming || typeof incoming !== 'object') return { ...base, hydrated: true };
  const pendingRound = normalizePendingRound(incoming.pendingRound, now);
  let normalized: PersistedAppState = {
    ...base,
    version: STATE_VERSION,
    persistenceRevision: safeWhole(incoming.persistenceRevision),
    hydrated: true,
    hasCompletedOnboarding: incoming.hasCompletedOnboarding === true,
    balance: safeWhole(incoming.balance, base.balance),
    xp: safeWhole(incoming.xp, base.xp),
    settings: normalizeSettings(incoming.settings, base.settings),
    rewards: normalizeRewards(incoming.rewards, now),
    stats: normalizeStats(incoming.stats),
    history: normalizeHistory(incoming.history),
    pendingRound,
  };
  if (pendingRound) {
    normalized = recordSettlement(normalized, pendingRound, 0, 'interrupted-round-forfeit', now);
    normalized = {
      ...normalized,
      persistenceRevision: safeAdd(safeWhole(incoming.persistenceRevision), 1),
    };
  }
  return normalized;
};

export type AppStoreAction = Action;

const reduceAppState = (state: PersistedAppState, action: Action): PersistedAppState => {
  switch (action.type) {
    case 'HYDRATE':
      return normalizeHydratedState(action.state, action.now);
    case 'COMPLETE_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };
    case 'START_ROUND': {
      if (state.pendingRound) return state;
      const round = normalizePendingRound(action.round, action.round.startedAt);
      if (!round) return state;
      const next = debitBalance(state.balance, round.bet);
      return next === null ? state : { ...state, balance: next, pendingRound: round };
    }
    case 'ADD_TO_ROUND': {
      const amount = normalizeDebitAmount(action.amount);
      const pending = state.pendingRound;
      if (!amount || !pending || pending.id !== action.roundId || pending.game !== action.game) return state;
      const next = debitBalance(state.balance, amount);
      if (next === null) return state;
      return {
        ...state,
        balance: next,
        pendingRound: { ...pending, bet: safeAdd(pending.bet, amount) },
      };
    }
    case 'CREDIT':
      return { ...state, balance: safeAdd(state.balance, action.amount) };
    case 'SETTLE_ROUND': {
      const pending = state.pendingRound;
      if (!pending || pending.id !== action.roundId || pending.game !== action.game) return state;
      return recordSettlement(state, pending, action.payout, action.detail, action.settledAt);
    }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: normalizeSettings({ ...state.settings, ...action.settings }, state.settings) };
    case 'CLAIM_DAILY': {
      if (!Number.isFinite(action.claimedAt) || action.claimedAt < 0 || !isCanonicalDateKey(action.date)) return state;
      const rewards = advanceRewardClock(state.rewards, action.claimedAt);
      const observedDate = localDateKey(new Date(action.claimedAt));
      const highWaterDate = localDateKey(new Date(rewards.rewardClockAt));
      if (
        action.date !== observedDate
        || action.date !== highWaterDate
        || (rewards.lastDailyClaimDate ?? '') >= action.date
      ) {
        return rewards === state.rewards ? state : { ...state, rewards };
      }
      const streak = isYesterday(rewards.lastDailyClaimDate, new Date(action.claimedAt))
        ? (rewards.streak % 7) + 1
        : 1;
      const expectedAmount = [250, 300, 400, 500, 650, 800, 1_500][streak - 1]!;
      if (action.streak !== streak || action.amount !== expectedAmount) return state;
      return {
        ...state,
        balance: safeAdd(state.balance, action.amount),
        rewards: { ...rewards, lastDailyClaimDate: action.date, streak },
      };
    }
    case 'CLAIM_MYSTERY': {
      if (!Number.isFinite(action.claimedAt) || action.claimedAt < 0) return state;
      const previousClock = state.rewards.rewardClockAt;
      const rewards = advanceRewardClock(state.rewards, action.claimedAt);
      if (
        action.claimedAt < previousClock
        || action.claimedAt < rewards.mysteryAvailableAt
        || action.amount < 300
        || action.amount > 1_000
        || action.amount % 100 !== 0
      ) return rewards === state.rewards ? state : { ...state, rewards };
      return {
        ...state,
        balance: safeAdd(state.balance, action.amount),
        rewards: { ...rewards, mysteryAvailableAt: action.claimedAt + MYSTERY_COOLDOWN_MS },
      };
    }
    case 'CLAIM_WEEKLY': {
      if (!Number.isFinite(action.claimedAt) || action.claimedAt < 0) return state;
      const rewards = advanceRewardClock(state.rewards, action.claimedAt);
      if (rewards.weeklyWins < 10 || rewards.weeklyClaimed) {
        return rewards === state.rewards ? state : { ...state, rewards };
      }
      return {
        ...state,
        balance: safeAdd(state.balance, 2_000),
        rewards: { ...rewards, weeklyClaimed: true },
      };
    }
    case 'SYNC_REWARD_CLOCK': {
      const rewards = syncRewardWeek(state.rewards, action.observedAt);
      return rewards === state.rewards ? state : { ...state, rewards };
    }
    case 'RESET':
      return { ...createInitialState(action.now), hydrated: true };
    default:
      return state;
  }
};

export const appStateReducer = (state: PersistedAppState, action: Action): PersistedAppState => {
  const next = reduceAppState(state, action);
  if (next === state || action.type === 'HYDRATE') return next;
  return { ...next, persistenceRevision: safeAdd(state.persistenceRevision, 1) };
};

export interface CompleteGameInput {
  roundId: string;
  game: GameSlug;
  bet: number;
  payout: number;
  result?: GameResult;
  detail?: string;
}

interface AppStoreValue {
  state: PersistedAppState;
  toast: string | null;
  level: number;
  levelProgress: number;
  completeOnboarding: () => void;
  canAfford: (amount: number) => boolean;
  debit: (amount: number, game: GameSlug, options?: { additional?: boolean; roundId?: string }) => string | null;
  credit: (amount: number) => void;
  completeGame: (input: CompleteGameInput) => boolean;
  forfeitPendingRound: (roundId: string) => boolean;
  updateSettings: (settings: Partial<AppSettings>) => void;
  claimDaily: () => number;
  claimMystery: () => number;
  claimWeekly: () => boolean;
  resetData: () => Promise<void>;
  haptic: (kind: HapticKind) => void;
  playSound: (event: SoundEvent) => void;
  showToast: (message: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(appStateReducer, undefined, () => createInitialState());
  const stateRef = useRef(state);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const criticalPersistenceQueueRef = useRef<Promise<void> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dispatchAndMirror = useCallback((action: Action) => {
    const next = appStateReducer(stateRef.current, action);
    stateRef.current = next;
    dispatch(action);
    return next;
  }, []);

  const persistSnapshot = useCallback((snapshot: PersistedAppState): Promise<void> => {
    const pendingSave = persistenceQueueRef.current.then(() => saveAppState(snapshot));
    persistenceQueueRef.current = pendingSave;
    return pendingSave;
  }, []);

  const persistCriticalSnapshot = useCallback((snapshot: PersistedAppState): Promise<void> => {
    const previousStage = criticalPersistenceQueueRef.current;
    // When no critical write is active, call AsyncStorage immediately in this
    // synchronous turn. Later critical writes serialize behind it by revision.
    const staged = previousStage
      ? previousStage.then(() => saveCriticalAppState(snapshot))
      : saveCriticalAppState(snapshot);
    let tracked: Promise<void>;
    tracked = staged.finally(() => {
      if (criticalPersistenceQueueRef.current === tracked) criticalPersistenceQueueRef.current = null;
    });
    criticalPersistenceQueueRef.current = tracked;
    const committed = persistenceQueueRef.current
      .then(() => tracked)
      .then(() => saveAppState(snapshot));
    persistenceQueueRef.current = committed;
    return committed;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    loadAppState().then((stored) => {
      if (!active) return;
      const hydrated = dispatchAndMirror({ type: 'HYDRATE', state: stored, now: Date.now() });
      void persistCriticalSnapshot(hydrated);
    });
    return () => { active = false; };
  }, [dispatchAndMirror, persistCriticalSnapshot]);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => { void persistSnapshot(state); }, 120);
    return () => clearTimeout(timer);
  }, [persistSnapshot, state]);

  useEffect(() => {
    if (!state.hydrated) return;
    const syncRewardClock = () => {
      const previous = stateRef.current;
      const next = dispatchAndMirror({ type: 'SYNC_REWARD_CLOCK', observedAt: Date.now() });
      if (next !== previous) void persistCriticalSnapshot(next);
    };
    syncRewardClock();
    const timer = setInterval(syncRewardClock, 60_000);
    return () => clearInterval(timer);
  }, [dispatchAndMirror, persistCriticalSnapshot, state.hydrated]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 1_900);
  }, []);

  const haptic = useCallback((kind: HapticKind) => {
    void playHaptic(kind, stateRef.current.settings.haptics);
  }, []);

  const playSound = useCallback((event: SoundEvent) => {
    soundManager.play(event, stateRef.current.settings.sound);
  }, []);

  const canAfford = useCallback((amount: number) => walletCanAfford(stateRef.current.balance, amount), []);

  const debit = useCallback((
    amount: number,
    game: GameSlug,
    options?: { additional?: boolean; roundId?: string },
  ): string | null => {
    const debitAmount = normalizeDebitAmount(amount);
    if (!debitAmount || !isGameSlug(game)) {
      showToast('Choose a valid bet');
      haptic('warning');
      return null;
    }
    const current = stateRef.current;
    if (!current.hydrated) {
      showToast('Wallet is still loading');
      return null;
    }
    if (options?.additional) {
      const pending = current.pendingRound;
      if (!pending || !options.roundId || pending.id !== options.roundId || pending.game !== game) {
        showToast('That round is no longer active');
        haptic('warning');
        return null;
      }
      if (!walletCanAfford(current.balance, debitAmount)) {
        showToast('Not enough coins');
        haptic('warning');
        return null;
      }
      const next = dispatchAndMirror({ type: 'ADD_TO_ROUND', amount: debitAmount, game, roundId: pending.id });
      if (next.pendingRound?.bet !== safeAdd(pending.bet, debitAmount)) return null;
      void persistCriticalSnapshot(next);
      haptic('medium');
      playSound('chip');
      return pending.id;
    }
    if (current.pendingRound) {
      showToast('Finish the active round first');
      haptic('warning');
      return null;
    }
    if (!walletCanAfford(current.balance, debitAmount)) {
      showToast('Not enough coins');
      haptic('warning');
      return null;
    }
    let roundId = makeId();
    while (current.history.some((event) => event.id === roundId)) roundId = makeId();
    const round: PendingRound = { id: roundId, game, bet: debitAmount, startedAt: Date.now() };
    const next = dispatchAndMirror({ type: 'START_ROUND', round });
    if (next.pendingRound?.id !== roundId) return null;
    void persistCriticalSnapshot(next);
    haptic('medium');
    playSound('chip');
    return roundId;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, playSound, showToast]);

  const credit = useCallback((amount: number) => {
    const next = dispatchAndMirror({ type: 'CREDIT', amount });
    void persistCriticalSnapshot(next);
    haptic('success');
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot]);

  const completeGame = useCallback((input: CompleteGameInput): boolean => {
    const pending = stateRef.current.pendingRound;
    if (!pending || pending.id !== input.roundId || pending.game !== input.game) return false;
    const payout = safePayout(input.payout);
    const result: GameResult = payout > pending.bet ? 'win' : payout === pending.bet ? 'push' : 'loss';
    const next = dispatchAndMirror({
      type: 'SETTLE_ROUND',
      roundId: input.roundId,
      game: input.game,
      payout,
      detail: input.detail,
      settledAt: Date.now(),
    });
    if (next.pendingRound !== null) return false;
    void persistCriticalSnapshot(next);
    haptic(result === 'win' ? 'success' : result === 'loss' ? 'warning' : 'light');
    playSound(result === 'win' ? 'win' : result === 'loss' ? 'lose' : 'button');
    return true;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, playSound]);

  const forfeitPendingRound = useCallback((roundId: string): boolean => {
    const pending = stateRef.current.pendingRound;
    if (!pending || pending.id !== roundId) return false;
    const next = dispatchAndMirror({
      type: 'SETTLE_ROUND',
      roundId: pending.id,
      game: pending.game,
      payout: 0,
      detail: 'forfeit',
      settledAt: Date.now(),
    });
    if (next.pendingRound !== null) return false;
    void persistCriticalSnapshot(next);
    haptic('warning');
    playSound('lose');
    return true;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, playSound]);

  const completeOnboarding = useCallback(() => {
    const next = dispatchAndMirror({ type: 'COMPLETE_ONBOARDING' });
    void persistCriticalSnapshot(next);
  }, [dispatchAndMirror, persistCriticalSnapshot]);
  const updateSettings = useCallback((settings: Partial<AppSettings>) => dispatchAndMirror({ type: 'UPDATE_SETTINGS', settings }), [dispatchAndMirror]);

  const claimDaily = useCallback(() => {
    const current = stateRef.current.rewards;
    const claimedAt = Date.now();
    const today = localDateKey(new Date(claimedAt));
    if ((current.lastDailyClaimDate ?? '') >= today) return 0;
    const streak = isYesterday(current.lastDailyClaimDate, new Date(claimedAt)) ? (current.streak % 7) + 1 : 1;
    const amount = [250, 300, 400, 500, 650, 800, 1_500][streak - 1]!;
    const previousBalance = stateRef.current.balance;
    const next = dispatchAndMirror({ type: 'CLAIM_DAILY', date: today, streak, amount, claimedAt });
    if (next.rewards.lastDailyClaimDate !== today || next.balance === previousBalance) return 0;
    void persistCriticalSnapshot(next);
    showToast(`Daily bonus +${amount.toLocaleString('en-US')}`);
    haptic('success');
    return amount;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, showToast]);

  const claimMystery = useCallback(() => {
    const claimedAt = Date.now();
    if (claimedAt < stateRef.current.rewards.mysteryAvailableAt) return 0;
    const amount = randomInt(3, 10) * 100;
    const nextAt = claimedAt + MYSTERY_COOLDOWN_MS;
    const next = dispatchAndMirror({ type: 'CLAIM_MYSTERY', amount, claimedAt });
    if (next.rewards.mysteryAvailableAt !== nextAt) return 0;
    void persistCriticalSnapshot(next);
    showToast(`Mystery box +${amount}`);
    haptic('success');
    return amount;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, showToast]);

  const claimWeekly = useCallback(() => {
    const claimedAt = Date.now();
    const beforeSync = stateRef.current;
    const synced = dispatchAndMirror({ type: 'SYNC_REWARD_CLOCK', observedAt: claimedAt });
    if (synced !== beforeSync) {
      void persistCriticalSnapshot(synced);
    }
    const rewards = stateRef.current.rewards;
    if (rewards.weeklyWins < 10 || rewards.weeklyClaimed) return false;
    const next = dispatchAndMirror({ type: 'CLAIM_WEEKLY', claimedAt });
    if (!next.rewards.weeklyClaimed) return false;
    void persistCriticalSnapshot(next);
    showToast('Weekly challenge +2,000');
    haptic('success');
    return true;
  }, [dispatchAndMirror, haptic, persistCriticalSnapshot, showToast]);

  const resetData = useCallback(async () => {
    await persistenceQueueRef.current;
    await clearAppState();
    const next = dispatchAndMirror({ type: 'RESET', now: Date.now() });
    await persistCriticalSnapshot(next);
    showToast('App data reset');
  }, [dispatchAndMirror, persistCriticalSnapshot, showToast]);

  const value = useMemo<AppStoreValue>(() => ({
    state,
    toast,
    level: 12 + Math.floor(state.xp / 3_000),
    levelProgress: (state.xp % 3_000) / 3_000,
    completeOnboarding,
    canAfford,
    debit,
    credit,
    completeGame,
    forfeitPendingRound,
    updateSettings,
    claimDaily,
    claimMystery,
    claimWeekly,
    resetData,
    haptic,
    playSound,
    showToast,
  }), [
    state,
    toast,
    completeOnboarding,
    canAfford,
    debit,
    credit,
    completeGame,
    forfeitPendingRound,
    updateSettings,
    claimDaily,
    claimMystery,
    claimWeekly,
    resetData,
    haptic,
    playSound,
    showToast,
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export const useAppStore = (): AppStoreValue => {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider');
  return value;
};
