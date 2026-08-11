import { describe, expect, it } from 'vitest';

import {
  PAIR_MULTIPLIER,
  calculateSlotPayout,
  evaluatePaytable,
  pickWeightedSymbol,
  resolveSlotSpin,
  spinSlots,
} from './engine';

describe('Clay Reels engine', () => {
  it('evaluates every advertised triple', () => {
    expect(evaluatePaytable(['7', '7', '7'])).toBe(100);
    expect(evaluatePaytable(['crown', 'crown', 'crown'])).toBe(30);
    expect(evaluatePaytable(['diamond', 'diamond', 'diamond'])).toBe(20);
    expect(evaluatePaytable(['star', 'star', 'star'])).toBe(10);
    expect(evaluatePaytable(['heart', 'heart', 'heart'])).toBe(8);
    expect(evaluatePaytable(['bell', 'bell', 'bell'])).toBe(6);
    expect(evaluatePaytable(['cherry', 'cherry', 'cherry'])).toBe(5);
  });

  it('awards a small payout for any pair and none for all-different symbols', () => {
    expect(evaluatePaytable(['heart', '7', 'heart'])).toBe(PAIR_MULTIPLIER);
    expect(evaluatePaytable(['heart', 'diamond', 'star'])).toBe(0);
  });

  it('calculates the total wallet credit from bet and paytable', () => {
    expect(calculateSlotPayout(['crown', 'crown', 'crown'], 25)).toBe(750);
    expect(calculateSlotPayout(['heart', 'diamond', 'star'], 25)).toBe(0);
  });

  it('identifies triple seven as a jackpot', () => {
    const result = resolveSlotSpin(['7', '7', '7'], 50);
    expect(result).toMatchObject({ multiplier: 100, payout: 5_000, isJackpot: true });
  });

  it('uses weighted boundaries predictably with injected randomness', () => {
    const weights = [
      { symbol: '7' as const, weight: 1 },
      { symbol: 'cherry' as const, weight: 3 },
    ];
    expect(pickWeightedSymbol(() => 0, weights)).toBe('7');
    expect(pickWeightedSymbol(() => 0.249999, weights)).toBe('7');
    expect(pickWeightedSymbol(() => 0.25, weights)).toBe('cherry');
    expect(pickWeightedSymbol(() => 0.999999, weights)).toBe('cherry');
  });

  it('generates all reel outcomes before returning the resolved spin', () => {
    const values = [0, 0, 0];
    let index = 0;
    const result = spinSlots(10, () => values[index++] ?? 0);
    expect(result.symbols).toEqual(['7', '7', '7']);
    expect(result.payout).toBe(1_000);
    expect(index).toBe(3);
  });
});
