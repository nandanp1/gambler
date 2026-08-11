export const STARTING_BALANCE = 10_642;

export const getBalance = (balance: number): number => Math.max(0, Math.floor(balance));

export const canAfford = (balance: number, amount: number): boolean =>
  Number.isFinite(amount) && amount >= 0 && getBalance(balance) >= Math.ceil(amount);

export const debitBalance = (balance: number, amount: number): number | null => {
  const debit = Math.ceil(amount);
  if (!canAfford(balance, debit)) return null;
  return getBalance(balance) - debit;
};

export const creditBalance = (balance: number, amount: number): number =>
  getBalance(balance) + Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
