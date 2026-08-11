/** Immutable rules for the 5x5 Mines game. */

export type RandomSource = () => number;
export type MinesRoundStatus = 'active' | 'lost' | 'cashed-out' | 'won';
export type MineTileState = 'hidden' | 'safe' | 'mine';

export interface MinesRoundState {
  gridSize: number;
  tileCount: number;
  bet: number;
  mineCount: number;
  /** Fixed for the lifetime of a round; never regenerated when a tile is opened. */
  minePositions: number[];
  revealedSafePositions: number[];
  status: MinesRoundStatus;
  multiplier: number;
  nextMultiplier: number | null;
  /** Total credit if the player cashes out now (or the settled credit when ended). */
  cashOutValue: number;
  profit: number;
  lastRevealedPosition: number | null;
  houseEdge: number;
}

export interface CreateMinesRoundOptions {
  bet: number;
  mineCount: number;
  gridSize?: number;
  random?: RandomSource;
  /** Enables deterministic fixtures and replay without coupling tests to a shuffle. */
  minePositions?: readonly number[];
  /** Return-to-player factor applied after the first safe reveal. Defaults to 0.97. */
  houseEdge?: number;
}

export interface MinesRoundMetrics {
  multiplier: number;
  nextMultiplier: number | null;
  cashOutValue: number;
  profit: number;
  safeReveals: number;
  safeTilesRemaining: number;
}

export const MINES_GRID_SIZE = 5;
export const MINES_TILE_COUNT = MINES_GRID_SIZE * MINES_GRID_SIZE;
export const DEFAULT_MINES_HOUSE_EDGE = 0.97;

const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
};

const assertTileCount = (tileCount: number): void => {
  if (!Number.isInteger(tileCount) || tileCount < 2) {
    throw new RangeError('Tile count must be an integer of at least two.');
  }
};

const assertMineCount = (mineCount: number, tileCount: number): void => {
  if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount >= tileCount) {
    throw new RangeError(`Mine count must be an integer from 1 through ${tileCount - 1}.`);
  }
};

const assertPosition = (position: number, tileCount: number): void => {
  if (!Number.isInteger(position) || position < 0 || position >= tileCount) {
    throw new RangeError(`Tile position must be an integer from 0 through ${tileCount - 1}.`);
  }
};

/** Fisher-Yates placement guarantees uniqueness without retry loops. */
export const placeMines = (
  mineCount: number,
  tileCount = MINES_TILE_COUNT,
  random: RandomSource = Math.random,
): number[] => {
  assertTileCount(tileCount);
  assertMineCount(mineCount, tileCount);
  const positions = Array.from({ length: tileCount }, (_, index) => index);
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampUnit(random()) * (index + 1));
    [positions[index], positions[swapIndex]] = [positions[swapIndex]!, positions[index]!];
  }
  return positions.slice(0, mineCount).sort((left, right) => left - right);
};

export const createMinePositions = placeMines;

const validateInjectedMines = (
  positions: readonly number[],
  mineCount: number,
  tileCount: number,
): number[] => {
  if (positions.length !== mineCount) {
    throw new RangeError(`Expected exactly ${mineCount} injected mine positions.`);
  }
  positions.forEach((position) => assertPosition(position, tileCount));
  const unique = [...new Set(positions)].sort((left, right) => left - right);
  if (unique.length !== mineCount) throw new RangeError('Mine positions must be unique.');
  return unique;
};

/** Exact n-choose-k for this game's deliberately small board. */
export const combinations = (n: number, k: number): number => {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return 0;
  const smallerK = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= smallerK; index += 1) {
    result = (result * (n - smallerK + index)) / index;
  }
  return result;
};

/**
 * Inverse of the probability of surviving `safeReveals` choices, with a small
 * play-money edge. At zero reveals the player may cancel for exactly their stake.
 */
export const calculateMinesMultiplier = (
  safeReveals: number,
  mineCount: number,
  tileCount = MINES_TILE_COUNT,
  houseEdge = DEFAULT_MINES_HOUSE_EDGE,
): number => {
  assertTileCount(tileCount);
  assertMineCount(mineCount, tileCount);
  const safeTileCount = tileCount - mineCount;
  if (!Number.isInteger(safeReveals) || safeReveals < 0 || safeReveals > safeTileCount) {
    throw new RangeError(`Safe reveals must be from 0 through ${safeTileCount}.`);
  }
  if (!Number.isFinite(houseEdge) || houseEdge <= 0 || houseEdge > 1) {
    throw new RangeError('House edge factor must be greater than zero and at most one.');
  }
  if (safeReveals === 0) return 1;
  const survivalProbability =
    combinations(safeTileCount, safeReveals) / combinations(tileCount, safeReveals);
  return houseEdge / survivalProbability;
};

