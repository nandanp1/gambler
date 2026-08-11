import {
  assertBet,
  roundCoins,
  roundTo,
  uniqueIntegers,
  type RandomSource,
} from './shared';

export interface ClimbConfig {
  readonly rows: number;
  readonly columns: number;
  readonly trapsPerRow: number;
  readonly houseEdgePerRow: number;
}

export interface ClimbRow {
  readonly index: number;
  readonly trapTiles: readonly number[];
}

export interface ClimbSelection {
  readonly row: number;
  readonly tile: number;
  readonly safe: boolean;
}

export type ClimbStatus = 'active' | 'lost' | 'cashed-out' | 'completed';

export interface ClimbState<Game extends string = string, Difficulty extends string = string> {
  readonly game: Game;
  readonly difficulty: Difficulty;
  readonly bet: number;
  readonly config: ClimbConfig;
  readonly board: readonly ClimbRow[];
  readonly selections: readonly ClimbSelection[];
  readonly currentRow: number;
  readonly multiplier: number;
  readonly status: ClimbStatus;
  readonly payout: number;
  readonly profit: number;
}

const validateConfig = (config: ClimbConfig): void => {
  if (!Number.isInteger(config.rows) || config.rows < 1 || config.rows > 20) {
    throw new RangeError('A climb must have between 1 and 20 rows.');
  }
  if (!Number.isInteger(config.columns) || config.columns < 2 || config.columns > 10) {
    throw new RangeError('A climb must have between 2 and 10 columns.');
  }
  if (!Number.isInteger(config.trapsPerRow) || config.trapsPerRow < 1 || config.trapsPerRow >= config.columns) {
    throw new RangeError('Each row needs at least one safe tile and one trap.');
  }
  if (config.houseEdgePerRow < 0 || config.houseEdgePerRow >= 1) {
    throw new RangeError('Per-row house edge must be in [0, 1).');
  }
};

export const climbStepMultiplier = (config: ClimbConfig): number => {
  validateConfig(config);
  const safeChance = (config.columns - config.trapsPerRow) / config.columns;
  return (1 - config.houseEdgePerRow) / safeChance;
};

export const createClimbRound = <Game extends string, Difficulty extends string>(
  game: Game,
  difficulty: Difficulty,
  bet: number,
  config: ClimbConfig,
  random: RandomSource = Math.random,
): ClimbState<Game, Difficulty> => {
  assertBet(bet);
  validateConfig(config);
  const board: ClimbRow[] = Array.from({ length: config.rows }, (_, index) => ({
    index,
    trapTiles: uniqueIntegers(config.trapsPerRow, 0, config.columns - 1, random).sort((a, b) => a - b),
  }));
  return {
    game,
    difficulty,
    bet,
    config,
    board,
    selections: [],
    currentRow: 0,
    multiplier: 1,
    status: 'active',
    payout: 0,
    profit: 0,
  };
};

export const chooseClimbTile = <Game extends string, Difficulty extends string>(
  state: ClimbState<Game, Difficulty>,
  tile: number,
): ClimbState<Game, Difficulty> => {
  if (state.status !== 'active') throw new Error('This climb is no longer active.');
  if (!Number.isInteger(tile) || tile < 0 || tile >= state.config.columns) {
    throw new RangeError(`Tile must be from 0 through ${state.config.columns - 1}.`);
  }
  const row = state.board[state.currentRow]!;
  const safe = !row.trapTiles.includes(tile);
  const selections = [...state.selections, { row: state.currentRow, tile, safe }];
  if (!safe) {
    return { ...state, selections, status: 'lost', payout: 0, profit: -state.bet };
  }

  const multiplier = roundTo(state.multiplier * climbStepMultiplier(state.config), 4);
  const currentRow = state.currentRow + 1;
  if (currentRow === state.config.rows) {
    const payout = roundCoins(state.bet * multiplier);
    return {
      ...state,
      selections,
      currentRow,
      multiplier,
      status: 'completed',
      payout,
      profit: roundCoins(payout - state.bet),
    };
  }
  return { ...state, selections, currentRow, multiplier };
};

export const cashOutClimb = <Game extends string, Difficulty extends string>(
  state: ClimbState<Game, Difficulty>,
): ClimbState<Game, Difficulty> => {
  if (state.status !== 'active') throw new Error('This climb is no longer active.');
  if (state.selections.length === 0) throw new Error('Choose one safe tile before cashing out.');
  const payout = roundCoins(state.bet * state.multiplier);
  return { ...state, status: 'cashed-out', payout, profit: roundCoins(payout - state.bet) };
};

export const climbPotentialPayout = (state: ClimbState): number =>
  roundCoins(state.bet * state.multiplier);

export const climbNextMultiplier = (state: ClimbState): number =>
  roundTo(state.multiplier * climbStepMultiplier(state.config), 4);
