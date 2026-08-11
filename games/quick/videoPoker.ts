import {
  assertBet,
  assertDeckHas,
  createShuffledDeck,
  rankHighValue,
  roundCoins,
  type Card,
  type RandomSource,
} from './shared';

export type VideoPokerHand =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'jacks-or-better'
  | 'no-win';

export interface VideoPokerDeal {
  readonly bet: number;
  readonly hand: readonly Card[];
  readonly remainingDeck: readonly Card[];
  readonly phase: 'dealt';
}

export interface VideoPokerResult {
  readonly bet: number;
  readonly originalHand: readonly Card[];
  readonly hand: readonly Card[];
  readonly heldIndices: readonly number[];
  readonly rank: VideoPokerHand;
  readonly multiplier: number;
  readonly payout: number;
  readonly profit: number;
  readonly phase: 'complete';
}

/** Classic one-credit Jacks-or-Better total return multipliers. */
export const JACKS_OR_BETTER_PAYTABLE: Readonly<Record<VideoPokerHand, number>> = {
  'royal-flush': 250,
  'straight-flush': 50,
  'four-of-a-kind': 25,
  'full-house': 9,
  flush: 6,
  straight: 4,
  'three-of-a-kind': 3,
  'two-pair': 2,
  'jacks-or-better': 1,
  'no-win': 0,
};

const countRanks = (hand: readonly Card[]): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const card of hand) {
    const value = rankHighValue(card.rank);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
};

const straightHigh = (hand: readonly Card[]): number | null => {
  const unique = [...new Set(hand.map((card) => rankHighValue(card.rank)))].sort((a, b) => a - b);
  if (unique.length !== 5) return null;
  // Ace may be low only in A-2-3-4-5.
  if (unique.join(',') === '2,3,4,5,14') return 5;
  return unique[4]! - unique[0]! === 4 ? unique[4]! : null;
};

export const evaluateVideoPoker = (hand: readonly Card[]): VideoPokerHand => {
  if (hand.length !== 5) throw new RangeError('Video poker requires exactly five cards.');
  const flush = hand.every((card) => card.suit === hand[0]!.suit);
  const high = straightHigh(hand);
  const groups = [...countRanks(hand).entries()].sort(
    ([rankA, countA], [rankB, countB]) => countB - countA || rankB - rankA,
  );
  const counts = groups.map(([, count]) => count);

  if (flush && high === 14 && hand.some((card) => card.rank === '10')) return 'royal-flush';
  if (flush && high !== null) return 'straight-flush';
  if (counts[0] === 4) return 'four-of-a-kind';
  if (counts[0] === 3 && counts[1] === 2) return 'full-house';
  if (flush) return 'flush';
  if (high !== null) return 'straight';
  if (counts[0] === 3) return 'three-of-a-kind';
  if (counts[0] === 2 && counts[1] === 2) return 'two-pair';
  if (counts[0] === 2 && groups[0]![0] >= 11) return 'jacks-or-better';
  return 'no-win';
};

export const dealVideoPoker = (
  bet: number,
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): VideoPokerDeal => {
  assertBet(bet);
  const deck = scriptedDeck ? [...scriptedDeck] : createShuffledDeck(random);
  assertDeckHas(deck, 5);
  return { bet, hand: deck.slice(0, 5), remainingDeck: deck.slice(5), phase: 'dealt' };
};

export const drawVideoPoker = (
  deal: VideoPokerDeal,
  heldIndices: readonly number[],
): VideoPokerResult => {
  const held = [...new Set(heldIndices)].sort((a, b) => a - b);
  if (
    held.length !== heldIndices.length ||
    held.some((index) => !Number.isInteger(index) || index < 0 || index > 4)
  ) {
    throw new RangeError('Held card indices must be unique values from 0 through 4.');
  }
  assertDeckHas(deal.remainingDeck, 5 - held.length);
  let cursor = 0;
  const heldSet = new Set(held);
  const hand = deal.hand.map((card, index) =>
    heldSet.has(index) ? card : deal.remainingDeck[cursor++]!,
  );
  const rank = evaluateVideoPoker(hand);
  const multiplier = JACKS_OR_BETTER_PAYTABLE[rank];
  const payout = roundCoins(deal.bet * multiplier);
  return {
    bet: deal.bet,
    originalHand: deal.hand,
    hand,
    heldIndices: held,
    rank,
    multiplier,
    payout,
    profit: roundCoins(payout - deal.bet),
    phase: 'complete',
  };
};
