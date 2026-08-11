import { describe, expect, it } from 'vitest';
import {
  cashOutTowers,
  chooseDragonEgg,
  chooseTowersTile,
  createCard,
  dealBaccarat,
  dealVideoPoker,
  drawVideoPoker,
  evaluateVideoPoker,
  flipCoin,
  generateCrashPoint,
  getKenoMultiplier,
  getDiceOdds,
  guessHiLo,
  playBaccarat,
  playDice,
  playDiamonds,
  playKeno,
  playLimbo,
  playLuckyCups,
  playRedDog,
  playRoshambo,
  playThreeCardPoker,
  rankThreeCardHand,
  revealAllScratchCells,
  scriptedRandom,
  settleCrashRound,
  spinWheel,
  startCrashRound,
  startDragonTower,
  startHiLo,
  startTowers,
  createScratchTicket,
} from './index';

const c = createCard;

describe('quick game engines', () => {
  it('uses deterministic roll boundaries and probability-derived dice payouts', () => {
    expect(getDiceOdds(50, 'under')).toEqual({ chance: 50, multiplier: 1.98 });
    expect(playDice(10, 50, 'under', () => 0.4999)).toMatchObject({ roll: 49.99, won: true, payout: 19.8 });
    expect(playDice(10, 50, 'under', () => 0.5)).toMatchObject({ roll: 50, won: false, payout: 0 });
  });

  it('implements the Punto Banco third-card table', () => {
    const deal = dealBaccarat(Math.random, [
      c('2', 'clubs'), // player 2
      c('2', 'diamonds'), // banker 2
      c('3', 'clubs'), // player total 5: draws
      c('2', 'hearts'), // banker total 4
      c('8', 'spades'), // player third 8: banker 4 must stand
      c('9', 'clubs'),
    ]);
    expect(deal.player).toHaveLength(3);
    expect(deal.banker).toHaveLength(2);
    expect(deal.winner).toBe('banker');
  });

  it('stops on a Baccarat natural and pays a Tie wager at 8:1', () => {
    const deck = [c('4', 'clubs'), c('4', 'diamonds'), c('4', 'spades'), c('4', 'hearts')];
    const result = playBaccarat(10, 'tie', Math.random, deck);
    expect(result).toMatchObject({ natural: true, winner: 'tie', payout: 90, profit: 80 });
    expect(result.player).toHaveLength(2);
    expect(result.banker).toHaveLength(2);
  });

  it('ranks wheel straights and royal flushes in video poker', () => {
    expect(evaluateVideoPoker([
      c('A', 'clubs'), c('2', 'diamonds'), c('3', 'spades'), c('4', 'hearts'), c('5', 'clubs'),
    ])).toBe('straight');
    expect(evaluateVideoPoker([
      c('10', 'hearts'), c('J', 'hearts'), c('Q', 'hearts'), c('K', 'hearts'), c('A', 'hearts'),
    ])).toBe('royal-flush');
  });

  it('keeps held video-poker cards and replaces the others in deck order', () => {
    const deck = [
      c('J', 'clubs'), c('2', 'clubs'), c('J', 'diamonds'), c('4', 'clubs'), c('5', 'clubs'),
      c('A', 'spades'), c('J', 'spades'), c('8', 'hearts'), c('9', 'hearts'), c('10', 'hearts'),
    ];
    const result = drawVideoPoker(dealVideoPoker(5, Math.random, deck), [0, 2]);
    expect(result.hand.map((card) => card.rank)).toEqual(['J', 'A', 'J', 'J', '8']);
    expect(result.rank).toBe('three-of-a-kind');
    expect(result.payout).toBe(15);
  });

  it('treats equal Hi-Lo ranks as a loss and prices a correct prediction from the live deck', () => {
    const start = startHiLo(10, Math.random, [
      c('7', 'clubs'), c('9', 'clubs'), c('9', 'hearts'), c('2', 'diamonds'),
    ]);
    const correct = guessHiLo(start, 'higher', 0);
    expect(correct).toMatchObject({ status: 'active', correctGuesses: 1, multiplier: 1.5 });
    const tied = guessHiLo(correct, 'lower', 0);
    expect(tied).toMatchObject({ status: 'lost', payout: 0, profit: -10 });
  });

  it('generates independent traps for each tower row and supports cash-out', () => {
    const state = startTowers(10, 'easy', scriptedRandom(Array(100).fill(0)));
    expect(state.board.every((row) => row.trapTiles.length === 1)).toBe(true);
    const safeTile = state.board[0]!.trapTiles[0] === 0 ? 1 : 0;
    const climbed = chooseTowersTile(state, safeTile);
    expect(climbed.multiplier).toBe(1.32);
    expect(cashOutTowers(climbed)).toMatchObject({ status: 'cashed-out', payout: 13.2 });
  });

  it('uses the same immutable climb contract for Dragon Tower eggs', () => {
    const state = startDragonTower(10, 'wyvern', scriptedRandom(Array(100).fill(0)));
    const safeEgg = [0, 1, 2, 3].find((egg) => !state.board[0]!.trapTiles.includes(egg))!;
    const next = chooseDragonEgg(state, safeEgg);
    expect(state.selections).toHaveLength(0);
    expect(next).toMatchObject({ currentRow: 1, multiplier: 1.98, status: 'active' });
  });

  it('uses three-card-poker ranking where a straight beats a flush', () => {
    const straight = rankThreeCardHand([c('4', 'clubs'), c('5', 'diamonds'), c('6', 'clubs')]);
    const flush = rankThreeCardHand([c('2', 'hearts'), c('7', 'hearts'), c('J', 'hearts')]);
    expect(straight.category).toBeGreaterThan(flush.category);
  });

  it('handles Red Dog consecutive posts as a push', () => {
    const result = playRedDog(25, Math.random, [c('6', 'clubs'), c('7', 'hearts'), c('A', 'spades')]);
    expect(result).toMatchObject({ spread: 0, outcome: 'push', payout: 25, profit: 0 });
  });

  it('pays Red Dog by spread when the third card lands between the posts', () => {
    const result = playRedDog(10, Math.random, [c('4', 'clubs'), c('8', 'hearts'), c('6', 'spades')]);
    expect(result).toMatchObject({ spread: 3, outcome: 'win', multiplier: 3, payout: 30 });
  });

  it('settles scratch tickets only after reveal and never shows a false triple', () => {
    const ticket = revealAllScratchCells(createLosingTicket());
    expect(ticket.status).toBe('lost');
    expect(Math.max(...[...new Set(ticket.cells.map((cell) => cell.symbol))].map(
      (symbol) => ticket.cells.filter((cell) => cell.symbol === symbol).length,
    ))).toBeLessThan(3);
  });

  it('maps random endpoints to both sides of a coin', () => {
    expect(flipCoin(1, 'heads', () => 0).result).toBe('heads');
    expect(flipCoin(1, 'tails', () => 0.999).result).toBe('tails');
  });

  it('preselects crash and wheel outcomes before UI animation', () => {
    expect(generateCrashPoint(() => 0.5)).toBe(1.98);
    const crash = startCrashRound(10, 1.5, () => 0.5);
    expect(settleCrashRound(crash)).toMatchObject({ status: 'cashed-out', payout: 15 });
    expect(spinWheel(10, () => 0)).toMatchObject({ segmentIndex: 0, payout: 0 });
  });

  it('resolves Limbo and compact choice games from injected randomness', () => {
    expect(playLimbo(10, 1.5, () => 0.5)).toMatchObject({ result: 1.98, won: true, payout: 15 });
    expect(playDiamonds(10, 'violet', () => 0)).toMatchObject({ won: true, payout: 47.5 });
    expect(playRoshambo(10, 'rock', () => 0.99)).toMatchObject({ opponent: 'scissors', outcome: 'win', payout: 19 });
    expect(playLuckyCups(10, 2, () => 0.99)).toMatchObject({ winningCup: 2, won: true, payout: 28.5 });
  });

  it('draws ten unique Keno balls and applies the published table', () => {
    const result = playKeno(10, [2], scriptedRandom(Array(100).fill(0)));
    expect(new Set(result.drawn).size).toBe(10);
    expect(result.matched).toEqual([2]);
    expect(getKenoMultiplier(1, 1)).toBe(3.6);
    expect(result.payout).toBe(36);
  });

  it('settles a three-card showdown with its strong-hand bonus', () => {
    const result = playThreeCardPoker(10, Math.random, [
      c('4', 'clubs'), c('A', 'clubs'),
      c('5', 'diamonds'), c('A', 'diamonds'),
      c('6', 'spades'), c('K', 'hearts'),
    ]);
    expect(result).toMatchObject({ outcome: 'win', basePayout: 19, bonusPayout: 10, payout: 29 });
  });

  it('creates and settles a visible three-match scratch win', () => {
    const ticket = createScratchTicket(10, scriptedRandom([0.7, ...Array(20).fill(0)]));
    const result = revealAllScratchCells(ticket);
    expect(result).toMatchObject({ winningSymbol: 'cherry', multiplier: 1, status: 'won', payout: 10 });
  });
});

const createLosingTicket = () => {
  // First draw picks the loss tier; remaining zeroes provide deterministic shuffles.
  const random = scriptedRandom([0, ...Array(20).fill(0)]);
  return createScratchTicket(10, random);
};
