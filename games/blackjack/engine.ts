import {
  BLACKJACK_RANKS,
  BLACKJACK_SUITS,
  type BlackjackAction,
  type BlackjackActionName,
  type BlackjackActions,
  type BlackjackCard,
  type BlackjackHand,
  type BlackjackHandOutcome,
  type BlackjackRoundOutcome,
  type BlackjackRules,
  type BlackjackState,
  type HandScore,
  type PlayerHandStatus,
  type RandomSource,
  type StartBlackjackOptions,
} from './types';

export * from './types';

export const DEFAULT_BLACKJACK_RULES: BlackjackRules = {
  blackjackPayout: 1.5,
  dealerHitsSoft17: false,
  doubleAfterSplit: true,
  hitSplitAces: false,
  resplitAces: false,
  maxHands: 4,
};

export type BlackjackErrorCode =
  | 'INVALID_BET'
  | 'INVALID_DECK'
  | 'DECK_EXHAUSTED'
  | 'ROUND_SETTLED'
  | 'ACTION_NOT_ALLOWED';

export class BlackjackError extends Error {
  constructor(
    public readonly code: BlackjackErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BlackjackError';
  }
}

const NO_ACTIONS: BlackjackActions = {
  hit: false,
  stand: false,
  double: false,
  split: false,
};

const CARD_IDS = new Set(
  BLACKJACK_SUITS.flatMap((suit) => BLACKJACK_RANKS.map((rank) => `${rank}${suit}`)),
);

export const createCard = (
  rank: BlackjackCard['rank'],
  suit: BlackjackCard['suit'],
): BlackjackCard => ({ rank, suit, id: `${rank}${suit}` });

/** Creates one unshuffled, standard 52-card deck. */
export const createDeck = (): BlackjackCard[] =>
  BLACKJACK_SUITS.flatMap((suit) => BLACKJACK_RANKS.map((rank) => createCard(rank, suit)));

/** Fisher-Yates shuffle. The input is never mutated. */
export const shuffleDeck = (
  cards: readonly BlackjackCard[] = createDeck(),
  random: RandomSource = Math.random,
): BlackjackCard[] => {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = random();
    if (!Number.isFinite(sample)) {
      throw new BlackjackError('INVALID_DECK', 'The random source must return a finite number.');
    }
    const normalized = Math.min(1 - Number.EPSILON, Math.max(0, sample));
    const swapIndex = Math.floor(normalized * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
};

const rankValue = (rank: BlackjackCard['rank']): number => {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10;
  return Number(rank);
};

/** Scores aces as 11 where possible, and as 1 whenever needed to avoid a bust. */
export const scoreHand = (cards: readonly BlackjackCard[]): HandScore => {
  let total = 0;
  let acesAtEleven = 0;

  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') acesAtEleven += 1;
  }

  while (total > 21 && acesAtEleven > 0) {
    total -= 10;
    acesAtEleven -= 1;
  }

  return {
    total,
    isSoft: acesAtEleven > 0,
    isBust: total > 21,
    isBlackjack: cards.length === 2 && total === 21,
  };
};

export const getHandValue = (cards: readonly BlackjackCard[]): number => scoreHand(cards).total;

export const dealerShouldHit = (
  cards: readonly BlackjackCard[],
  dealerHitsSoft17 = DEFAULT_BLACKJACK_RULES.dealerHitsSoft17,
): boolean => {
  const score = scoreHand(cards);
  return score.total < 17 || (dealerHitsSoft17 && score.total === 17 && score.isSoft);
};

const validateRules = (partial: Partial<BlackjackRules> | undefined): BlackjackRules => {
  const rules = { ...DEFAULT_BLACKJACK_RULES, ...partial };
  if (!Number.isFinite(rules.blackjackPayout) || rules.blackjackPayout < 0) {
    throw new BlackjackError('INVALID_BET', 'Blackjack payout must be a non-negative number.');
  }
  if (!Number.isInteger(rules.maxHands) || rules.maxHands < 1) {
    throw new BlackjackError('INVALID_DECK', 'maxHands must be a positive integer.');
  }
  return rules;
};

