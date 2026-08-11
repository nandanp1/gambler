/** Utilities shared by the small, dependency-free game engines. */

export type RandomSource = () => number;

export const clampRandom = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // RandomSource follows Math.random's [0, 1) contract. Clamping here keeps a
  // scripted test source returning 1 from ever producing an out-of-range index.
  return Math.min(value, 1 - Number.EPSILON);
};

export const randomInt = (
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number => {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError('randomInt requires integer bounds with max >= min.');
  }
  return min + Math.floor(clampRandom(random()) * (max - min + 1));
};

export const randomFloat = (
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    throw new RangeError('randomFloat requires finite bounds with max >= min.');
  }
  return min + clampRandom(random()) * (max - min);
};

export const shuffle = <T>(values: readonly T[], random: RandomSource = Math.random): T[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = randomInt(0, index, random);
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled;
};

export const pick = <T>(values: readonly T[], random: RandomSource = Math.random): T => {
  if (values.length === 0) throw new RangeError('Cannot pick from an empty collection.');
  return values[randomInt(0, values.length - 1, random)]!;
};

export const weightedPick = <T>(
  entries: readonly { value: T; weight: number }[],
  random: RandomSource = Math.random,
): T => {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (entries.length === 0 || total <= 0) {
    throw new RangeError('weightedPick requires at least one positive weight.');
  }

  let cursor = clampRandom(random()) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, entry.weight);
    if (cursor < 0) return entry.value;
  }
  return entries[entries.length - 1]!.value;
};

export const assertBet = (bet: number): void => {
  if (!Number.isFinite(bet) || bet <= 0) {
    throw new RangeError('Bet must be a positive finite number.');
  }
};

export const roundCoins = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100;

export const roundTo = (value: number, places = 2): number => {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

export const combinations = (n: number, k: number): number => {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return 0;
  const smaller = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= smaller; index += 1) {
    result = (result * (n - smaller + index)) / index;
  }
  return result;
};

export const uniqueIntegers = (
  count: number,
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number[] => {
  if (!Number.isInteger(count) || count < 0 || count > max - min + 1) {
    throw new RangeError('Requested unique integer count does not fit the range.');
  }
  return shuffle(
    Array.from({ length: max - min + 1 }, (_, index) => min + index),
    random,
  ).slice(0, count);
};

export const scriptedRandom = (values: readonly number[], fallback = 0): RandomSource => {
  let index = 0;
  return () => values[index++] ?? fallback;
};

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  readonly id: `${Rank}-${Suit}`;
}

export const createCard = (rank: Rank, suit: Suit): Card => ({
  rank,
  suit,
  id: `${rank}-${suit}`,
});

export const createDeck = (): Card[] =>
  SUITS.flatMap((suit) => RANKS.map((rank) => createCard(rank, suit)));

export const createShuffledDeck = (random: RandomSource = Math.random): Card[] =>
  shuffle(createDeck(), random);

export const rankIndex = (rank: Rank): number => RANKS.indexOf(rank);
export const rankHighValue = (rank: Rank): number => rankIndex(rank) + 2;

export const assertDeckHas = (deck: readonly Card[], count: number): void => {
  if (deck.length < count) throw new RangeError(`Deck needs at least ${count} cards.`);
};
