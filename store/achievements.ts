import type { GameSlug, GlobalStats, HistoryEvent } from '@/types';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-win', title: 'First Win', description: 'Win your first game', icon: 'sparkles' },
  { id: 'play-10', title: 'Arcade Regular', description: 'Play 10 games', icon: 'game-controller' },
  { id: 'play-100', title: 'Clay Champion', description: 'Play 100 games', icon: 'trophy' },
  { id: 'blackjack-5', title: 'Table Talent', description: 'Win 5 Blackjack hands', icon: 'albums' },
  { id: 'blackjack-natural', title: 'Natural!', description: 'Hit Blackjack', icon: 'flash' },
  { id: 'roulette-number', title: 'Straight Up', description: 'Win a Roulette number bet', icon: 'radio-button-on' },
  { id: 'plinko-10x', title: 'Edge Catcher', description: 'Land a 10× Plinko bucket', icon: 'ellipse' },
  { id: 'mines-5-safe', title: 'Gem Hunter', description: 'Reveal 5 safe Mines tiles', icon: 'diamond' },
  { id: 'slots-seven', title: 'Triple Seven', description: 'Spin three sevens', icon: 'star' },
  { id: 'streak-5', title: 'On a Roll', description: 'Win 5 games in a row', icon: 'flame' },
  { id: 'dice-first', title: 'Roll With It', description: 'Win a Dice round', icon: 'dice' },
  { id: 'crash-first', title: 'Safe Landing', description: 'Cash out Rocket Ride', icon: 'rocket' },
  { id: 'wheel-first', title: 'Wheel Deal', description: 'Win on the Lucky Wheel', icon: 'sync-circle' },
  { id: 'baccarat-first', title: 'Punto!', description: 'Win a Baccarat hand', icon: 'layers' },
  { id: 'video-poker-first', title: 'Held Together', description: 'Win at Video Poker', icon: 'hand-left' },
  { id: 'hilo-first', title: 'Read the Deck', description: 'Cash out Hi-Lo', icon: 'swap-vertical' },
  { id: 'keno-first', title: 'Number Pop', description: 'Win at Keno', icon: 'apps' },
  { id: 'limbo-first', title: 'Clear the Bar', description: 'Win a Limbo round', icon: 'trending-up' },
  { id: 'towers-first', title: 'First Floor', description: 'Cash out Towers', icon: 'business' },
  { id: 'coin-first', title: 'Called It', description: 'Win a Coin Flip', icon: 'disc' },
  { id: 'diamonds-first', title: 'Perfect Sparkle', description: 'Match a Diamond', icon: 'diamond' },
  { id: 'roshambo-first', title: 'Hand Tactics', description: 'Win Roshambo', icon: 'cut' },
  { id: 'dragon-first', title: 'Egg Scout', description: 'Cash out Dragon Tower', icon: 'flame' },
  { id: 'poker-first', title: 'Three of a Kindred', description: 'Win Three Card Poker', icon: 'albums' },
  { id: 'scratch-first', title: 'Lucky Scratch', description: 'Win Scratch Party', icon: 'ticket' },
  { id: 'play-25', title: 'Quarter Century', description: 'Play 25 games', icon: 'game-controller' },
  { id: 'play-50', title: 'Fifty Rounds', description: 'Play 50 games', icon: 'ribbon' },
  { id: 'play-250', title: 'Arcade Fixture', description: 'Play 250 games', icon: 'medal' },
  { id: 'wins-10', title: 'Ten Wins', description: 'Win 10 games', icon: 'checkmark-done' },
  { id: 'wins-25', title: 'Winning Habit', description: 'Win 25 games', icon: 'sparkles' },
  { id: 'wins-50', title: 'Clay Victor', description: 'Win 50 games', icon: 'trophy' },
  { id: 'streak-3', title: 'Hat Trick', description: 'Win 3 games in a row', icon: 'flame-outline' },
  { id: 'wager-1000', title: 'A Thousand In', description: 'Wager 1,000 fictional coins', icon: 'ellipse' },
  { id: 'wager-10000', title: 'Big Arcade Night', description: 'Wager 10,000 fictional coins', icon: 'ellipse-outline' },
  { id: 'wager-100000', title: 'Clay High Roller', description: 'Wager 100,000 fictional coins', icon: 'planet' },
  { id: 'won-5000', title: 'Coin Shower', description: 'Collect 5,000 coins in payouts', icon: 'rainy' },
  { id: 'won-25000', title: 'Coin Cupboard', description: 'Collect 25,000 coins in payouts', icon: 'file-tray-full' },
  { id: 'won-100000', title: 'Coin Mountain', description: 'Collect 100,000 coins in payouts', icon: 'triangle' },
  { id: 'all-rounder', title: 'All-Rounder', description: 'Try 10 different games', icon: 'grid' },
  { id: 'explorer', title: 'Arcade Explorer', description: 'Try all 22 games', icon: 'map' },
];

