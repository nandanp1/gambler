import { assertBet, randomInt, roundCoins, type RandomSource } from './shared';

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipResult {
  readonly bet: number;
  readonly choice: CoinSide;
  readonly result: CoinSide;
  readonly won: boolean;
  readonly payout: number;
  readonly profit: number;
}

export const flipCoin = (
  bet: number,
  choice: CoinSide,
  random: RandomSource = Math.random,
): CoinFlipResult => {
  assertBet(bet);
  const result: CoinSide = randomInt(0, 1, random) === 0 ? 'heads' : 'tails';
  const won = result === choice;
  const payout = won ? roundCoins(bet * 2) : 0;
  return { bet, choice, result, won, payout, profit: roundCoins(payout - bet) };
};

