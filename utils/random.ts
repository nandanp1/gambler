export type RandomSource = () => number;

const clampRandom = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 1 - Number.EPSILON);
};

export const randomInt = (min: number, max: number, random: RandomSource = Math.random): number =>
  Math.floor(clampRandom(random()) * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number, random: RandomSource = Math.random): number =>
  clampRandom(random()) * (max - min) + min;

export const pickRandom = <T>(items: readonly T[], random: RandomSource = Math.random): T => {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty collection.');
  return items[Math.floor(clampRandom(random()) * items.length)]!;
};

export const shuffle = <T>(items: readonly T[], random: RandomSource = Math.random): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }
  return next;
};

export const weightedPick = <T>(
  items: readonly { value: T; weight: number }[],
  random: RandomSource = Math.random,
): T => {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (items.length === 0 || total <= 0) {
    throw new RangeError('weightedPick requires at least one positive weight.');
  }
  let cursor = clampRandom(random()) * total;
  for (const item of items) {
    cursor -= Math.max(0, item.weight);
    if (cursor < 0) return item.value;
  }
  return items[items.length - 1]!.value;
};

export const makeId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
