import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

vi.mock('@/utils/haptics', () => ({ playHaptic: vi.fn() }));
vi.mock('@/utils/sound', () => ({ soundManager: { play: vi.fn() } }));
vi.mock('@/utils/storage', () => ({
  clearAppState: vi.fn(async () => undefined),
  loadAppState: vi.fn(async () => null),
  saveAppState: vi.fn(async () => undefined),
  saveCriticalAppState: vi.fn(async () => undefined),
}));

import {
  appStateReducer,
  createInitialState,
  localWeekKey,
  normalizeHydratedState,
  type AppStoreAction,
  useAppStore,
} from './AppStore';
import type { PersistedAppState } from '@/types';
import { localDateKey } from '@/utils/format';

const hydratedState = (): PersistedAppState => ({ ...createInitialState(), hydrated: true });

describe('single-active-round wallet transactions', () => {
  it('requires an exact round ID for explicit forfeits', () => {
    type ForfeitPendingRound = ReturnType<typeof useAppStore>['forfeitPendingRound'];
    expectTypeOf<ForfeitPendingRound>().toEqualTypeOf<(roundId: string) => boolean>();
  });

  it('starts one round, rejects overlaps, and only adds matching supplemental bets', () => {
    const base = hydratedState();
    const started = appStateReducer(base, {
      type: 'START_ROUND',
      round: { id: 'round-a', game: 'blackjack', bet: 100, startedAt: 1 },
    });

    expect(started.balance).toBe(base.balance - 100);
    expect(started.pendingRound).toEqual({ id: 'round-a', game: 'blackjack', bet: 100, startedAt: 1 });

    const overlap = appStateReducer(started, {
      type: 'START_ROUND',
      round: { id: 'round-b', game: 'slots', bet: 50, startedAt: 2 },
    });
    expect(overlap).toBe(started);

    const wrongSupplement = appStateReducer(started, {
      type: 'ADD_TO_ROUND', amount: 100, game: 'blackjack', roundId: 'wrong-id',
    });
    expect(wrongSupplement).toBe(started);

    const supplemented = appStateReducer(started, {
      type: 'ADD_TO_ROUND', amount: 100, game: 'blackjack', roundId: 'round-a',
    });
    expect(supplemented.balance).toBe(base.balance - 200);
    expect(supplemented.pendingRound?.bet).toBe(200);
  });

  it('settles by matching round identity exactly once and rounds payout with Math.round', () => {
    const started = appStateReducer(hydratedState(), {
      type: 'START_ROUND',
      round: { id: 'round-settle', game: 'roulette', bet: 100, startedAt: 1 },
    });
    const wrongGame = appStateReducer(started, {
      type: 'SETTLE_ROUND',
      roundId: 'round-settle',
      game: 'slots',
      payout: 999,
      settledAt: 2,
    });
    expect(wrongGame).toBe(started);

    const settled = appStateReducer(started, {
      type: 'SETTLE_ROUND',
      roundId: 'round-settle',
      game: 'roulette',
      payout: 100.5,
      settledAt: 2,
    });
    expect(settled.pendingRound).toBeNull();
    expect(settled.balance).toBe(hydratedState().balance + 1);
    expect(settled.history[0]).toMatchObject({
      id: 'round-settle', game: 'roulette', bet: 100, payout: 101, net: 1, result: 'win',
    });

    const duplicate = appStateReducer(settled, {
      type: 'SETTLE_ROUND',
      roundId: 'round-settle',
      game: 'roulette',
      payout: 500,
      settledAt: 3,
    });
    expect(duplicate).toBe(settled);
    expect(duplicate.history).toHaveLength(1);
  });

  it('uses the accumulated pending bet as the authoritative settlement stake', () => {
    const started = appStateReducer(hydratedState(), {
      type: 'START_ROUND',
      round: { id: 'round-double', game: 'blackjack', bet: 75, startedAt: 1 },
    });
    const doubled = appStateReducer(started, {
      type: 'ADD_TO_ROUND', amount: 75, game: 'blackjack', roundId: 'round-double',
    });
    const settled = appStateReducer(doubled, {
      type: 'SETTLE_ROUND',
      roundId: 'round-double',
      game: 'blackjack',
      payout: 150.49,
      settledAt: 2,
    });
    expect(settled.history[0]).toMatchObject({ bet: 150, payout: 150, net: 0, result: 'push' });
  });

  it('cannot settle a newer round with a stale round ID', () => {
    const first = appStateReducer(hydratedState(), {
      type: 'START_ROUND',
      round: { id: 'old-round', game: 'dice', bet: 10, startedAt: 1 },
    });
    const firstSettled = appStateReducer(first, {
      type: 'SETTLE_ROUND', roundId: 'old-round', game: 'dice', payout: 0, settledAt: 2,
    });
    const newer = appStateReducer(firstSettled, {
      type: 'START_ROUND',
      round: { id: 'new-round', game: 'mines', bet: 25, startedAt: 3 },
    });

    const staleForfeit = appStateReducer(newer, {
      type: 'SETTLE_ROUND', roundId: 'old-round', game: 'dice', payout: 0, settledAt: 4,
    });
    expect(staleForfeit).toBe(newer);
    expect(staleForfeit.pendingRound?.id).toBe('new-round');
  });
});

