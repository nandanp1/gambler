import {
  assertBet,
  assertDeckHas,
  createShuffledDeck,
  rankHighValue,
  roundCoins,
  roundTo,
  type Card,
  type RandomSource,
} from './shared';

export type HiLoPrediction = 'higher' | 'lower';
export type HiLoStatus = 'active' | 'lost' | 'cashed-out' | 'completed';

export interface HiLoState {
  readonly bet: number;
  readonly currentCard: Card;
  readonly remainingDeck: readonly Card[];
  readonly multiplier: number;
  readonly correctGuesses: number;
  readonly status: HiLoStatus;
  readonly lastCard?: Card;
  readonly lastPrediction?: HiLoPrediction;
  readonly payout: number;
  readonly profit: number;
}

export interface HiLoOdds {
  readonly winningCards: number;
  readonly tyingCards: number;
  readonly losingCards: number;
  readonly chance: number;
}

const EMPTY_SETTLEMENT = { payout: 0, profit: 0 } as const;

export const getHiLoOdds = (state: HiLoState, prediction: HiLoPrediction): HiLoOdds => {
  const current = rankHighValue(state.currentCard.rank);
  let winningCards = 0;
  let tyingCards = 0;
  for (const card of state.remainingDeck) {
    const next = rankHighValue(card.rank);
    if (next === current) tyingCards += 1;
    else if ((prediction === 'higher' && next > current) || (prediction === 'lower' && next < current)) {
      winningCards += 1;
    }
  }
  const losingCards = state.remainingDeck.length - winningCards - tyingCards;
  return {
    winningCards,
    tyingCards,
    losingCards,
    chance: state.remainingDeck.length === 0 ? 0 : winningCards / state.remainingDeck.length,
  };
};

export const startHiLo = (
  bet: number,
  random: RandomSource = Math.random,
  scriptedDeck?: readonly Card[],
): HiLoState => {
  assertBet(bet);
  const deck = scriptedDeck ? [...scriptedDeck] : createShuffledDeck(random);
  assertDeckHas(deck, 2);
  return {
    bet,
    currentCard: deck[0]!,
    remainingDeck: deck.slice(1),
    multiplier: 1,
    correctGuesses: 0,
    status: 'active',
    ...EMPTY_SETTLEMENT,
  };
};

export const guessHiLo = (
  state: HiLoState,
  prediction: HiLoPrediction,
  houseEdge = 0.01,
): HiLoState => {
  if (state.status !== 'active') throw new Error('Hi-Lo round is no longer active.');
  if (houseEdge < 0 || houseEdge >= 1) throw new RangeError('House edge must be in [0, 1).');
  const odds = getHiLoOdds(state, prediction);
  if (odds.chance === 0) throw new RangeError(`There are no cards ${prediction} than the current card.`);

  const nextCard = state.remainingDeck[0]!;
  const remainingDeck = state.remainingDeck.slice(1);
  const currentValue = rankHighValue(state.currentCard.rank);
  const nextValue = rankHighValue(nextCard.rank);
  const correct = prediction === 'higher' ? nextValue > currentValue : nextValue < currentValue;

  if (!correct) {
    return {
      ...state,
      currentCard: nextCard,
      remainingDeck,
      lastCard: state.currentCard,
      lastPrediction: prediction,
      status: 'lost',
      payout: 0,
      profit: -state.bet,
    };
  }

  const multiplier = roundTo(state.multiplier * ((1 - houseEdge) / odds.chance), 4);
  const completed = remainingDeck.length === 0;
  const payout = completed ? roundCoins(state.bet * multiplier) : 0;
  return {
    ...state,
    currentCard: nextCard,
    remainingDeck,
    lastCard: state.currentCard,
    lastPrediction: prediction,
    multiplier,
    correctGuesses: state.correctGuesses + 1,
    status: completed ? 'completed' : 'active',
    payout,
    profit: completed ? roundCoins(payout - state.bet) : 0,
  };
};

export const cashOutHiLo = (state: HiLoState): HiLoState => {
  if (state.status !== 'active') throw new Error('Hi-Lo round is no longer active.');
  if (state.correctGuesses === 0) throw new Error('Make at least one correct prediction before cashing out.');
  const payout = roundCoins(state.bet * state.multiplier);
  return { ...state, status: 'cashed-out', payout, profit: roundCoins(payout - state.bet) };
};

