import { describe, expect, it } from 'vitest';

import { canAfford, creditBalance, debitBalance, getBalance, STARTING_BALANCE } from './wallet';

describe('wallet', () => {
  it('starts with the fictional balance from the product brief', () => {
    expect(STARTING_BALANCE).toBe(10_642);
    expect(getBalance(STARTING_BALANCE)).toBe(10_642);
  });

  it('debits affordable bets without going negative', () => {
    expect(canAfford(100, 75)).toBe(true);
    expect(debitBalance(100, 75)).toBe(25);
    expect(debitBalance(25, 26)).toBeNull();
  });

  it('credits only finite non-negative whole coins', () => {
    expect(creditBalance(100, 42.9)).toBe(143);
    expect(creditBalance(100, -50)).toBe(100);
    expect(creditBalance(100, Number.NaN)).toBe(100);
  });

  it('rejects invalid affordability checks', () => {
    expect(canAfford(100, -1)).toBe(false);
    expect(canAfford(100, Number.NaN)).toBe(false);
  });
});
