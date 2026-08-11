/**
 * Pure play-money game engines.
 *
 * Integration contract:
 * - Debit `bet` once when a round starts.
 * - Credit `payout` once a terminal result is returned.
 * - `payout` is total return (stake included), while `profit = payout - bet`.
 * - Pass a custom RandomSource for deterministic previews and tests.
 */
export * from './shared';
export * from './dice';
export * from './crash';
export * from './wheel';
export * from './baccarat';
export * from './videoPoker';
export * from './hilo';
export * from './keno';
export * from './limbo';
export * from './towerCore';
export * from './towers';
export * from './coinFlip';
export * from './diamonds';
export * from './roshambo';
export * from './dragonTower';
export * from './threeCardPoker';
export * from './scratch';
export * from './luckyCups';
export * from './redDog';
