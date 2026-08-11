import { assertBet, clampRandom, roundCoins, roundTo, type RandomSource } from './shared';

export interface CrashRules {
  readonly houseEdge: number;
  readonly maximumCrashPoint: number;
}

export interface CrashRound {
  readonly bet: number;
  readonly crashPoint: number;
  readonly autoCashOut?: number;
}

export interface CrashSettlement extends CrashRound {
  readonly attemptedAt: number | null;
  readonly status: 'cashed-out' | 'crashed';
  readonly payout: number;
  readonly profit: number;
}

export const DEFAULT_CRASH_RULES: CrashRules = {
  houseEdge: 0.01,
  maximumCrashPoint: 1_000,
};

/**
 * Generates a standard inverse crash curve where P(crashPoint >= x) is
 * approximately (1 - edge) / x. A result of 1.00x is an immediate crash.
 */
export const generateCrashPoint = (
  random: RandomSource = Math.random,
  rules: CrashRules = DEFAULT_CRASH_RULES,
): number => {
  if (rules.houseEdge < 0 || rules.houseEdge >= 1 || rules.maximumCrashPoint < 1) {
    throw new RangeError('Invalid crash rules.');
  }
  const raw = (1 - rules.houseEdge) / (1 - clampRandom(random()));
  return Math.min(rules.maximumCrashPoint, Math.max(1, Math.floor(raw * 100) / 100));
};

export const startCrashRound = (
  bet: number,
  autoCashOut?: number,
  random: RandomSource = Math.random,
  rules: CrashRules = DEFAULT_CRASH_RULES,
): CrashRound => {
  assertBet(bet);
  if (autoCashOut !== undefined && (!Number.isFinite(autoCashOut) || autoCashOut < 1.01)) {
    throw new RangeError('Auto cash-out must be at least 1.01x.');
  }
  return {
    bet,
    crashPoint: generateCrashPoint(random, rules),
    ...(autoCashOut === undefined ? {} : { autoCashOut: roundTo(autoCashOut) }),
  };
};

export const crashMultiplierAt = (elapsedMs: number, growthRate = 0.00012): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || growthRate <= 0) {
    throw new RangeError('Elapsed time must be non-negative and growth rate positive.');
  }
  return roundTo(Math.exp(growthRate * elapsedMs));
};

export const settleCrashRound = (
  round: CrashRound,
  manualCashOutAt?: number,
): CrashSettlement => {
  const attemptedAt = manualCashOutAt ?? round.autoCashOut ?? null;
  if (attemptedAt !== null && (!Number.isFinite(attemptedAt) || attemptedAt < 1)) {
    throw new RangeError('Cash-out multiplier must be at least 1.00x.');
  }
  // Reaching the displayed crash point is already too late.
  const cashedOut = attemptedAt !== null && attemptedAt < round.crashPoint;
  const payout = cashedOut ? roundCoins(round.bet * attemptedAt) : 0;
  return {
    ...round,
    attemptedAt,
    status: cashedOut ? 'cashed-out' : 'crashed',
    payout,
    profit: roundCoins(payout - round.bet),
  };
};

