/** Deterministic-path Plinko rules for rows 6 through 16. */

export type RandomSource = () => number;
export type PlinkoRisk = 'low' | 'medium' | 'high';
export type PlinkoRiskInput = PlinkoRisk | 'med';
export type PlinkoDirection = 'left' | 'right';
export type PlinkoPath = readonly PlinkoDirection[];

export interface PlinkoPathStep {
  row: number;
  direction: PlinkoDirection;
  /** Number of right bounces so far. Also the current horizontal lattice index. */
  latticeIndex: number;
  /** Signed visual offset in half-peg units from the board center. */
  offset: number;
}

export interface PlinkoDropOptions {
  bet: number;
  risk: PlinkoRiskInput;
  rows: number;
  random?: RandomSource;
  /** Optional replay/debug path. It must contain exactly one direction per row. */
  path?: PlinkoPath;
  /** Optional predetermined bucket; a matching visual path will be generated. */
  bucketIndex?: number;
}

export interface PlinkoDropResult {
  bet: number;
  risk: PlinkoRisk;
  rows: number;
  path: PlinkoPath;
  steps: readonly PlinkoPathStep[];
  bucketIndex: number;
  multiplier: number;
  /** Integer wallet credit after the bet was already debited. */
  payout: number;
  profit: number;
}

export const PLINKO_MIN_ROWS = 6;
export const PLINKO_MAX_ROWS = 16;
export const SUPPORTED_PLINKO_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
};

const assertRows = (rows: number): void => {
  if (!Number.isInteger(rows) || rows < PLINKO_MIN_ROWS || rows > PLINKO_MAX_ROWS) {
    throw new RangeError(`Rows must be an integer from ${PLINKO_MIN_ROWS} through ${PLINKO_MAX_ROWS}.`);
  }
};

export const normalizeRisk = (risk: PlinkoRiskInput): PlinkoRisk =>
  risk === 'med' ? 'medium' : risk;

function assertRisk(risk: string): asserts risk is PlinkoRiskInput {
  if (risk !== 'low' && risk !== 'medium' && risk !== 'med' && risk !== 'high') {
    throw new RangeError('Risk must be low, medium, or high.');
  }
}

const roundMultiplier = (value: number): number => Math.round(value * 100) / 100;

const buildSymmetricTable = (risk: PlinkoRisk, rows: number): readonly number[] => {
  // The six-row medium layout mirrors the supplied design exactly.
  if (risk === 'medium' && rows === 6) return [10, 3, 1.4, 0.5, 1.4, 3, 10];

  const center = risk === 'low' ? 0.72 : risk === 'medium' ? 0.42 : 0.12;
  const edge = risk === 'low'
    ? 2 + (rows - 6) * 0.55
    : risk === 'medium'
      ? 8 + (rows - 6) * 2.2
      : 20 + (rows - 6) * 8;
  const curve = risk === 'low' ? 2.1 : risk === 'medium' ? 3.2 : 5.2;
  const middle = rows / 2;
  return Object.freeze(
    Array.from({ length: rows + 1 }, (_, bucketIndex) => {
      const distance = Math.abs(bucketIndex - middle) / middle;
      return roundMultiplier(center + (edge - center) * distance ** curve);
    }),
  );
};

const buildRiskTables = (risk: PlinkoRisk): Readonly<Record<number, readonly number[]>> =>
  Object.freeze(
    Object.fromEntries(
      SUPPORTED_PLINKO_ROWS.map((rows) => [rows, buildSymmetricTable(risk, rows)]),
    ),
  );

/** Every table has rows + 1 buckets and is symmetric about the center. */
export const PLINKO_MULTIPLIERS: Readonly<
  Record<PlinkoRisk, Readonly<Record<number, readonly number[]>>>
> = Object.freeze({
  low: buildRiskTables('low'),
  medium: buildRiskTables('medium'),
  high: buildRiskTables('high'),
});

export const PLINKO_MULTIPLIER_TABLES = PLINKO_MULTIPLIERS;

export const getMultiplierTable = (
  riskInput: PlinkoRiskInput,
  rows: number,
): readonly number[] => {
  assertRisk(riskInput);
  assertRows(rows);
  return PLINKO_MULTIPLIERS[normalizeRisk(riskInput)][rows]!;
};

export const getPlinkoMultiplier = (
  risk: PlinkoRiskInput,
  rows: number,
  bucketIndex: number,
): number => {
  const table = getMultiplierTable(risk, rows);
  if (!Number.isInteger(bucketIndex) || bucketIndex < 0 || bucketIndex >= table.length) {
    throw new RangeError(`Bucket must be an integer from 0 through ${rows}.`);
  }
  return table[bucketIndex]!;
};

