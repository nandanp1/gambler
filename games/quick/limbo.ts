import { assertBet, clampRandom, roundCoins, type RandomSource } from './shared';

export interface LimboRules {
  readonly houseEdge: number;
  readonly maximumResult: number;
}

export interface LimboResult {
  readonly bet: number;
  readonly target: number;
  readonly result: number;
  readonly winChance: number;
  readonly won: boolean;
  readonly payout: number;
  readonly profit: number;
}

export const DEFAULT_LIMBO_RULES: LimboRules = {
  houseEdge: 0.01,
  maximumResult: 1_000_000,
};

export const generateLimboResult = (
  random: RandomSource = Math.random,
  rules: LimboRules = DEFAULT_LIMBO_RULES,
): number => {
  if (rules.houseEdge < 0 || rules.houseEdge >= 1 || rules.maximumResult < 1) {
    throw new RangeError('Invalid Limbo rules.');
  }
  const raw = (1 - rules.houseEdge) / (1 - clampRandom(random()));
  return Math.min(rules.maximumResult, Math.max(1, Math.floor(raw * 100) / 100));
};

export const playLimbo = (
  bet: number,
  target: number,
  random: RandomSource = Math.random,
  rules: LimboRules = DEFAULT_LIMBO_RULES,
): LimboResult => {
  assertBet(bet);
  if (!Number.isFinite(target) || target < 1.01 || target > rules.maximumResult) {
    throw new RangeError(`Target must be between 1.01x and ${rules.maximumResult}x.`);
  }
  const result = generateLimboResult(random, rules);
  const won = result >= target;
  const payout = won ? roundCoins(bet * target) : 0;
  return {
    bet,
    target,
    result,
    winChance: Math.min(1, (1 - rules.houseEdge) / target),
    won,
    payout,
    profit: roundCoins(payout - bet),
  };
};
