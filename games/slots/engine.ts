/** Pure outcome generation and paytable rules for the three-reel Clay Reels game. */

export type RandomSource = () => number;

export type SlotSymbol =
  | '7'
  | 'heart'
  | 'diamond'
  | 'star'
  | 'bell'
  | 'cherry'
  | 'crown';

export type ReelResult = readonly [SlotSymbol, SlotSymbol, SlotSymbol];

export interface WeightedSlotSymbol {
  symbol: SlotSymbol;
  weight: number;
}

export interface SlotPaytableRow {
  symbols: readonly [SlotSymbol, SlotSymbol, SlotSymbol] | 'any-pair';
  label: string;
  multiplier: number;
}

export interface SlotSpinResult {
  symbols: ReelResult;
  bet: number;
  multiplier: number;
  /** Total credit after the spin stake has already been debited. */
  payout: number;
  matchedCount: 0 | 2 | 3;
  isWin: boolean;
  isJackpot: boolean;
}

export const SYMBOLS: readonly SlotSymbol[] = [
  '7',
  'heart',
  'diamond',
  'star',
  'bell',
  'cherry',
  'crown',
];

/** Less common symbols have lower weight; every reel is sampled independently. */
export const SLOT_SYMBOL_WEIGHTS: readonly WeightedSlotSymbol[] = [
  { symbol: '7', weight: 2 },
  { symbol: 'crown', weight: 4 },
  { symbol: 'diamond', weight: 6 },
  { symbol: 'star', weight: 8 },
  { symbol: 'bell', weight: 10 },
  { symbol: 'heart', weight: 12 },
  { symbol: 'cherry', weight: 16 },
];

/** Multipliers are total returns because the wallet debits the stake before a spin. */
export const TRIPLE_MULTIPLIERS: Readonly<Record<SlotSymbol, number>> = {
  '7': 100,
  crown: 30,
  diamond: 20,
  star: 10,
  heart: 8,
  bell: 6,
  cherry: 5,
};

export const PAIR_MULTIPLIER = 1.5;

export const SLOT_PAYTABLE: readonly SlotPaytableRow[] = [
  { symbols: ['7', '7', '7'], label: 'Triple 7', multiplier: 100 },
  { symbols: ['crown', 'crown', 'crown'], label: 'Triple crown', multiplier: 30 },
  { symbols: ['diamond', 'diamond', 'diamond'], label: 'Triple diamond', multiplier: 20 },
  { symbols: ['star', 'star', 'star'], label: 'Triple star', multiplier: 10 },
  { symbols: ['heart', 'heart', 'heart'], label: 'Triple heart', multiplier: 8 },
  { symbols: ['bell', 'bell', 'bell'], label: 'Triple bell', multiplier: 6 },
  { symbols: ['cherry', 'cherry', 'cherry'], label: 'Triple cherry', multiplier: 5 },
  { symbols: 'any-pair', label: 'Any pair', multiplier: PAIR_MULTIPLIER },
];

const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
};

const validateWeights = (weights: readonly WeightedSlotSymbol[]): void => {
  if (weights.length === 0) throw new RangeError('At least one weighted symbol is required.');
  if (weights.some(({ weight }) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError('Symbol weights must be finite and non-negative.');
  }
  if (weights.every(({ weight }) => weight === 0)) {
    throw new RangeError('At least one symbol weight must be greater than zero.');
  }
};

export const pickWeightedSymbol = (
  random: RandomSource = Math.random,
  weights: readonly WeightedSlotSymbol[] = SLOT_SYMBOL_WEIGHTS,
): SlotSymbol => {
  validateWeights(weights);
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = clampUnit(random()) * totalWeight;
  for (const entry of weights) {
    cursor -= entry.weight;
    if (cursor < 0 && entry.weight > 0) return entry.symbol;
  }
  for (let index = weights.length - 1; index >= 0; index -= 1) {
    const entry = weights[index];
    if (entry && entry.weight > 0) return entry.symbol;
  }
  // validateWeights makes this unreachable.
  throw new RangeError('At least one symbol weight must be greater than zero.');
};

/** Generates the actual result before reel animation starts. */
export const spinReels = (
  random: RandomSource = Math.random,
  weights: readonly WeightedSlotSymbol[] = SLOT_SYMBOL_WEIGHTS,
): ReelResult => [
  pickWeightedSymbol(random, weights),
  pickWeightedSymbol(random, weights),
  pickWeightedSymbol(random, weights),
];

function assertReelResult(symbols: readonly SlotSymbol[]): asserts symbols is ReelResult {
  if (symbols.length !== 3) throw new RangeError('Clay Reels requires exactly three symbols.');
}

export const getMatchedCount = (symbols: readonly SlotSymbol[]): 0 | 2 | 3 => {
  assertReelResult(symbols);
  const counts = new Map<SlotSymbol, number>();
  for (const symbol of symbols) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  const highest = Math.max(...counts.values());
  return highest === 3 ? 3 : highest === 2 ? 2 : 0;
};

/** Returns the paytable's total-return multiplier for a three-symbol result. */
export const evaluatePaytable = (symbols: readonly SlotSymbol[]): number => {
  assertReelResult(symbols);
  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    return TRIPLE_MULTIPLIERS[symbols[0]];
  }
  return getMatchedCount(symbols) === 2 ? PAIR_MULTIPLIER : 0;
};

export const calculateSlotPayout = (
  symbols: readonly SlotSymbol[],
  bet: number,
): number => {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be greater than zero.');
  return bet * evaluatePaytable(symbols);
};

export const resolveSlotSpin = (
  symbols: readonly SlotSymbol[],
  bet: number,
): SlotSpinResult => {
  assertReelResult(symbols);
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be greater than zero.');
  const multiplier = evaluatePaytable(symbols);
  const matchedCount = getMatchedCount(symbols);
  return {
    symbols: [symbols[0], symbols[1], symbols[2]],
    bet,
    multiplier,
    payout: bet * multiplier,
    matchedCount,
    isWin: multiplier > 0,
    isJackpot: symbols.every((symbol) => symbol === '7'),
  };
};

export const spinSlots = (
  bet: number,
  random: RandomSource = Math.random,
  weights: readonly WeightedSlotSymbol[] = SLOT_SYMBOL_WEIGHTS,
): SlotSpinResult => resolveSlotSpin(spinReels(random, weights), bet);

export const spin = spinSlots;
export const evaluateSpin = resolveSlotSpin;