export const lookupMultiplier = getPlinkoMultiplier;
export const getMultiplier = getPlinkoMultiplier;

/** One independent 50/50 bounce per peg row. */
export const generatePlinkoPath = (
  rows: number,
  random: RandomSource = Math.random,
): PlinkoPath => {
  assertRows(rows);
  return Array.from({ length: rows }, () =>
    clampUnit(random()) < 0.5 ? 'left' : 'right',
  );
};

export const generatePath = generatePlinkoPath;

export const getBucketForPath = (path: PlinkoPath): number =>
  path.reduce((bucket, direction) => {
    if (direction !== 'left' && direction !== 'right') {
      throw new RangeError('A Plinko path may contain only left and right directions.');
    }
    return bucket + (direction === 'right' ? 1 : 0);
  }, 0);

export const bucketFromPath = getBucketForPath;

/** Builds a randomized but guaranteed-consistent path for a known animation target. */
export const generatePathForBucket = (
  rows: number,
  bucketIndex: number,
  random: RandomSource = Math.random,
): PlinkoPath => {
  assertRows(rows);
  if (!Number.isInteger(bucketIndex) || bucketIndex < 0 || bucketIndex > rows) {
    throw new RangeError(`Bucket must be an integer from 0 through ${rows}.`);
  }
  const path: PlinkoDirection[] = [
    ...Array.from({ length: bucketIndex }, () => 'right' as const),
    ...Array.from({ length: rows - bucketIndex }, () => 'left' as const),
  ];
  for (let index = path.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampUnit(random()) * (index + 1));
    [path[index], path[swapIndex]] = [path[swapIndex]!, path[index]!];
  }
  return path;
};

export const getPathSteps = (path: PlinkoPath): readonly PlinkoPathStep[] => {
  let rights = 0;
  return path.map((direction, row) => {
    if (direction !== 'left' && direction !== 'right') {
      throw new RangeError('A Plinko path may contain only left and right directions.');
    }
    if (direction === 'right') rights += 1;
    const completedRows = row + 1;
    return {
      row,
      direction,
      latticeIndex: rights,
      offset: rights * 2 - completedRows,
    };
  });
};

const validatePath = (path: PlinkoPath, rows: number): PlinkoDirection[] => {
  if (path.length !== rows) throw new RangeError('Path length must equal the selected row count.');
  // getBucketForPath also validates every direction.
  getBucketForPath(path);
  return [...path];
};

/** Determines outcome and matching visual path before the drop animation starts. */
export const dropPlinkoBall = ({
  bet,
  risk: riskInput,
  rows,
  random = Math.random,
  path: injectedPath,
  bucketIndex: injectedBucket,
}: PlinkoDropOptions): PlinkoDropResult => {
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be greater than zero.');
  assertRisk(riskInput);
  assertRows(rows);
  if (injectedPath && injectedBucket !== undefined) {
    throw new Error('Inject either a path or a bucket, not both.');
  }
  const path = injectedPath
    ? validatePath(injectedPath, rows)
    : injectedBucket === undefined
      ? generatePlinkoPath(rows, random)
      : generatePathForBucket(rows, injectedBucket, random);
  const bucketIndex = getBucketForPath(path);
  const risk = normalizeRisk(riskInput);
  const multiplier = getPlinkoMultiplier(risk, rows, bucketIndex);
  const payout = Math.floor(bet * multiplier);
  return {
    bet,
    risk,
    rows,
    path,
    steps: getPathSteps(path),
    bucketIndex,
    multiplier,
    payout,
    profit: payout - bet,
  };
};

export const dropBall = dropPlinkoBall;

export const calculateBucketProbability = (rows: number, bucketIndex: number): number => {
  assertRows(rows);
  if (!Number.isInteger(bucketIndex) || bucketIndex < 0 || bucketIndex > rows) {
    throw new RangeError(`Bucket must be an integer from 0 through ${rows}.`);
  }
  let combinations = 1;
  const k = Math.min(bucketIndex, rows - bucketIndex);
  for (let index = 1; index <= k; index += 1) {
    combinations = (combinations * (rows - k + index)) / index;
  }
  return combinations / 2 ** rows;
};

export const calculateExpectedMultiplier = (
  risk: PlinkoRiskInput,
  rows: number,
): number => getMultiplierTable(risk, rows).reduce(
  (total, multiplier, bucketIndex) =>
    total + multiplier * calculateBucketProbability(rows, bucketIndex),
  0,
);