const validateBet = (bet: number): void => {
  if (!Number.isFinite(bet) || bet <= 0) {
    throw new BlackjackError('INVALID_BET', 'Bet must be a positive finite number.');
  }
};

const validateDeck = (deck: readonly BlackjackCard[], minimumCards: number): void => {
  if (deck.length < minimumCards) {
    throw new BlackjackError(
      'INVALID_DECK',
      `The deck must contain at least ${minimumCards} cards.`,
    );
  }
  for (const card of deck) {
    if (!card || !CARD_IDS.has(`${card.rank}${card.suit}`)) {
      throw new BlackjackError('INVALID_DECK', 'The deck contains an invalid card.');
    }
  }
};

interface DrawResult {
  readonly card: BlackjackCard;
  readonly deck: readonly BlackjackCard[];
}

const draw = (deck: readonly BlackjackCard[]): DrawResult => {
  const card = deck[0];
  if (!card) {
    throw new BlackjackError('DECK_EXHAUSTED', 'No cards remain in the deck.');
  }
  return { card, deck: deck.slice(1) };
};

const createHand = (
  id: string,
  cards: readonly BlackjackCard[],
  bet: number,
  options: {
    status?: PlayerHandStatus;
    fromSplit?: boolean;
    splitAces?: boolean;
    doubled?: boolean;
    outcome?: BlackjackHandOutcome | null;
    payout?: number;
  } = {},
): BlackjackHand => ({
  id,
  cards: [...cards],
  score: scoreHand(cards),
  bet,
  status: options.status ?? 'playing',
  fromSplit: options.fromSplit ?? false,
  splitAces: options.splitAces ?? false,
  doubled: options.doubled ?? false,
  outcome: options.outcome ?? null,
  payout: options.payout ?? 0,
});

const replaceHand = (
  hand: BlackjackHand,
  changes: Partial<
    Pick<
      BlackjackHand,
      'cards' | 'bet' | 'status' | 'fromSplit' | 'splitAces' | 'doubled' | 'outcome' | 'payout'
    >
  >,
): BlackjackHand => {
  const cards = changes.cards ?? hand.cards;
  return {
    ...hand,
    ...changes,
    cards: [...cards],
    score: scoreHand(cards),
  };
};

const sumBets = (hands: readonly BlackjackHand[]): number =>
  hands.reduce((total, hand) => total + hand.bet, 0);

const isEligibleNatural = (hand: BlackjackHand): boolean =>
  !hand.fromSplit && hand.score.isBlackjack;

const canSplitHand = (state: BlackjackState, hand: BlackjackHand): boolean => {
  const [first, second] = hand.cards;
  if (
    state.phase !== 'player-turn' ||
    hand.status !== 'playing' ||
    hand.cards.length !== 2 ||
    !first ||
    !second ||
    first.rank !== second.rank ||
    state.playerHands.length >= state.rules.maxHands ||
    state.deck.length < 2
  ) {
    return false;
  }
  return first.rank !== 'A' || !hand.fromSplit || state.rules.resplitAces;
};

const canDoubleHand = (state: BlackjackState, hand: BlackjackHand): boolean =>
  state.phase === 'player-turn' &&
  hand.status === 'playing' &&
  hand.cards.length === 2 &&
  state.deck.length > 0 &&
  (!hand.fromSplit || state.rules.doubleAfterSplit) &&
  !(hand.splitAces && !state.rules.hitSplitAces);

const actionsFor = (state: BlackjackState): BlackjackActions => {
  if (state.phase !== 'player-turn' || state.activeHandIndex === null) return NO_ACTIONS;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'playing') return NO_ACTIONS;
  const mayHit =
    state.deck.length > 0 &&
    hand.score.total < 21 &&
    !(hand.splitAces && !state.rules.hitSplitAces);
  return {
    hit: mayHit,
    stand: true,
    double: canDoubleHand(state, hand),
    split: canSplitHand(state, hand),
  };
};

