export const formatCoins = (value: number): string =>
  Math.round(Number.isFinite(value) ? value : 0).toLocaleString('en-US');

export const formatCompact = (value: number): string => {
  if (Math.abs(value) < 1_000) return Math.round(value).toString();
  if (Math.abs(value) < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
};

export const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isYesterday = (key: string | null, now = new Date()): boolean => {
  if (!key) return false;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return key === localDateKey(yesterday);
};
