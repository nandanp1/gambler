import { describe, expect, it } from 'vitest';

import {
  BlackjackError,
  calculatePayout,
  classifyRoundByNet,
  createCard,
  createDeck,
  dealerShouldHit,
  doubleDown,
  getActionCost,
  getVisibleDealerScore,
  hit,
  scoreHand,
  shuffleDeck,
  split,
  stand,
  startBlackjack,
  type BlackjackCard,
  type BlackjackRank,
  type BlackjackSuit,
} from './engine';

const suits: readonly BlackjackSuit[] = ['♠', '♥', '♦', '♣'];

const cards = (...ranks: readonly BlackjackRank[]): BlackjackCard[] =>
  ranks.map((rank, index) => createCard(rank, suits[index % suits.length]!));

describe('blackjack deck', () => {
  it('creates a standard 52-card deck with unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id))).toHaveLength(52);
    expect(deck.filter((card) => card.rank === 'A')).toHaveLength(4);
  });

  it('supports deterministic shuffling without mutating the input', () => {
    const deck = cards('A', '2', '3', '4');
    const original = [...deck];
    const shuffled = shuffleDeck(deck, () => 0);

    expect(deck).toEqual(original);
    expect(shuffled.map((card) => card.rank)).toEqual(['2', '3', '4', 'A']);
  });
});

describe('blackjack scoring', () => {
  it('scores aces as 1 or 11 to make the best hand', () => {
    expect(scoreHand(cards('A', '9')).total).toBe(20);
    expect(scoreHand(cards('A', 'A', '9'))).toMatchObject({
      total: 21,
      isSoft: true,
      isBust: false,
    });
    expect(scoreHand(cards('A', 'A', '9', 'K'))).toMatchObject({
      total: 21,
      isSoft: false,
      isBust: false,
    });
    expect(scoreHand(cards('A', 'K'))).toMatchObject({ total: 21, isBlackjack: true });
  });

  it('marks true busts after all possible ace reductions', () => {
    expect(scoreHand(cards('A', 'K', 'Q', '2'))).toMatchObject({
      total: 23,
      isBust: true,
    });
  });

  it('makes the dealer hit below 17 and stand on 17 by default', () => {
    expect(dealerShouldHit(cards('10', '6'))).toBe(true);
    expect(dealerShouldHit(cards('10', '7'))).toBe(false);
    expect(dealerShouldHit(cards('A', '6'))).toBe(false);
    expect(dealerShouldHit(cards('A', '6'), true)).toBe(true);
  });
});

describe('blackjack round settlement', () => {
  it('recognizes a natural and pays 3:2 profit plus the returned stake', () => {
    // Deal order: player, dealer, player, dealer.
    const state = startBlackjack(100, cards('A', '9', 'K', '7'));

    expect(state.phase).toBe('settled');
    expect(state.playerHands[0]).toMatchObject({ outcome: 'blackjack', payout: 250 });
    expect(state.outcome).toBe('blackjack');
    expect(state.payout).toBe(250);
    expect(state.net).toBe(150);
  });

  it('pushes when player and dealer both have blackjack', () => {
    const state = startBlackjack(40, cards('A', 'A', 'K', 'Q'));

    expect(state.playerHands[0]).toMatchObject({ outcome: 'push', payout: 40 });
    expect(state.outcome).toBe('push');
    expect(classifyRoundByNet(state)).toBe('push');
  });

  it('draws for the dealer until 17 and resolves a push', () => {
    let state = startBlackjack(25, cards('10', '6', '7', '9', '2'));
    expect(getVisibleDealerScore(state).total).toBe(6);

    state = stand(state);

    expect(state.dealer.cards).toHaveLength(3);
    expect(state.dealer.score.total).toBe(17);
    expect(state.playerHands[0]).toMatchObject({ outcome: 'push', payout: 25 });
    expect(state.payout).toBe(25);
  });

  it('does not make the dealer draw after every player hand busts', () => {
    const injected = cards('K', '9', '6', '7', 'K', 'A');
    let state = startBlackjack(30, injected);

    state = hit(state);

    expect(state.phase).toBe('settled');
    expect(state.playerHands[0]).toMatchObject({ status: 'bust', outcome: 'bust', payout: 0 });
    expect(state.dealer.cards).toHaveLength(2);
    expect(state.deck[0]?.rank).toBe('A');
    expect(state.outcome).toBe('loss');
  });

  it('returns the correct gross payouts for all outcomes', () => {
    expect(calculatePayout('win', 20)).toBe(40);
    expect(calculatePayout('blackjack', 20)).toBe(50);
    expect(calculatePayout('push', 20)).toBe(20);
    expect(calculatePayout('loss', 20)).toBe(0);
    expect(calculatePayout('bust', 20)).toBe(0);
  });
});