const withDerived = (
  state: Omit<BlackjackState, 'availableActions'> & {
    readonly availableActions?: BlackjackActions;
  },
): BlackjackState => {
  const next = { ...state, availableActions: NO_ACTIONS } as BlackjackState;
  return { ...next, availableActions: actionsFor(next) };
};

const aggregateOutcome = (
  hands: readonly BlackjackHand[],
  payout: number,
  totalBet: number,
): BlackjackRoundOutcome => {
  if (hands.length === 1 && hands[0]?.outcome === 'blackjack') return 'blackjack';
  const outcomes = new Set(hands.map((hand) => hand.outcome));
  if (outcomes.size > 1) return 'mixed';
  if (payout > totalBet) return 'win';
  if (payout < totalBet) return 'loss';
  return 'push';
};

/** Gross credit for a settled outcome. */
export const calculatePayout = (
  outcome: BlackjackHandOutcome,
  bet: number,
  blackjackPayout = DEFAULT_BLACKJACK_RULES.blackjackPayout,
): number => {
  validateBet(bet);
  if (outcome === 'blackjack') return bet * (1 + blackjackPayout);
  if (outcome === 'win') return bet * 2;
  if (outcome === 'push') return bet;
  return 0;
};

const settleOneHand = (
  hand: BlackjackHand,
  dealerCards: readonly BlackjackCard[],
  rules: BlackjackRules,
): BlackjackHand => {
  const dealerScore = scoreHand(dealerCards);
  const dealerBlackjack = dealerScore.isBlackjack;
  const playerBlackjack = isEligibleNatural(hand);
  let outcome: BlackjackHandOutcome;

  if (hand.score.isBust) outcome = 'bust';
  else if (playerBlackjack && dealerBlackjack) outcome = 'push';
  else if (playerBlackjack) outcome = 'blackjack';
  else if (dealerBlackjack) outcome = 'loss';
  else if (dealerScore.isBust) outcome = 'win';
  else if (hand.score.total > dealerScore.total) outcome = 'win';
  else if (hand.score.total < dealerScore.total) outcome = 'loss';
  else outcome = 'push';

  return replaceHand(hand, {
    status: playerBlackjack ? 'blackjack' : hand.score.isBust ? 'bust' : 'stood',
    outcome,
    payout: calculatePayout(outcome, hand.bet, rules.blackjackPayout),
  });
};

const settleRound = (state: BlackjackState): BlackjackState => {
  const playerHands = state.playerHands.map((hand) =>
    settleOneHand(hand, state.dealer.cards, state.rules),
  );
  const totalBet = sumBets(playerHands);
  const payout = playerHands.reduce((total, hand) => total + hand.payout, 0);
  return withDerived({
    ...state,
    phase: 'settled',
    activeHandIndex: null,
    playerHands,
    totalBet,
    payout,
    net: payout - totalBet,
    outcome: aggregateOutcome(playerHands, payout, totalBet),
  });
};

const runDealerTurn = (state: BlackjackState): BlackjackState => {
  let deck = state.deck;
  let dealerCards = [...state.dealer.cards];
  const hasLivePlayerHand = state.playerHands.some((hand) => !hand.score.isBust);

  if (hasLivePlayerHand) {
    while (dealerShouldHit(dealerCards, state.rules.dealerHitsSoft17)) {
      const drawn = draw(deck);
      dealerCards = [...dealerCards, drawn.card];
      deck = drawn.deck;
    }
  }

  return settleRound(
    withDerived({
      ...state,
      phase: 'dealer-turn',
      activeHandIndex: null,
      deck,
      dealer: { cards: dealerCards, score: scoreHand(dealerCards) },
    }),
  );
};

const advanceFrom = (state: BlackjackState, completedIndex: number): BlackjackState => {
  const nextIndex = state.playerHands.findIndex(
    (hand, index) => index > completedIndex && hand.status === 'playing',
  );
  if (nextIndex >= 0) {
    return withDerived({ ...state, activeHandIndex: nextIndex });
  }
  return runDealerTurn(withDerived({ ...state, phase: 'dealer-turn', activeHandIndex: null }));
};

