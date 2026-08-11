import { assertBet, pick, roundCoins, type RandomSource } from './shared';

export const DIAMOND_COLORS = ['violet', 'blue', 'pink', 'mint', 'gold'] as const;
export type DiamondColor = (typeof DIAMOND_COLORS)[number];

export interface DiamondsResult {
  readonly bet: number;
  readonly choice: DiamondColor;
  readonly result: DiamondColor;
  readonly won: boolean;
  /** Five equally likely colors at 4.75x produce 95% RTP. */
  readonly multiplier: number;
  readonly payout: number;
  readonly profit: number;
}

export const playDiamonds = (
  bet: number,
  choice: DiamondColor,
  random: RandomSource = Math.random,
): DiamondsResult => {
  assertBet(bet);
  if (!DIAMOND_COLORS.includes(choice)) throw new RangeError('Unknown diamond color.');
  const result = pick(DIAMOND_COLORS, random);
  const won = result === choice;
  const multiplier = 4.75;
  const payout = won ? roundCoins(bet * multiplier) : 0;
  return { bet, choice, result, won, multiplier, payout, profit: roundCoins(payout - bet) };
};

