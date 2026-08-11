import { describe, expect, it } from 'vitest';

import {
  calculatePayout,
  calculateProfit,
  getNumberColor,
  getTargetRotation,
  isWinningBet,
  isValidRouletteNumber,
  resolveRouletteBets,
  spinRoulette,
  validateBet,
} from './engine';

describe('European roulette engine', () => {
  it('validates only integer numbers from 0 to 36', () => {
    expect(isValidRouletteNumber(0)).toBe(true);
    expect(isValidRouletteNumber(36)).toBe(true);
    expect(isValidRouletteNumber(-1)).toBe(false);
    expect(isValidRouletteNumber(37)).toBe(false);
    expect(isValidRouletteNumber(2.5)).toBe(false);
  });

  it('uses the correct European red and black mapping', () => {
    expect(getNumberColor(0)).toBe('green');
    expect(getNumberColor(1)).toBe('red');
    expect(getNumberColor(2)).toBe('black');
    expect(getNumberColor(19)).toBe('red');
    expect(getNumberColor(20)).toBe('black');
    expect(getNumberColor(36)).toBe('red');
  });

  it('validates straight and outside bets', () => {
    expect(validateBet({ type: 'straight', amount: 10, number: 17 })).toBe(true);
    expect(validateBet({ type: 'single', amount: 10, value: 0 })).toBe(true);
    expect(validateBet({ type: 'straight', amount: 10, number: 40 })).toBe(false);
    expect(validateBet({ type: 'straight', amount: 10 })).toBe(false);
    expect(validateBet({ type: 'red', amount: 0 })).toBe(false);
    expect(validateBet({ type: '1-18', amount: 10 })).toBe(true);
  });

  it('zero loses every even-money outside bet', () => {
    for (const type of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) {
      expect(isWinningBet({ type, amount: 10 }, 0)).toBe(false);
    }
  });

  it('pays straight bets at 35:1 plus returned stake', () => {
    const bet = { type: 'straight' as const, number: 17, amount: 10 };
    expect(calculateProfit(bet, 17)).toBe(350);
    expect(calculatePayout(bet, 17)).toBe(360);
    expect(calculatePayout(bet, 18)).toBe(0);
  });

  it('pays even-money bets at 1:1 plus returned stake', () => {
    expect(calculatePayout({ type: 'red', amount: 25 }, 3)).toBe(50);
    expect(calculatePayout({ type: 'even', amount: 25 }, 8)).toBe(50);
    expect(calculatePayout({ type: '19-36', amount: 25 }, 20)).toBe(50);
  });

  it('resolves multiple bets and reports net coins', () => {
    const result = resolveRouletteBets(
      [
        { type: 'red', amount: 10 },
        { type: 'straight', number: 3, amount: 5 },
        { type: 'even', amount: 10 },
      ],
      3,
    );
    expect(result.totalStake).toBe(25);
    expect(result.totalPayout).toBe(200);
    expect(result.net).toBe(175);
  });

  it('accepts injected randomness and computes a matching animation target', () => {
    expect(spinRoulette(() => 0)).toBe(0);
    expect(spinRoulette(() => 0.999999)).toBe(36);
    expect(getTargetRotation(0, 5)).toBe(-1800);
    expect(Number.isFinite(getTargetRotation(32, 5))).toBe(true);
  });
});
