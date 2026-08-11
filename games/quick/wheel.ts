import { assertBet, randomInt, roundCoins, type RandomSource } from './shared';

export interface WheelSegment {
  readonly id: string;
  /** Total return multiplier, including the original stake. */
  readonly multiplier: number;
  readonly color: string;
  readonly label: string;
}

export interface WheelResult {
  readonly bet: number;
  readonly segmentIndex: number;
  readonly segment: WheelSegment;
  /** Clockwise resting angle for the center of the selected segment. */
  readonly targetAngle: number;
  readonly payout: number;
  readonly profit: number;
  readonly won: boolean;
}

const COLORS = ['#8F7CF7', '#65B9FF', '#FF91BD', '#71DFC0', '#FFD966', '#FF867A'] as const;
const MULTIPLIERS = [0, 1, 0.5, 2, 1, 0, 1, 4, 0.5, 1, 0, 2, 1, 0, 1, 0] as const;

/** Sixteen equal-size segments. Their average total return is 15/16 (93.75%). */
export const DEFAULT_WHEEL_SEGMENTS: readonly WheelSegment[] = MULTIPLIERS.map(
  (multiplier, index) => ({
    id: `segment-${index}`,
    multiplier,
    color: COLORS[index % COLORS.length]!,
    label: multiplier === 0 ? 'MISS' : `${multiplier}x`,
  }),
);

export const wheelTargetAngle = (segmentIndex: number, segmentCount: number): number => {
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= segmentCount || segmentCount < 1) {
    throw new RangeError('Invalid wheel segment index.');
  }
  const segmentAngle = 360 / segmentCount;
  return (360 - (segmentIndex + 0.5) * segmentAngle + 360) % 360;
};

export const spinWheel = (
  bet: number,
  random: RandomSource = Math.random,
  segments: readonly WheelSegment[] = DEFAULT_WHEEL_SEGMENTS,
): WheelResult => {
  assertBet(bet);
  if (segments.length < 2 || segments.some((segment) => segment.multiplier < 0)) {
    throw new RangeError('A wheel needs at least two valid segments.');
  }
  const segmentIndex = randomInt(0, segments.length - 1, random);
  const segment = segments[segmentIndex]!;
  const payout = roundCoins(bet * segment.multiplier);
  return {
    bet,
    segmentIndex,
    segment,
    targetAngle: wheelTargetAngle(segmentIndex, segments.length),
    payout,
    profit: roundCoins(payout - bet),
    won: payout > bet,
  };
};
