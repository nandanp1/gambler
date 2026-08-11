import {
  cashOutClimb,
  chooseClimbTile,
  createClimbRound,
  type ClimbConfig,
  type ClimbState,
} from './towerCore';
import type { RandomSource } from './shared';

export type TowersDifficulty = 'easy' | 'medium' | 'hard';
export type TowersState = ClimbState<'towers', TowersDifficulty>;

export const TOWERS_CONFIG: Readonly<Record<TowersDifficulty, ClimbConfig>> = {
  easy: { rows: 8, columns: 4, trapsPerRow: 1, houseEdgePerRow: 0.01 },
  medium: { rows: 8, columns: 3, trapsPerRow: 1, houseEdgePerRow: 0.01 },
  hard: { rows: 8, columns: 4, trapsPerRow: 2, houseEdgePerRow: 0.01 },
};

export const startTowers = (
  bet: number,
  difficulty: TowersDifficulty,
  random: RandomSource = Math.random,
): TowersState => createClimbRound('towers', difficulty, bet, TOWERS_CONFIG[difficulty], random);

export const chooseTowersTile = (state: TowersState, tile: number): TowersState =>
  chooseClimbTile(state, tile);

export const cashOutTowers = (state: TowersState): TowersState => cashOutClimb(state);
