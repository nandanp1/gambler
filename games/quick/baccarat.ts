import {
  assertBet,
  assertDeckHas,
  createShuffledDeck,
  roundCoins,
  type Card,
  type RandomSource,
} from './shared';

export type BaccaratBet = 'player' | 'banker' | 'tie';
export type BaccaratWinner = 'player' | 'banker' | 'tie';

export interface BaccaratDeal {
  readonly player: readonly Card[];
  readonly banker: readonly Card[];
  readonly playerTotal: number;
  readonly bankerTotal: number;
  readonly winner: BaccaratWinner;
  readonly natural: boolean;
}

export interface BaccaratResult extends BaccaratDeal {
  readonly bet: number;
  readonly betOn: BaccaratBet;
  readonly outcome: 'win' | 'loss' | 'push';
  readonly payout: number;
  readonly profit: number;
}

export const baccaratCardValue = (card: Card): number => {
  if (card.rank === 'A') return 1;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 0;
  return Number(card.rank);
};

export const baccaratTotal = (cards: readonly Card[]): number =>
  cards.reduce((total, card) => total + baccaratCardValue(card), 0) % 10;

export const shouldBankerDraw = (bankerTotal: number, playerThirdCard?: Card): boolean => {
  if (playerThirdCard === undefined) return bankerTotal <= 5;
  const third = baccaratCardValue(playerThirdCard);
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return third !== 8;
  if (bankerTotal === 4) return third >= 2 && third <= 7;
  if (bankerTotal === 5) return third >= 4 && third <= 7;
  if (bankerTotal === 6) return third === 6 || third === 7;
  return false;
};

/** Deals cards from index 0 onward when a scripted deck is supplied. */
export const dealBaccarat = (
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): BaccaratDeal => {
  const deck = scriptedDeck ? [...scriptedDeck] : createShuffledDeck(random);
  assertDeckHas(deck, 4);
  let cursor = 0;
  const draw = (): Card => {
    const card = deck[cursor++];
    if (card === undefined) throw new RangeError('Scripted Baccarat deck ran out of cards.');
    return card;
  };

  const player: Card[] = [draw()];
  const banker: Card[] = [draw()];
  player.push(draw());
  banker.push(draw());

  const openingPlayer = baccaratTotal(player);
  const openingBanker = baccaratTotal(banker);
  const natural = openingPlayer >= 8 || openingBanker >= 8;

  if (!natural) {
    let playerThird: Card | undefined;
    if (openingPlayer <= 5) {
      playerThird = draw();
      player.push(playerThird);
    }
    if (shouldBankerDraw(openingBanker, playerThird)) banker.push(draw());
  }

  const playerTotal = baccaratTotal(player);
  const bankerTotal = baccaratTotal(banker);
  const winner: BaccaratWinner =
    playerTotal === bankerTotal ? 'tie' : playerTotal > bankerTotal ? 'player' : 'banker';

  return { player, banker, playerTotal, bankerTotal, winner, natural };
};

export const settleBaccarat = (
  bet: number,
  betOn: BaccaratBet,
  deal: BaccaratDeal,
): BaccaratResult => {
  assertBet(bet);
  // Player/Banker wagers push when the hand ties; a Tie wager wins 8:1.
  const outcome = deal.winner === 'tie' && betOn !== 'tie'
    ? 'push'
    : deal.winner === betOn
      ? 'win'
      : 'loss';
  const multiplier = outcome === 'push'
    ? 1
    : outcome === 'loss'
      ? 0
      : betOn === 'tie'
        ? 9
        : betOn === 'banker'
          ? 1.95
          : 2;
  const payout = roundCoins(bet * multiplier);
  return { ...deal, bet, betOn, outcome, payout, profit: roundCoins(payout - bet) };
};

export const playBaccarat = (
  bet: number,
  betOn: BaccaratBet,
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): BaccaratResult => settleBaccarat(bet, betOn, dealBaccarat(random, scriptedDeck));
