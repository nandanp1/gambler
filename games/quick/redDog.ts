import {
  assertBet,
  assertDeckHas,
  createShuffledDeck,
  rankHighValue,
  roundCoins,
  type Card,
  type RandomSource,
} from './shared';

export type RedDogOutcome = 'win' | 'loss' | 'push';

export interface RedDogResult {
  readonly bet: number;
  readonly posts: readonly [Card, Card];
  readonly thirdCard?: Card;
  readonly spread: number | 'pair';
  readonly outcome: RedDogOutcome;
  readonly multiplier: number;
  readonly payout: number;
  readonly profit: number;
}

export const redDogWinMultiplier = (spread: number | 'pair'): number => {
  if (spread === 'pair') return 12; // 11:1 profit
  if (spread === 1) return 6; // 5:1 profit
  if (spread === 2) return 5;
  if (spread === 3) return 3;
  if (spread >= 4) return 2;
  return 1;
};

export const playRedDog = (
  bet: number,
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): RedDogResult => {
  assertBet(bet);
  const deck = scriptedDeck ? [...scriptedDeck] : createShuffledDeck(random);
  assertDeckHas(deck, 3);
  const posts: readonly [Card, Card] = [deck[0]!, deck[1]!];
  const first = rankHighValue(posts[0].rank);
  const second = rankHighValue(posts[1].rank);

  if (first === second) {
    const thirdCard = deck[2]!;
    const outcome: RedDogOutcome = rankHighValue(thirdCard.rank) === first ? 'win' : 'loss';
    const multiplier = outcome === 'win' ? redDogWinMultiplier('pair') : 0;
    const payout = roundCoins(bet * multiplier);
    return { bet, posts, thirdCard, spread: 'pair', outcome, multiplier, payout, profit: roundCoins(payout - bet) };
  }

  const low = Math.min(first, second);
  const high = Math.max(first, second);
  const spread = high - low - 1;
  if (spread === 0) {
    return { bet, posts, spread, outcome: 'push', multiplier: 1, payout: bet, profit: 0 };
  }

  const thirdCard = deck[2]!;
  const third = rankHighValue(thirdCard.rank);
  const outcome: RedDogOutcome = third > low && third < high ? 'win' : 'loss';
  const multiplier = outcome === 'win' ? redDogWinMultiplier(spread) : 0;
  const payout = roundCoins(bet * multiplier);
  return { bet, posts, thirdCard, spread, outcome, multiplier, payout, profit: roundCoins(payout - bet) };
};