describe('persistence recovery and normalization', () => {
  it('records a persisted active round as one forfeit without debiting again', () => {
    const now = new Date(2026, 7, 10, 12).getTime();
    const initial = createInitialState(now);
    const recovered = normalizeHydratedState({
      ...initial,
      balance: 9_900,
      pendingRound: { id: 'interrupted', game: 'mines', bet: 100, startedAt: now - 1_000 },
    }, now);

    expect(recovered.balance).toBe(9_900);
    expect(recovered.pendingRound).toBeNull();
    expect(recovered.history[0]).toMatchObject({
      id: 'interrupted', game: 'mines', bet: 100, payout: 0, result: 'loss', detail: 'interrupted-round-forfeit',
    });
    expect(recovered.stats.gamesPlayed).toBe(1);
    expect(recovered.stats.losses).toBe(1);
  });

  it('does not duplicate a recovery already present in history', () => {
    const now = Date.now();
    const state = createInitialState(now);
    const recoveredOnce = normalizeHydratedState({
      ...state,
      balance: 900,
      pendingRound: { id: 'already-recorded', game: 'dice', bet: 100, startedAt: now - 10 },
      history: [{
        id: 'already-recorded', timestamp: now - 5, game: 'dice', bet: 100,
        payout: 0, net: -100, result: 'loss', detail: 'interrupted-round-forfeit',
      }],
      stats: { ...state.stats, gamesPlayed: 1, losses: 1 },
    }, now);
    expect(recoveredOnce.pendingRound).toBeNull();
    expect(recoveredOnce.history).toHaveLength(1);
    expect(recoveredOnce.stats.gamesPlayed).toBe(1);
  });

  it('prevents malformed numeric persistence from producing an invalid wallet', () => {
    const malformed = {
      balance: -500,
      xp: Number.NaN,
      rewards: { mysteryAvailableAt: Number.NaN, weeklyWins: -8 },
      stats: { gamesPlayed: Number.POSITIVE_INFINITY, coinsWon: -10, perGame: {} },
    } as unknown as Partial<PersistedAppState>;
    const normalized = normalizeHydratedState(malformed);
    expect(normalized.balance).toBe(0);
    expect(normalized.xp).toBe(2_140);
    expect(normalized.rewards.weeklyWins).toBe(0);
    expect(normalized.stats.gamesPlayed).toBe(0);
    expect(normalized.stats.coinsWon).toBe(0);
    expect(Number.isFinite(normalized.balance)).toBe(true);
  });

  it('bounds malformed and unsupported future reward persistence', () => {
    const now = new Date(2026, 7, 10, 12).getTime();
    const normalized = normalizeHydratedState({
      rewards: {
        lastDailyClaimDate: '2099-99-99',
        streak: 99,
        mysteryAvailableAt: now + 10 * 365 * 24 * 60 * 60 * 1_000,
        rewardClockAt: now + 10 * 365 * 24 * 60 * 60 * 1_000,
        weeklyKey: '2099-01-01',
        weeklyWins: 999,
        weeklyClaimed: true,
        unlockedAchievements: [],
      },
    }, now);

    expect(normalized.rewards.rewardClockAt).toBe(now);
    expect(normalized.rewards.lastDailyClaimDate).toBeNull();
    expect(normalized.rewards.mysteryAvailableAt).toBe(now + 12 * 60 * 60 * 1_000);
    expect(normalized.rewards.weeklyKey).toBe('2026-08-10');
    expect(normalized.rewards.weeklyWins).toBe(0);
    expect(normalized.rewards.weeklyClaimed).toBe(false);
    expect(normalized.rewards.streak).toBe(7);
  });

  it('clamps a future daily date to the validated reward clock date', () => {
    const now = new Date(2026, 7, 10, 12).getTime();
    const initial = createInitialState(now);
    const normalized = normalizeHydratedState({
      rewards: { ...initial.rewards, lastDailyClaimDate: '2026-08-11' },
    }, now);
    expect(normalized.rewards.lastDailyClaimDate).toBe('2026-08-10');
  });
});