export const getMultiplier = calculateMinesMultiplier;

export const calculateCashOutValue = (bet: number, multiplier: number): number => {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be greater than zero.');
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new RangeError('Multiplier must be finite and non-negative.');
  }
  return Math.floor(bet * multiplier);
};

const metricsFor = (
  bet: number,
  safeReveals: number,
  mineCount: number,
  tileCount: number,
  houseEdge: number,
): MinesRoundMetrics => {
  const safeTileCount = tileCount - mineCount;
  const multiplier = calculateMinesMultiplier(safeReveals, mineCount, tileCount, houseEdge);
  const nextMultiplier = safeReveals < safeTileCount
    ? calculateMinesMultiplier(safeReveals + 1, mineCount, tileCount, houseEdge)
    : null;
  const cashOutValue = calculateCashOutValue(bet, multiplier);
  return {
    multiplier,
    nextMultiplier,
    cashOutValue,
    profit: cashOutValue - bet,
    safeReveals,
    safeTilesRemaining: safeTileCount - safeReveals,
  };
};

export const getMinesRoundMetrics = (state: MinesRoundState): MinesRoundMetrics => ({
  multiplier: state.multiplier,
  nextMultiplier: state.nextMultiplier,
  cashOutValue: state.cashOutValue,
  profit: state.profit,
  safeReveals: state.revealedSafePositions.length,
  safeTilesRemaining:
    state.tileCount - state.mineCount - state.revealedSafePositions.length,
});

export const createMinesRound = ({
  bet,
  mineCount,
  gridSize = MINES_GRID_SIZE,
  random = Math.random,
  minePositions,
  houseEdge = DEFAULT_MINES_HOUSE_EDGE,
}: CreateMinesRoundOptions): MinesRoundState => {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be greater than zero.');
  if (!Number.isInteger(gridSize) || gridSize < 2) {
    throw new RangeError('Grid size must be an integer of at least two.');
  }
  const tileCount = gridSize * gridSize;
  assertMineCount(mineCount, tileCount);
  // Validate the edge even before any tile is opened.
  calculateMinesMultiplier(0, mineCount, tileCount, houseEdge);
  const fixedMines = minePositions
    ? validateInjectedMines(minePositions, mineCount, tileCount)
    : placeMines(mineCount, tileCount, random);
  const metrics = metricsFor(bet, 0, mineCount, tileCount, houseEdge);
  return {
    gridSize,
    tileCount,
    bet,
    mineCount,
    minePositions: fixedMines,
    revealedSafePositions: [],
    status: 'active',
    multiplier: metrics.multiplier,
    nextMultiplier: metrics.nextMultiplier,
    cashOutValue: metrics.cashOutValue,
    profit: metrics.profit,
    lastRevealedPosition: null,
    houseEdge,
  };
};

export const startMinesRound = (
  bet: number,
  mineCount: number,
  random: RandomSource = Math.random,
): MinesRoundState => createMinesRound({ bet, mineCount, random });

export const startRound = startMinesRound;

export const getTileState = (state: MinesRoundState, position: number): MineTileState => {
  assertPosition(position, state.tileCount);
  if (state.revealedSafePositions.includes(position)) return 'safe';
  if (state.status === 'lost' && state.minePositions.includes(position)) return 'mine';
  return 'hidden';
};

export const revealTile = (state: MinesRoundState, position: number): MinesRoundState => {
  assertPosition(position, state.tileCount);
  if (state.status !== 'active') throw new Error('Cannot reveal a tile after the round has ended.');
  if (state.revealedSafePositions.includes(position)) return state;

  if (state.minePositions.includes(position)) {
    return {
      ...state,
      status: 'lost',
      multiplier: 0,
      nextMultiplier: null,
      cashOutValue: 0,
      profit: -state.bet,
      lastRevealedPosition: position,
    };
  }

  const revealedSafePositions = [...state.revealedSafePositions, position].sort(
    (left, right) => left - right,
  );
  const metrics = metricsFor(
    state.bet,
    revealedSafePositions.length,
    state.mineCount,
    state.tileCount,
    state.houseEdge,
  );
  const allSafeRevealed = metrics.safeTilesRemaining === 0;
  return {
    ...state,
    revealedSafePositions,
    status: allSafeRevealed ? 'won' : 'active',
    multiplier: metrics.multiplier,
    nextMultiplier: metrics.nextMultiplier,
    cashOutValue: metrics.cashOutValue,
    profit: metrics.profit,
    lastRevealedPosition: position,
  };
};

export const cashOutMines = (state: MinesRoundState): MinesRoundState => {
  if (state.status !== 'active') throw new Error('Only an active Mines round can be cashed out.');
  return { ...state, status: 'cashed-out', nextMultiplier: null };
};

export const cashOut = cashOutMines;