describe('blackjack player actions', () => {
  it('hits the active hand and disables double after the third card', () => {
    let state = startBlackjack(10, cards('2', '10', '3', '7', '4', 'K'));
    state = hit(state);

    expect(state.playerHands[0]?.cards).toHaveLength(3);
    expect(state.playerHands[0]?.score.total).toBe(9);
    expect(state.availableActions.double).toBe(false);
    expect(() => doubleDown(state)).toThrowError(BlackjackError);
  });

  it('doubles the stake, deals exactly one card, and ends the hand', () => {
    let state = startBlackjack(20, cards('5', '10', '6', '7', '10', 'A'));
    expect(getActionCost(state, 'double')).toBe(20);

    state = doubleDown(state);

    expect(state.phase).toBe('settled');
    expect(state.totalBet).toBe(40);
    expect(state.playerHands[0]).toMatchObject({
      bet: 40,
      doubled: true,
      outcome: 'win',
      payout: 80,
    });
    expect(state.playerHands[0]?.cards).toHaveLength(3);
    expect(state.deck[0]?.rank).toBe('A');
    expect(state.net).toBe(40);
  });

  it('splits a valid pair and plays the two hands independently', () => {
    let state = startBlackjack(50, cards('8', '10', '8', '7', 'K', '2', '9'));
    expect(state.availableActions.split).toBe(true);
    expect(getActionCost(state, 'split')).toBe(50);

    state = split(state);
    expect(state.playerHands).toHaveLength(2);
    expect(state.totalBet).toBe(100);
    expect(state.activeHandIndex).toBe(0);
    expect(state.playerHands.map((hand) => hand.score.total)).toEqual([18, 10]);

    state = stand(state);
    expect(state.activeHandIndex).toBe(1);
    state = hit(state);
    expect(state.playerHands[1]?.score.total).toBe(19);
    state = stand(state);

    expect(state.phase).toBe('settled');
    expect(state.playerHands.map((hand) => hand.outcome)).toEqual(['win', 'win']);
    expect(state.payout).toBe(200);
    expect(state.net).toBe(100);
  });

  it('does not allow unlike ten-value ranks to split', () => {
    const state = startBlackjack(10, cards('J', '9', 'K', '7', '2', '3'));
    expect(state.availableActions.split).toBe(false);
    expect(() => split(state)).toThrowError(BlackjackError);
  });

  it('pays a split two-card 21 as a regular win, not a natural', () => {
    let state = startBlackjack(10, cards('K', '9', 'K', '8', 'A', 'A'));
    state = split(state);

    expect(state.phase).toBe('settled');
    expect(state.playerHands.map((hand) => hand.outcome)).toEqual(['win', 'win']);
    expect(state.playerHands.map((hand) => hand.payout)).toEqual([20, 20]);
    expect(state.payout).toBe(40);
  });

  it('deals only one card to each split ace under the default rules', () => {
    let state = startBlackjack(10, cards('A', '10', 'A', '7', 'K', '9'));
    state = split(state);

    expect(state.phase).toBe('settled');
    expect(state.playerHands.every((hand) => hand.cards.length === 2)).toBe(true);
    expect(state.playerHands.map((hand) => hand.score.total)).toEqual([21, 20]);
    expect(state.playerHands.map((hand) => hand.outcome)).toEqual(['win', 'win']);
    expect(state.playerHands.map((hand) => hand.payout)).toEqual([20, 20]);
  });
});

describe('blackjack validation and immutability', () => {
  it('rejects invalid bets and too-short deterministic decks', () => {
    expect(() => startBlackjack(0, cards('2', '3', '4', '5'))).toThrowError(BlackjackError);
    expect(() => startBlackjack(10, cards('2', '3', '4'))).toThrowError(BlackjackError);
  });

  it('does not mutate an injected deck or previous state', () => {
    const deck = cards('2', '10', '3', '7', '4', 'K');
    const originalDeck = [...deck];
    const before = startBlackjack(10, deck);
    const after = hit(before);

    expect(deck).toEqual(originalDeck);
    expect(before.playerHands[0]?.cards).toHaveLength(2);
    expect(after.playerHands[0]?.cards).toHaveLength(3);
  });
});
