import { assertBet, pick, roundCoins, type RandomSource } from './shared';

export const ROSHAMBO_MOVES = ['rock', 'paper', 'scissors'] as const;
export type RoshamboMove = (typeof ROSHAMBO_MOVES)[number];
export type RoshamboOutcome = 'win' | 'loss' | 'tie';

export interface RoshamboResult {
  readonly bet: number;
  readonly player: RoshamboMove;
  readonly opponent: RoshamboMove;
  readonly outcome: RoshamboOutcome;
  readonly payout: number;
  readonly profit: number;
}

const BEATS: Record<RoshamboMove, RoshamboMove> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export const compareRoshambo = (
  player: RoshamboMove,
  opponent: RoshamboMove,
): RoshamboOutcome => {
  if (player === opponent) return 'tie';
  return BEATS[player] === opponent ? 'win' : 'loss';
};

export const playRoshambo = (
  bet: number,
  player: RoshamboMove,
  random: RandomSource = Math.random,
): RoshamboResult => {
  assertBet(bet);
  if (!ROSHAMBO_MOVES.includes(player)) throw new RangeError('Unknown Roshambo move.');
  const opponent = pick(ROSHAMBO_MOVES, random);
  const outcome = compareRoshambo(player, opponent);
  // A tie pushes. A win returns 1.9x for an overall 96.67% expected return.
  const payout = outcome === 'win' ? roundCoins(bet * 1.9) : outcome === 'tie' ? bet : 0;
  return { bet, player, opponent, outcome, payout, profit: roundCoins(payout - bet) };
};
