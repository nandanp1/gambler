import {
  assertBet,
  assertDeckHas,
  createShuffledDeck,
  rankHighValue,
  roundCoins,
  type Card,
  type RandomSource,
} from './shared';

export type ThreeCardHandName =
  | 'straight-flush'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'pair'
  | 'high-card';

export interface ThreeCardHandRank {
  readonly name: ThreeCardHandName;
  readonly category: number;
  readonly tiebreakers: readonly number[];
}

export interface ThreeCardPokerResult {
  readonly bet: number;
  readonly player: readonly Card[];
  readonly dealer: readonly Card[];
  readonly playerRank: ThreeCardHandRank;
  readonly dealerRank: ThreeCardHandRank;
  readonly outcome: 'win' | 'loss' | 'tie';
  readonly basePayout: number;
  readonly bonusPayout: number;
  readonly payout: number;
  readonly profit: number;
}

const getStraightHigh = (values: readonly number[]): number | null => {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length !== 3) return null;
  if (unique.join(',') === '2,3,14') return 3;
  return unique[2]! - unique[0]! === 2 ? unique[2]! : null;
};

export const rankThreeCardHand = (hand: readonly Card[]): ThreeCardHandRank => {
  if (hand.length !== 3) throw new RangeError('Three Card Poker requires exactly three cards.');
  const values = hand.map((card) => rankHighValue(card.rank));
  const flush = hand.every((card) => card.suit === hand[0]!.suit);
  const straightHigh = getStraightHigh(values);
  const groups = [...new Set(values)].map((value) => ({
    value,
    count: values.filter((candidate) => candidate === value).length,
  })).sort((a, b) => b.count - a.count || b.value - a.value);

  if (flush && straightHigh !== null) return { name: 'straight-flush', category: 5, tiebreakers: [straightHigh] };
  if (groups[0]!.count === 3) return { name: 'three-of-a-kind', category: 4, tiebreakers: [groups[0]!.value] };
  if (straightHigh !== null) return { name: 'straight', category: 3, tiebreakers: [straightHigh] };
  if (flush) return { name: 'flush', category: 2, tiebreakers: [...values].sort((a, b) => b - a) };
  if (groups[0]!.count === 2) {
    return { name: 'pair', category: 1, tiebreakers: [groups[0]!.value, groups[1]!.value] };
  }
  return { name: 'high-card', category: 0, tiebreakers: [...values].sort((a, b) => b - a) };
};

export const compareThreeCardHands = (
  player: ThreeCardHandRank,
  dealer: ThreeCardHandRank,
): -1 | 0 | 1 => {
  if (player.category !== dealer.category) return player.category > dealer.category ? 1 : -1;
  const length = Math.max(player.tiebreakers.length, dealer.tiebreakers.length);
  for (let index = 0; index < length; index += 1) {
    const playerValue = player.tiebreakers[index] ?? 0;
    const dealerValue = dealer.tiebreakers[index] ?? 0;
    if (playerValue !== dealerValue) return playerValue > dealerValue ? 1 : -1;
  }
  return 0;
};

export const playThreeCardPoker = (
  bet: number,
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): ThreeCardPokerResult => {
  assertBet(bet);
  const deck = scriptedDeck ? [...scriptedDeck] : createShuffledDeck(random);
  assertDeckHas(deck, 6);
  const player = [deck[0]!, deck[2]!, deck[4]!];
  const dealer = [deck[1]!, deck[3]!, deck[5]!];
  const playerRank = rankThreeCardHand(player);
  const dealerRank = rankThreeCardHand(dealer);
  const comparison = compareThreeCardHands(playerRank, dealerRank);
  const outcome = comparison > 0 ? 'win' : comparison < 0 ? 'loss' : 'tie';
  const basePayout = outcome === 'win' ? roundCoins(bet * 1.9) : outcome === 'tie' ? bet : 0;
  // Ante-style bonus is paid regardless of the dealer result.
  const bonusMultiplier: Partial<Record<ThreeCardHandName, number>> = {
    straight: 1,
    'three-of-a-kind': 3,
    'straight-flush': 4,
  };
  const bonusPayout = roundCoins(bet * (bonusMultiplier[playerRank.name] ?? 0));
  const payout = roundCoins(basePayout + bonusPayout);
  return {
    bet,
    player,
    dealer,
    playerRank,
    dealerRank,
    outcome,
    basePayout,
    bonusPayout,
    payout,
    profit: roundCoins(payout - bet),
  };
};