describe('reward idempotency and local weeks', () => {
  beforeEach(() => vi.useRealTimers());

  it('anchors every day in a week to its local Monday', () => {
    expect(localWeekKey(new Date(2026, 7, 10, 12))).toBe('2026-08-10');
    expect(localWeekKey(new Date(2026, 7, 16, 12))).toBe('2026-08-10');
    expect(localWeekKey(new Date(2026, 7, 17, 12))).toBe('2026-08-17');
  });

  it('credits duplicate daily and mystery reducer actions only once', () => {
    const now = Date.now();
    const base = { ...createInitialState(now), hydrated: true };
    const daily: AppStoreAction = {
      type: 'CLAIM_DAILY',
      date: localDateKey(new Date(now)),
      streak: 1,
      amount: 250,
      claimedAt: now,
    };
    const dailyOnce = appStateReducer(base, daily);
    const dailyTwice = appStateReducer(dailyOnce, daily);
    expect(dailyOnce.balance).toBe(base.balance + 250);
    expect(dailyTwice).toBe(dailyOnce);

    const mystery: AppStoreAction = {
      type: 'CLAIM_MYSTERY', amount: 400, claimedAt: now,
    };
    const mysteryOnce = appStateReducer(dailyTwice, mystery);
    const mysteryTwice = appStateReducer(mysteryOnce, mystery);
    expect(mysteryOnce.balance).toBe(dailyTwice.balance + 400);
    expect(mysteryTwice).toBe(mysteryOnce);
  });

  it('credits a weekly reward once and resets progress on the next local Monday', () => {
    const base = hydratedState();
    const eligible = { ...base, rewards: { ...base.rewards, weeklyWins: 10 } };
    const claimedAt = Date.now();
    const claimed = appStateReducer(eligible, { type: 'CLAIM_WEEKLY', claimedAt });
    const duplicate = appStateReducer(claimed, { type: 'CLAIM_WEEKLY', claimedAt });
    expect(claimed.balance).toBe(base.balance + 2_000);
    expect(claimed.rewards.weeklyClaimed).toBe(true);
    expect(duplicate).toBe(claimed);

    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + 7);
    const reset = appStateReducer(claimed, { type: 'SYNC_REWARD_CLOCK', observedAt: nextMonday.getTime() });
    expect(reset.rewards.weeklyWins).toBe(0);
    expect(reset.rewards.weeklyClaimed).toBe(false);
  });

  it('never rolls a persisted weekly high-water mark backward', () => {
    const futureClock = new Date(2026, 7, 17, 12).getTime();
    const rollbackClock = new Date(2026, 7, 10, 12).getTime();
    const base = createInitialState(futureClock);
    const claimed = {
      ...base,
      hydrated: true,
      rewards: { ...base.rewards, weeklyWins: 10, weeklyClaimed: true },
    };

    const syncedBackward = appStateReducer(claimed, {
      type: 'SYNC_REWARD_CLOCK', observedAt: rollbackClock,
    });
    expect(syncedBackward).toBe(claimed);

    const duplicateClaim = appStateReducer(claimed, {
      type: 'CLAIM_WEEKLY', claimedAt: rollbackClock,
    });
    expect(duplicateClaim).toBe(claimed);

    const rehydratedDuringRollback = normalizeHydratedState(claimed, rollbackClock);
    expect(rehydratedDuringRollback.rewards.weeklyKey).toBe('2026-08-17');
    expect(rehydratedDuringRollback.rewards.weeklyWins).toBe(10);
    expect(rehydratedDuringRollback.rewards.weeklyClaimed).toBe(true);
  });

  it('increments persistence revisions only for accepted state transitions', () => {
    const base = hydratedState();
    const started = appStateReducer(base, {
      type: 'START_ROUND',
      round: { id: 'revision-round', game: 'slots', bet: 20, startedAt: 1 },
    });
    expect(started.persistenceRevision).toBe(base.persistenceRevision + 1);

    const rejected = appStateReducer(started, {
      type: 'SETTLE_ROUND', roundId: 'wrong', game: 'slots', payout: 100, settledAt: 2,
    });
    expect(rejected).toBe(started);
    expect(rejected.persistenceRevision).toBe(started.persistenceRevision);
  });
});
