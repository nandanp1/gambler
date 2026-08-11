export const BLACKJACK_SUITS = ['♠', '♥', '♦', '♣'] as const;
export const BLACKJACK_RANKS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
] as const;

export type BlackjackSuit = (typeof BLACKJACK_SUITS)[number];
export type BlackjackRank = (typeof BLACKJACK_RANKS)[number];

/** A single card from the standard 52-card deck. */
export interface BlackjackCard {
  readonly rank: BlackjackRank;
  readonly suit: BlackjackSuit;
  /** Stable within a one-deck shoe; convenient as a React key. */
  readonly id: string;
}

export interface HandScore {
  /** Best legal total, or the lowest possible total when the hand has busted. */
  readonly total: number;
  readonly isSoft: boolean;
  readonly isBust: boolean;
  /** Two-card 21. Settlement decides whether it is an eligible natural. */
  readonly isBlackjack: boolean;
}

export type PlayerHandStatus = 'playing' | 'stood' | 'bust' | 'blackjack';

export type BlackjackHandOutcome =
  | 'blackjack'
  | 'win'
  | 'loss'
  | 'push'
  | 'bust';

export interface BlackjackHand {
  readonly id: string;
  readonly cards: readonly BlackjackCard[];
  readonly score: HandScore;
  /** Current stake for this hand. It already includes a double-down, if any. */
  readonly bet: number;
  readonly status: PlayerHandStatus;
  readonly fromSplit: boolean;
  readonly splitAces: boolean;
  readonly doubled: boolean;
  readonly outcome: BlackjackHandOutcome | null;
  /** Gross wallet credit for this hand (stake return plus profit). */
  readonly payout: number;
}

export interface BlackjackDealerHand {
  readonly cards: readonly BlackjackCard[];
  readonly score: HandScore;
}

export type BlackjackPhase = 'player-turn' | 'dealer-turn' | 'settled';

/**
 * `mixed` is possible after a split (for example, one win and one loss).
 * Consumers that only need win/loss/push can use `classifyRoundByNet`.
 */
export type BlackjackRoundOutcome =
  | 'blackjack'
  | 'win'
  | 'loss'
  | 'push'
  | 'mixed';

export interface BlackjackRules {
  /** Profit ratio for a natural. 1.5 means a traditional 3:2 payout. */
  readonly blackjackPayout: number;
  /** The default is false: the dealer stands on every 17. */
  readonly dealerHitsSoft17: boolean;
  readonly doubleAfterSplit: boolean;
  readonly hitSplitAces: boolean;
  readonly resplitAces: boolean;
  /** Four is a common table maximum and still supports the required single split. */
  readonly maxHands: number;
}

export type RandomSource = () => number;

export interface StartBlackjackOptions {
  /**
   * Optional deterministic shoe. The first element is the next card dealt.
   * When omitted, a fresh 52-card deck is shuffled with `random`.
   */
  readonly deck?: readonly BlackjackCard[];
  readonly random?: RandomSource;
  readonly rules?: Partial<BlackjackRules>;
}

export interface BlackjackActions {
  readonly hit: boolean;
  readonly stand: boolean;
  readonly double: boolean;
  readonly split: boolean;
}

export type BlackjackActionName = keyof BlackjackActions;

export type BlackjackAction =
  | { readonly type: 'hit' }
  | { readonly type: 'stand' }
  | { readonly type: 'double' }
  | { readonly type: 'split' };

export interface BlackjackState {
  readonly phase: BlackjackPhase;
  /** Undealt cards, with index 0 being the next card. */
  readonly deck: readonly BlackjackCard[];
  readonly dealer: BlackjackDealerHand;
  readonly playerHands: readonly BlackjackHand[];
  readonly activeHandIndex: number | null;
  readonly initialBet: number;
  /** Sum of all hand stakes, including split and double-down stakes. */
  readonly totalBet: number;
  /** Gross wallet credit for the entire round. */
  readonly payout: number;
  /** `payout - totalBet`. */
  readonly net: number;
  readonly outcome: BlackjackRoundOutcome | null;
  readonly rules: BlackjackRules;
  readonly availableActions: BlackjackActions;
  readonly nextHandId: number;
}

export type BlackjackGameState = BlackjackState;
export type Card = BlackjackCard;
export type Hand = BlackjackHand;
export type GameState = BlackjackState;
