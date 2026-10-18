import { describe, expect, it } from 'vitest';

import { pickRandom, randomInt, weightedPick } from '@/utils/random';

describe('random utilities', () => {
  it('rejects empty collections when picking a random item', () => {
    expect(() => pickRandom([])).toThrow(RangeError);
  });

  it('clamps endpoint random sources to the last valid index', () => {
    expect(randomInt(0, 2, () => 1)).toBe(2);
    expect(pickRandom(['a', 'b', 'c'], () => 1)).toBe('c');
  });

  it('rejects weighted picks without positive weight', () => {
    expect(() => weightedPick([])).toThrow(RangeError);
    expect(() => weightedPick([{ value: 'x', weight: 0 }])).toThrow(RangeError);
  });
});
