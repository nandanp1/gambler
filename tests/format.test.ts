import { describe, expect, it } from 'vitest';

import { formatCoins } from '@/utils/format';

describe('coin formatting', () => {
  it('uses the same whole-coin rounding rule for payouts', () => {
    expect(formatCoins(112.5)).toBe('113');
  });

  it('preserves losses instead of clamping them to zero', () => {
    expect(formatCoins(-500)).toBe('-500');
  });

  it('renders invalid input safely', () => {
    expect(formatCoins(Number.NaN)).toBe('0');
  });
});
