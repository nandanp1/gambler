import { assertBet, clampRandom, roundCoins, roundTo, type RandomSource } from './shared';

export type DiceDirection = 'under' | 'over';

export interface DiceRules {
  readonly houseEdge: number;
}

export interface DiceResult {
  readonly bet: number;
  readonly direction: DiceDirection;
  readonly target: number;
  readonly roll: number;
  /** Win chance as a display percentage, e.g. 50 means 50%. */
  readonly chance: number;
  readonly multiplier: number;
  readonly won: boolean;
  readonly payout: number;
  readonly profit: number;
}

export const DEFAULT_DICE_RULES: DiceRules = { houseEdge: 0.01 };

const toUnits = (value: number): number => Math.round(value * 100);

export const diceWinningOutcomes = (target: number, direction: DiceDirection): number => {
  const units = toUnits(target);
  if (
    !Number.isFinite(target) ||
    target < 0.01 ||
    target > 99.98 ||
    Math.abs(target * 100 - units) > 1e-8
  ) {
    throw new RangeError('Dice target must be a two-decimal value from 0.01 through 99.98.');
  }
  // Rolls are the 10,000 equally likely values 0.00 through 99.99.
  return direction === 'under' ? units : 9_999 - units;
};

export const getDiceOdds = (
  target: number,
  direction: DiceDirection,
  rules: DiceRules = DEFAULT_DICE_RULES,
): { chance: number; multiplier: number } => {
  if (rules.houseEdge < 0 || rules.houseEdge >= 1) {
    throw new RangeError('House edge must be in [0, 1).');
  }
  const chance = diceWinningOutcomes(target, direction) / 10_000;
  return {
    chance: roundTo(chance * 100, 2),
    multiplier: roundTo((1 - rules.houseEdge) / chance, 4),
  };
};

export const playDice = (
  bet: number,
  target: number,
  direction: DiceDirection,
  random: RandomSource = Math.random,
  rules: DiceRules = DEFAULT_DICE_RULES,
): DiceResult => {
  assertBet(bet);
  const { chance, multiplier } = getDiceOdds(target, direction, rules);
  const roll = Math.floor(clampRandom(random()) * 10_000) / 100;
  const won = direction === 'under' ? roll < target : roll > target;
  const payout = won ? roundCoins(bet * multiplier) : 0;
  return {
    bet,
    direction,
    target,
    roll,
    chance,
    multiplier,
    won,
    payout,
    profit: roundCoins(payout - bet),
  };
};
