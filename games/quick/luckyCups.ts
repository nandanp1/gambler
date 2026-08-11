import { assertBet, randomInt, roundCoins, type RandomSource } from './shared';

export type CupIndex = 0 | 1 | 2;

export interface LuckyCupsResult {
  readonly bet: number;
  readonly choice: CupIndex;
  readonly winningCup: CupIndex;
  readonly won: boolean;
  readonly payout: number;
  readonly profit: number;
  /** A UI can replay these swaps without affecting the already-fixed outcome. */
  readonly suggestedSwaps: readonly [CupIndex, CupIndex][];
}

const SWAPS: readonly [CupIndex, CupIndex][] = [
  [0, 1],
  [1, 2],
  [0, 2],
  [0, 1],
  [1, 2],
];

export const playLuckyCups = (
  bet: number,
  choice: CupIndex,
  random: RandomSource = Math.random,
): LuckyCupsResult => {
  assertBet(bet);
  if (choice !== 0 && choice !== 1 && choice !== 2) throw new RangeError('Cup must be 0, 1, or 2.');
  const winningCup = randomInt(0, 2, random) as CupIndex;
  const won = choice === winningCup;
  const payout = won ? roundCoins(bet * 2.85) : 0;
  return {
    bet,
    choice,
    winningCup,
    won,
    payout,
    profit: roundCoins(payout - bet),
    suggestedSwaps: SWAPS,
  };
};
