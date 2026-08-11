import {
  cashOutClimb,
  chooseClimbTile,
  createClimbRound,
  type ClimbConfig,
  type ClimbState,
} from './towerCore';
import type { RandomSource } from './shared';

export type DragonDifficulty = 'hatchling' | 'wyvern' | 'inferno';
export type DragonTowerState = ClimbState<'dragon-tower', DragonDifficulty>;

export const DRAGON_TOWER_CONFIG: Readonly<Record<DragonDifficulty, ClimbConfig>> = {
  hatchling: { rows: 7, columns: 4, trapsPerRow: 1, houseEdgePerRow: 0.01 },
  wyvern: { rows: 7, columns: 4, trapsPerRow: 2, houseEdgePerRow: 0.01 },
  inferno: { rows: 7, columns: 5, trapsPerRow: 3, houseEdgePerRow: 0.01 },
};

export const startDragonTower = (
  bet: number,
  difficulty: DragonDifficulty,
  random: RandomSource = Math.random,
): DragonTowerState =>
  createClimbRound('dragon-tower', difficulty, bet, DRAGON_TOWER_CONFIG[difficulty], random);

export const chooseDragonEgg = (state: DragonTowerState, egg: number): DragonTowerState =>
  chooseClimbTile(state, egg);

export const cashOutDragonTower = (state: DragonTowerState): DragonTowerState => cashOutClimb(state);
