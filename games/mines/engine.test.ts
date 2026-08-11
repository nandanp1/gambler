import { describe, expect, it } from 'vitest';

import {
  calculateMinesMultiplier,
  cashOutMines,
  createMinesRound,
  getTileState,
  placeMines,
  revealTile,
} from './engine';

describe('Mines engine', () => {
  it('places the requested number of unique in-range mines', () => {
    const mines = placeMines(8, 25, () => 0.42);
    expect(mines).toHaveLength(8);
    expect(new Set(mines).size).toBe(8);
    expect(mines.every((position) => position >= 0 && position < 25)).toBe(true);
  });

  it('keeps injected mine locations fixed while safe tiles are revealed', () => {
    const initial = createMinesRound({ bet: 100, mineCount: 3, minePositions: [1, 8, 24] });
    const afterOne = revealTile(initial, 0);
    const afterTwo = revealTile(afterOne, 2);
    expect(afterTwo.minePositions).toEqual([1, 8, 24]);
    expect(afterTwo.revealedSafePositions).toEqual([0, 2]);
    expect(getTileState(afterTwo, 0)).toBe('safe');
    expect(getTileState(afterTwo, 1)).toBe('hidden');
  });

  it('ends the round and reveals every mine after a mine hit', () => {
    const initial = createMinesRound({ bet: 50, mineCount: 2, minePositions: [3, 20] });
    const lost = revealTile(initial, 3);
    expect(lost.status).toBe('lost');
    expect(lost.cashOutValue).toBe(0);
    expect(lost.profit).toBe(-50);
    expect(getTileState(lost, 3)).toBe('mine');
    expect(getTileState(lost, 20)).toBe('mine');
  });

  it('uses a combinatorial multiplier that progresses with safe reveals', () => {
    const first = calculateMinesMultiplier(1, 3);
    const second = calculateMinesMultiplier(2, 3);
    const third = calculateMinesMultiplier(3, 3);
    expect(first).toBeCloseTo(0.97 * (25 / 22));
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it('updates next multiplier, profit, and cash-out value after a safe reveal', () => {
    const initial = createMinesRound({ bet: 100, mineCount: 5, minePositions: [0, 1, 2, 3, 4] });
    const active = revealTile(initial, 5);
    expect(active.status).toBe('active');
    expect(active.multiplier).toBeGreaterThan(1);
    expect(active.nextMultiplier).toBeGreaterThan(active.multiplier);
    expect(active.cashOutValue).toBe(Math.floor(100 * active.multiplier));
    expect(active.profit).toBe(active.cashOutValue - 100);
  });

  it('settles the displayed amount on cash out', () => {
    const initial = createMinesRound({ bet: 100, mineCount: 3, minePositions: [1, 8, 24] });
    const active = revealTile(initial, 0);
    const settled = cashOutMines(active);
    expect(settled.status).toBe('cashed-out');
    expect(settled.cashOutValue).toBe(active.cashOutValue);
    expect(settled.nextMultiplier).toBeNull();
  });
});
