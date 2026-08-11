export type GameSlug =
  | 'blackjack'
  | 'roulette'
  | 'baccarat'
  | 'video-poker'
  | 'slots'
  | 'plinko'
  | 'mines'
  | 'crash'
  | 'dice'
  | 'limbo'
  | 'keno'
  | 'hilo'
  | 'wheel'
  | 'towers'
  | 'coin-flip'
  | 'diamonds'
  | 'roshambo'
  | 'dragon-tower'
  | 'poker'
  | 'scratch'
  | 'lucky-cups'
  | 'red-dog';

export type GameCategory = 'Featured' | 'Originals' | 'Table' | 'Slots' | 'Arcade';

export type GameArt =
  | 'cards'
  | 'roulette'
  | 'baccarat'
  | 'poker'
  | 'slots'
  | 'plinko'
  | 'mines'
  | 'rocket'
  | 'dice'
  | 'number'
  | 'keno'
  | 'hilo'
  | 'wheel'
  | 'tower'
  | 'coin'
  | 'diamond'
  | 'hands'
  | 'dragon'
  | 'scratch'
  | 'cups'
  | 'red-dog';

export interface GameDefinition {
  slug: GameSlug;
  name: string;
  category: GameCategory;
  art: GameArt;
  colors: readonly [string, string];
  edge: string;
  featured?: boolean;
  description: string;
}

export type GameResult = 'win' | 'loss' | 'push';

export interface HistoryEvent {
  id: string;
  timestamp: number;
  game: GameSlug;
  bet: number;
  result: GameResult;
  payout: number;
  net: number;
  detail?: string;
}

export interface PerGameStats {
  plays: number;
  wins: number;
  losses: number;
  pushes: number;
  coinsWagered: number;
  coinsWon: number;
  bestResult: number;
}

export interface GlobalStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  coinsWagered: number;
  coinsWon: number;
  currentStreak: number;
  bestStreak: number;
  perGame: Partial<Record<GameSlug, PerGameStats>>;
}

export interface AppSettings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  theme: 'light' | 'lavender';
}

export interface RewardsState {
  lastDailyClaimDate: string | null;
  streak: number;
  mysteryAvailableAt: number;
  rewardClockAt: number;
  weeklyKey: string;
  weeklyWins: number;
  weeklyClaimed: boolean;
  unlockedAchievements: string[];
}

export interface PendingRound {
  id: string;
  game: GameSlug;
  bet: number;
  startedAt: number;
}

export interface PersistedAppState {
  version: number;
  persistenceRevision: number;
  hydrated: boolean;
  hasCompletedOnboarding: boolean;
  balance: number;
  xp: number;
  settings: AppSettings;
  rewards: RewardsState;
  stats: GlobalStats;
  history: HistoryEvent[];
  pendingRound: PendingRound | null;
}