const requireAction = (state: BlackjackState, action: BlackjackActionName): number => {
  if (state.phase === 'settled') {
    throw new BlackjackError('ROUND_SETTLED', 'This blackjack round is already settled.');
  }
  if (!state.availableActions[action] || state.activeHandIndex === null) {
    throw new BlackjackError('ACTION_NOT_ALLOWED', `${action} is not allowed right now.`);
  }
  return state.activeHandIndex;
};

/**
 * Starts a round and deals in casino order: player, dealer, player, dealer.
 * A supplied deck is consumed from index 0 and is not shuffled.
 */
export const startBlackjack = (
  bet: number,
  options: StartBlackjackOptions | readonly BlackjackCard[] = {},
): BlackjackState => {
  validateBet(bet);
  const normalizedOptions: StartBlackjackOptions = Array.isArray(options)
    ? { deck: options as readonly BlackjackCard[] }
    : (options as StartBlackjackOptions);
  const rules = validateRules(normalizedOptions.rules);
  const deck = normalizedOptions.deck
    ? [...normalizedOptions.deck]
    : shuffleDeck(createDeck(), normalizedOptions.random);
  validateDeck(deck, 4);

  const firstPlayer = draw(deck);
  const firstDealer = draw(firstPlayer.deck);
  const secondPlayer = draw(firstDealer.deck);
  const secondDealer = draw(secondPlayer.deck);
  const playerCards = [firstPlayer.card, secondPlayer.card];
  const dealerCards = [firstDealer.card, secondDealer.card];
  const playerNatural = scoreHand(playerCards).isBlackjack;
  const dealerNatural = scoreHand(dealerCards).isBlackjack;

  let state = withDerived({
    phase: 'player-turn',
    deck: secondDealer.deck,
    dealer: { cards: dealerCards, score: scoreHand(dealerCards) },
    playerHands: [
      createHand('hand-1', playerCards, bet, {
        status: playerNatural ? 'blackjack' : 'playing',
      }),
    ],
    activeHandIndex: playerNatural || dealerNatural ? null : 0,
    initialBet: bet,
    totalBet: bet,
    payout: 0,
    net: -bet,
    outcome: null,
    rules,
    nextHandId: 2,
  });

  if (playerNatural || dealerNatural) state = settleRound(state);
  return state;
};

export const hit = (state: BlackjackState): BlackjackState => {
  const handIndex = requireAction(state, 'hit');
  const hand = state.playerHands[handIndex]!;
  const drawn = draw(state.deck);
  const cards = [...hand.cards, drawn.card];
  const score = scoreHand(cards);
  const status: PlayerHandStatus = score.isBust ? 'bust' : score.total === 21 ? 'stood' : 'playing';
  const playerHands = state.playerHands.map((candidate, index) =>
    index === handIndex ? replaceHand(candidate, { cards, status }) : candidate,
  );
  const nextState = withDerived({ ...state, deck: drawn.deck, playerHands });
  return status === 'playing' ? nextState : advanceFrom(nextState, handIndex);
};

export const stand = (state: BlackjackState): BlackjackState => {
  const handIndex = requireAction(state, 'stand');
  const playerHands = state.playerHands.map((hand, index) =>
    index === handIndex ? replaceHand(hand, { status: 'stood' }) : hand,
  );
  return advanceFrom(withDerived({ ...state, playerHands }), handIndex);
};

/** Doubles the active stake, deals exactly one card, and completes that hand. */
export const doubleDown = (state: BlackjackState): BlackjackState => {
  const handIndex = requireAction(state, 'double');
  const hand = state.playerHands[handIndex]!;
  const drawn = draw(state.deck);
  const cards = [...hand.cards, drawn.card];
  const score = scoreHand(cards);
  const playerHands = state.playerHands.map((candidate, index) =>
    index === handIndex
      ? replaceHand(candidate, {
          cards,
          bet: candidate.bet * 2,
          doubled: true,
          status: score.isBust ? 'bust' : 'stood',
        })
      : candidate,
  );
  return advanceFrom(
    withDerived({
      ...state,
      deck: drawn.deck,
      playerHands,
      totalBet: sumBets(playerHands),
    }),
    handIndex,
  );
};

