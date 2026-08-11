import {
  assertBet,
  combinations,
  roundCoins,
  uniqueIntegers,
  type RandomSource,
} from './shared';

export const KENO_NUMBER_COUNT = 40;
export const KENO_DRAW_COUNT = 10;
export const KENO_MAX_PICKS = 10;

/**
 * Total-return multipliers tuned for a 10-of-40 draw. RTP ranges from roughly
 * 86.5% to 92.7%, depending on how many numbers the player selects.
 */
export const KENO_PAYTABLE: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  1: { 1: 3.6 },
  2: { 2: 15 },
  3: { 2: 2, 3: 50 },
  4: { 2: 1.2, 3: 10, 4: 120 },
  5: { 3: 5, 4: 35, 5: 500 },
  6: { 3: 2.5, 4: 13, 5: 120, 6: 1_000 },
  7: { 3: 1.7, 4: 7, 5: 35, 6: 260, 7: 1_700 },
  8: { 4: 5, 5: 25, 6: 125, 7: 750, 8: 3_750 },
  9: { 4: 3.2, 5: 13, 6: 54, 7: 217, 8: 1_300, 9: 5_400 },
  10: { 4: 2, 5: 8, 6: 30, 7: 120, 8: 500, 9: 2_000, 10: 10_000 },
};

export interface KenoResult {
  readonly bet: number;
  readonly selected: readonly number[];
  readonly drawn: readonly number[];
  readonly matched: readonly number[];
  readonly matches: number;
  readonly multiplier: number;
  readonly payout: number;
  readonly profit: number;
  readonly won: boolean;
}

export const validateKenoSelection = (selected: readonly number[]): number[] => {
  if (selected.length < 1 || selected.length > KENO_MAX_PICKS) {
    throw new RangeError(`Select between 1 and ${KENO_MAX_PICKS} Keno numbers.`);
  }
  if (selected.some((number) => !Number.isInteger(number) || number < 1 || number > KENO_NUMBER_COUNT)) {
    throw new RangeError(`Keno numbers must be integers from 1 through ${KENO_NUMBER_COUNT}.`);
  }
  const unique = [...new Set(selected)];
  if (unique.length !== selected.length) throw new RangeError('Keno selections cannot contain duplicates.');
  return unique.sort((a, b) => a - b);
};

export const kenoMatchProbability = (picks: number, matches: number): number => {
  if (!Number.isInteger(picks) || picks < 1 || picks > KENO_MAX_PICKS) return 0;
  return (
    combinations(picks, matches) *
    combinations(KENO_NUMBER_COUNT - picks, KENO_DRAW_COUNT - matches)
  ) / combinations(KENO_NUMBER_COUNT, KENO_DRAW_COUNT);
};

export const getKenoMultiplier = (picks: number, matches: number): number =>
  KENO_PAYTABLE[picks]?.[matches] ?? 0;

export const playKeno = (
  bet: number,
  selected: readonly number[],
  random: RandomSource = Math.random,
): KenoResult => {
  assertBet(bet);
  const normalized = validateKenoSelection(selected);
  const drawn = uniqueIntegers(KENO_DRAW_COUNT, 1, KENO_NUMBER_COUNT, random).sort((a, b) => a - b);
  const drawnSet = new Set(drawn);
  const matched = normalized.filter((number) => drawnSet.has(number));
  const multiplier = getKenoMultiplier(normalized.length, matched.length);
  const payout = roundCoins(bet * multiplier);
  return {
    bet,
    selected: normalized,
    drawn,
    matched,
    matches: matched.length,
    multiplier,
    payout,
    profit: roundCoins(payout - bet),
    won: payout > 0,
  };
};
