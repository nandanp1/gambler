/** Pure European roulette rules and outcome generation. */

export type RandomSource = () => number;

export type RouletteColor = 'green' | 'red' | 'black';
export type RouletteBetKind = 'straight' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high';
export type RouletteBetType =
  | RouletteBetKind
  | 'single'
  | 'number'
  | '1-18'
  | '19-36';

export interface RouletteBet {
  type: RouletteBetType;
  amount: number;
  /** Required for straight/single/number bets. */
  number?: number;
  /** A UI-friendly alias for `number`. */
  value?: number;
}

export interface RouletteBetValidation {
  valid: boolean;
  error?: string;
}

export interface RouletteBetResult {
  bet: RouletteBet;
  won: boolean;
  /** Profit only, excluding the returned stake. */
  profit: number;
  /** Total amount to credit after the stake has already been debited. */
  payout: number;
}

export interface RouletteResolution {
  winningNumber: number;
  color: RouletteColor;
  bets: RouletteBetResult[];
  totalStake: number;
  totalPayout: number;
  net: number;
}

/** Pocket order on a single-zero European wheel, clockwise from zero. */
export const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BLACK_NUMBERS = new Set<number>(
  Array.from({ length: 36 }, (_, index) => index + 1).filter(
    (number) => !RED_NUMBERS.has(number),
  ),
);

/** Standard roulette odds expressed as profit-to-stake multipliers. */
export const ROULETTE_PROFIT_MULTIPLIERS: Readonly<Record<RouletteBetKind, number>> = {
  straight: 35,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
};

const NORMALIZED_TYPES: Readonly<Record<RouletteBetType, RouletteBetKind>> = {
  straight: 'straight',
  single: 'straight',
  number: 'straight',
  red: 'red',
  black: 'black',
  odd: 'odd',
  even: 'even',
  low: 'low',
  '1-18': 'low',
  high: 'high',
  '19-36': 'high',
};

export const isValidRouletteNumber = (number: number): boolean =>
  Number.isInteger(number) && number >= 0 && number <= 36;

/** Alias kept intentionally terse for game-screen callers. */
export const isValidNumber = isValidRouletteNumber;

export const getNumberColor = (number: number): RouletteColor => {
  if (!isValidRouletteNumber(number)) {
    throw new RangeError('Roulette number must be an integer from 0 through 36.');
  }
  if (number === 0) return 'green';
  return RED_NUMBERS.has(number) ? 'red' : 'black';
};

export const isRed = (number: number): boolean =>
  isValidRouletteNumber(number) && RED_NUMBERS.has(number);

export const isBlack = (number: number): boolean =>
  isValidRouletteNumber(number) && BLACK_NUMBERS.has(number);

export const normalizeBetType = (type: RouletteBetType): RouletteBetKind =>
  NORMALIZED_TYPES[type];

const straightNumber = (bet: RouletteBet): number | undefined => bet.number ?? bet.value;

export const validateRouletteBet = (bet: RouletteBet): RouletteBetValidation => {
  if (!(bet.type in NORMALIZED_TYPES)) {
    return { valid: false, error: 'Unknown roulette bet type.' };
  }
  if (!Number.isFinite(bet.amount) || bet.amount <= 0) {
    return { valid: false, error: 'Bet amount must be greater than zero.' };
  }
  if (normalizeBetType(bet.type) === 'straight') {
    const number = straightNumber(bet);
    if (number === undefined || !isValidRouletteNumber(number)) {
      return { valid: false, error: 'Straight bets require a number from 0 through 36.' };
    }
  }
  return { valid: true };
};

export const validateBet = (bet: RouletteBet): boolean => validateRouletteBet(bet).valid;
export const isValidBet = validateBet;

const assertValidBet = (bet: RouletteBet): void => {
  const validation = validateRouletteBet(bet);
  if (!validation.valid) throw new RangeError(validation.error);
};

export const isWinningBet = (bet: RouletteBet, winningNumber: number): boolean => {
  assertValidBet(bet);
  if (!isValidRouletteNumber(winningNumber)) {
    throw new RangeError('Winning number must be an integer from 0 through 36.');
  }

  const type = normalizeBetType(bet.type);
  switch (type) {
    case 'straight':
      return straightNumber(bet) === winningNumber;
    case 'red':
      return isRed(winningNumber);
    case 'black':
      return isBlack(winningNumber);
    case 'odd':
      return winningNumber !== 0 && winningNumber % 2 === 1;
    case 'even':
      return winningNumber !== 0 && winningNumber % 2 === 0;
    case 'low':
      return winningNumber >= 1 && winningNumber <= 18;
    case 'high':
      return winningNumber >= 19 && winningNumber <= 36;
  }
};

export const getPayoutMultiplier = (type: RouletteBetType): number =>
  ROULETTE_PROFIT_MULTIPLIERS[normalizeBetType(type)];

/** Returns profit only. A losing bet returns zero. */
export const calculateProfit = (bet: RouletteBet, winningNumber: number): number =>
  isWinningBet(bet, winningNumber)
    ? bet.amount * getPayoutMultiplier(bet.type)
    : 0;

/**
 * Returns the total credit for a bet after stakes were debited: returned stake +
 * profit. A losing bet returns zero.
 */
export const calculatePayout = (bet: RouletteBet, winningNumber: number): number =>
  isWinningBet(bet, winningNumber)
    ? bet.amount + calculateProfit(bet, winningNumber)
    : 0;

export const resolveBet = (bet: RouletteBet, winningNumber: number): RouletteBetResult => {
  const won = isWinningBet(bet, winningNumber);
  const profit = won ? bet.amount * getPayoutMultiplier(bet.type) : 0;
  return {
    bet: { ...bet },
    won,
    profit,
    payout: won ? bet.amount + profit : 0,
  };
};

export const resolveRouletteBets = (
  bets: readonly RouletteBet[],
  winningNumber: number,
): RouletteResolution => {
  if (!isValidRouletteNumber(winningNumber)) {
    throw new RangeError('Winning number must be an integer from 0 through 36.');
  }
  const results = bets.map((bet) => resolveBet(bet, winningNumber));
  const totalStake = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPayout = results.reduce((sum, result) => sum + result.payout, 0);
  return {
    winningNumber,
    color: getNumberColor(winningNumber),
    bets: results,
    totalStake,
    totalPayout,
    net: totalPayout - totalStake,
  };
};

const unitRandom = (random: RandomSource): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
};

/** Selects the result before any wheel animation begins. */
export const spinRoulette = (random: RandomSource = Math.random): number =>
  Math.floor(unitRandom(random) * 37);

export const spin = spinRoulette;

export const getWheelIndex = (number: number): number => {
  if (!isValidRouletteNumber(number)) {
    throw new RangeError('Roulette number must be an integer from 0 through 36.');
  }
  return EUROPEAN_WHEEL_ORDER.indexOf(number as (typeof EUROPEAN_WHEEL_ORDER)[number]);
};

/**
 * Returns a negative wheel rotation in degrees that puts the chosen pocket under
 * a fixed top pointer after `fullSpins` clockwise rotations.
 */
export const getTargetRotation = (winningNumber: number, fullSpins = 5): number => {
  if (!Number.isInteger(fullSpins) || fullSpins < 0) {
    throw new RangeError('Full spins must be a non-negative integer.');
  }
  const pocketAngle = 360 / EUROPEAN_WHEEL_ORDER.length;
  return -(fullSpins * 360 + getWheelIndex(winningNumber) * pocketAngle);
};
