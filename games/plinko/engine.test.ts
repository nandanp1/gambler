import { describe, expect, it } from 'vitest';

import {
  PLINKO_MULTIPLIERS,
  calculateBucketProbability,
  dropPlinkoBall,
  generatePathForBucket,
  getBucketForPath,
  getMultiplierTable,
  getPlinkoMultiplier,
} from './engine';

describe('Plinko engine', () => {
  it('provides the supplied six-row medium multiplier layout', () => {
    expect(getMultiplierTable('medium', 6)).toEqual([10, 3, 1.4, 0.5, 1.4, 3, 10]);
    expect(getMultiplierTable('med', 6)).toEqual(PLINKO_MULTIPLIERS.medium[6]);
  });

  it('returns the correct multiplier for risk, rows, and bucket', () => {
    expect(getPlinkoMultiplier('medium', 6, 0)).toBe(10);
    expect(getPlinkoMultiplier('medium', 6, 3)).toBe(0.5);
    expect(getPlinkoMultiplier('medium', 6, 6)).toBe(10);
  });

  it('has rows + 1 symmetric multiplier buckets for every table', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      for (let rows = 6; rows <= 16; rows += 1) {
        const table = getMultiplierTable(risk, rows);
        expect(table).toHaveLength(rows + 1);
        expect(table).toEqual([...table].reverse());
      }
    }
  });

  it('generates a path whose right-bounce count equals its target bucket', () => {
    const path = generatePathForBucket(10, 7, () => 0.31);
    expect(path).toHaveLength(10);
    expect(getBucketForPath(path)).toBe(7);
  });

  it('keeps a generated drop path, bucket, and multiplier consistent', () => {
    const values = [0.1, 0.9, 0.1, 0.9, 0.9, 0.1];
    let index = 0;
    const result = dropPlinkoBall({
      bet: 100,
      risk: 'medium',
      rows: 6,
      random: () => values[index++] ?? 0,
    });
    expect(result.path).toEqual(['left', 'right', 'left', 'right', 'right', 'left']);
    expect(result.bucketIndex).toBe(3);
    expect(result.multiplier).toBe(0.5);
    expect(result.payout).toBe(50);
    expect(result.steps.at(-1)?.latticeIndex).toBe(result.bucketIndex);
  });

  it('generates a matching path when an outcome bucket is injected', () => {
    const result = dropPlinkoBall({
      bet: 25,
      risk: 'high',
      rows: 8,
      bucketIndex: 8,
      random: () => 0.5,
    });
    expect(getBucketForPath(result.path)).toBe(8);
    expect(result.multiplier).toBe(getPlinkoMultiplier('high', 8, 8));
  });

  it('uses binomial bucket probabilities', () => {
    expect(calculateBucketProbability(6, 0)).toBe(1 / 64);
    expect(calculateBucketProbability(6, 3)).toBe(20 / 64);
    const total = Array.from({ length: 7 }, (_, bucket) =>
      calculateBucketProbability(6, bucket),
    ).reduce((sum, probability) => sum + probability, 0);
    expect(total).toBeCloseTo(1);
  });
});