const gameWins = (stats: GlobalStats, slug: GameSlug): number => stats.perGame[slug]?.wins ?? 0;

export const evaluateAchievements = (
  stats: GlobalStats,
  event: HistoryEvent,
  existing: readonly string[],
): string[] => {
  const unlocked = new Set(existing);
  if (stats.wins >= 1) unlocked.add('first-win');
  if (stats.gamesPlayed >= 10) unlocked.add('play-10');
  if (stats.gamesPlayed >= 100) unlocked.add('play-100');
  if (gameWins(stats, 'blackjack') >= 5) unlocked.add('blackjack-5');
  if (event.game === 'blackjack' && event.detail === 'blackjack') unlocked.add('blackjack-natural');
  if (event.game === 'roulette' && event.detail === 'single-number-win') unlocked.add('roulette-number');
  if (event.game === 'plinko' && event.detail === '10x') unlocked.add('plinko-10x');
  if (event.game === 'mines' && Number(event.detail?.replace('safe-', '')) >= 5) unlocked.add('mines-5-safe');
  if (event.game === 'slots' && event.detail === 'triple-seven') unlocked.add('slots-seven');
  if (stats.bestStreak >= 5) unlocked.add('streak-5');
  const firstWinIds: Partial<Record<GameSlug, string>> = {
    dice: 'dice-first', crash: 'crash-first', wheel: 'wheel-first', baccarat: 'baccarat-first',
    'video-poker': 'video-poker-first', hilo: 'hilo-first', keno: 'keno-first', limbo: 'limbo-first',
    towers: 'towers-first', 'coin-flip': 'coin-first', diamonds: 'diamonds-first', roshambo: 'roshambo-first',
    'dragon-tower': 'dragon-first', poker: 'poker-first', scratch: 'scratch-first',
  };
  if (event.result === 'win' && firstWinIds[event.game]) unlocked.add(firstWinIds[event.game]!);
  if (stats.gamesPlayed >= 25) unlocked.add('play-25');
  if (stats.gamesPlayed >= 50) unlocked.add('play-50');
  if (stats.gamesPlayed >= 250) unlocked.add('play-250');
  if (stats.wins >= 10) unlocked.add('wins-10');
  if (stats.wins >= 25) unlocked.add('wins-25');
  if (stats.wins >= 50) unlocked.add('wins-50');
  if (stats.bestStreak >= 3) unlocked.add('streak-3');
  if (stats.coinsWagered >= 1_000) unlocked.add('wager-1000');
  if (stats.coinsWagered >= 10_000) unlocked.add('wager-10000');
  if (stats.coinsWagered >= 100_000) unlocked.add('wager-100000');
  if (stats.coinsWon >= 5_000) unlocked.add('won-5000');
  if (stats.coinsWon >= 25_000) unlocked.add('won-25000');
  if (stats.coinsWon >= 100_000) unlocked.add('won-100000');
  const distinctGames = Object.keys(stats.perGame).length;
  if (distinctGames >= 10) unlocked.add('all-rounder');
  if (distinctGames >= 22) unlocked.add('explorer');
  return [...unlocked];
};
