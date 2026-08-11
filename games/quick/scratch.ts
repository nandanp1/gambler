import {
  assertBet,
  roundCoins,
  shuffle,
  weightedPick,
  type RandomSource,
} from './shared';

export const SCRATCH_SYMBOLS = ['cherry', 'star', 'moon', 'crown', 'diamond', 'seven'] as const;
export type ScratchSymbol = (typeof SCRATCH_SYMBOLS)[number];
export type ScratchStatus = 'active' | 'won' | 'lost';

interface ScratchTier {
  readonly symbol?: ScratchSymbol;
  readonly multiplier: number;
}

const SCRATCH_TIERS: readonly { value: ScratchTier; weight: number }[] = [
  { value: { multiplier: 0 }, weight: 658 },
  { value: { symbol: 'cherry', multiplier: 1 }, weight: 150 },
  { value: { symbol: 'star', multiplier: 2 }, weight: 100 },
  { value: { symbol: 'moon', multiplier: 3 }, weight: 50 },
  { value: { symbol: 'crown', multiplier: 5 }, weight: 25 },
  { value: { symbol: 'diamond', multiplier: 10 }, weight: 10 },
  { value: { symbol: 'seven', multiplier: 25 }, weight: 7 },
];

export interface ScratchCell {
  readonly index: number;
  readonly symbol: ScratchSymbol;
  readonly revealed: boolean;
}

export interface ScratchTicket {
  readonly bet: number;
  readonly cells: readonly ScratchCell[];
  readonly winningSymbol?: ScratchSymbol;
  readonly multiplier: number;
  readonly status: ScratchStatus;
  readonly payout: number;
  readonly profit: number;
}

const createLosingGrid = (random: RandomSource): ScratchSymbol[] => {
  // No symbol appears three times, so a losing grid can never look like a win.
  const symbols: ScratchSymbol[] = [
    SCRATCH_SYMBOLS[0], SCRATCH_SYMBOLS[0],
    SCRATCH_SYMBOLS[1], SCRATCH_SYMBOLS[1],
    SCRATCH_SYMBOLS[2], SCRATCH_SYMBOLS[2],
    SCRATCH_SYMBOLS[3], SCRATCH_SYMBOLS[3],
    SCRATCH_SYMBOLS[4],
  ];
  return shuffle(symbols, random);
};

const createWinningGrid = (winner: ScratchSymbol, random: RandomSource): ScratchSymbol[] => {
  const fillers = SCRATCH_SYMBOLS.filter((symbol) => symbol !== winner).slice(0, 3);
  return shuffle([winner, winner, winner, ...fillers, ...fillers], random);
};

export const createScratchTicket = (
  bet: number,
  random: RandomSource = Math.random,
): ScratchTicket => {
  assertBet(bet);
  const tier = weightedPick(SCRATCH_TIERS, random);
  const symbols = tier.symbol
    ? createWinningGrid(tier.symbol, random)
    : createLosingGrid(random);
  return {
    bet,
    cells: symbols.map((symbol, index) => ({ index, symbol, revealed: false })),
    ...(tier.symbol === undefined ? {} : { winningSymbol: tier.symbol }),
    multiplier: tier.multiplier,
    status: 'active',
    payout: 0,
    profit: 0,
  };
};

const settleScratch = (ticket: ScratchTicket, cells: readonly ScratchCell[]): ScratchTicket => {
  const winnerRevealed = ticket.winningSymbol !== undefined &&
    cells.filter((cell) => cell.revealed && cell.symbol === ticket.winningSymbol).length === 3;
  const allRevealed = cells.every((cell) => cell.revealed);
  if (!winnerRevealed && !allRevealed) return { ...ticket, cells };
  const status: ScratchStatus = winnerRevealed ? 'won' : 'lost';
  const payout = winnerRevealed ? roundCoins(ticket.bet * ticket.multiplier) : 0;
  return { ...ticket, cells, status, payout, profit: roundCoins(payout - ticket.bet) };
};

export const revealScratchCell = (ticket: ScratchTicket, index: number): ScratchTicket => {
  if (ticket.status !== 'active') return ticket;
  if (!Number.isInteger(index) || index < 0 || index >= ticket.cells.length) {
    throw new RangeError('Scratch cell index is out of range.');
  }
  const cells = ticket.cells.map((cell) => cell.index === index ? { ...cell, revealed: true } : cell);
  return settleScratch(ticket, cells);
};

export const revealAllScratchCells = (ticket: ScratchTicket): ScratchTicket => {
  if (ticket.status !== 'active') return ticket;
  return settleScratch(ticket, ticket.cells.map((cell) => ({ ...cell, revealed: true })));
};