/** Splits the active pair and deals one card to each new hand. */
export const split = (state: BlackjackState): BlackjackState => {
  const handIndex = requireAction(state, 'split');
  const original = state.playerHands[handIndex]!;
  const firstCard = original.cards[0]!;
  const secondCard = original.cards[1]!;
  const firstDraw = draw(state.deck);
  const secondDraw = draw(firstDraw.deck);
  const splitAces = firstCard.rank === 'A';
  const forcedStand = splitAces && !state.rules.hitSplitAces;
  const firstCards = [firstCard, firstDraw.card];
  const secondCards = [secondCard, secondDraw.card];
  const firstStatus: PlayerHandStatus =
    forcedStand || scoreHand(firstCards).total === 21 ? 'stood' : 'playing';
  const secondStatus: PlayerHandStatus =
    forcedStand || scoreHand(secondCards).total === 21 ? 'stood' : 'playing';
  const firstHand = createHand(original.id, firstCards, original.bet, {
    status: firstStatus,
    fromSplit: true,
    splitAces,
  });
  const secondHand = createHand(`hand-${state.nextHandId}`, secondCards, original.bet, {
    status: secondStatus,
    fromSplit: true,
    splitAces,
  });
  const playerHands = [
    ...state.playerHands.slice(0, handIndex),
    firstHand,
    secondHand,
    ...state.playerHands.slice(handIndex + 1),
  ];
  const activeHandIndex = firstStatus === 'playing'
    ? handIndex
    : secondStatus === 'playing'
      ? handIndex + 1
      : null;
  const nextState = withDerived({
    ...state,
    deck: secondDraw.deck,
    playerHands,
    activeHandIndex,
    totalBet: sumBets(playerHands),
    nextHandId: state.nextHandId + 1,
  });

  return activeHandIndex === null ? runDealerTurn(nextState) : nextState;
};

export const playBlackjackAction = (
  state: BlackjackState,
  action: BlackjackAction | BlackjackActionName,
): BlackjackState => {
  const type = typeof action === 'string' ? action : action.type;
  if (type === 'hit') return hit(state);
  if (type === 'stand') return stand(state);
  if (type === 'double') return doubleDown(state);
  return split(state);
};

export const getAvailableActions = (state: BlackjackState): BlackjackActions =>
  state.availableActions;

export const getActiveHand = (state: BlackjackState): BlackjackHand | null =>
  state.activeHandIndex === null ? null : state.playerHands[state.activeHandIndex] ?? null;

/** Extra wallet debit required before an action is applied. */
export const getActionCost = (
  state: BlackjackState,
  action: BlackjackActionName,
): number => {
  if (!state.availableActions[action]) return 0;
  if (action !== 'double' && action !== 'split') return 0;
  return getActiveHand(state)?.bet ?? 0;
};

/** Dealer total that is safe to show while the hole card is hidden. */
export const getVisibleDealerScore = (state: BlackjackState): HandScore =>
  state.phase === 'player-turn'
    ? scoreHand(state.dealer.cards.slice(0, 1))
    : state.dealer.score;

/** Maps split/mixed engine results onto the app's wallet/history result model. */
export const classifyRoundByNet = (state: BlackjackState): 'win' | 'loss' | 'push' => {
  if (state.net > 0) return 'win';
  if (state.net < 0) return 'loss';
  return 'push';
};

// Concise aliases for UI code and older call sites.
export const startRound = startBlackjack;
export const startGame = startBlackjack;
export const hitHand = hit;
export const standHand = stand;
export const doubleHand = doubleDown;
export const splitHand = split;
export const calculateHand = scoreHand;
export const shouldDealerHit = dealerShouldHit;
