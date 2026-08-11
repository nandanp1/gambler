import type { GameCategory, GameDefinition, GameSlug } from '@/types';

export const GAME_CATEGORIES: Array<'Featured' | GameCategory> = [
  'Featured',
  'Originals',
  'Table',
  'Slots',
  'Arcade',
];

export const GAMES: GameDefinition[] = [
  { slug: 'blackjack', name: 'Blackjack', category: 'Table', art: 'cards', colors: ['#FF9E8E', '#F4695A'], edge: '#DB5344', featured: true, description: 'Deal, hit, split and beat the dealer.' },
  { slug: 'dice', name: 'Dice', category: 'Originals', art: 'dice', colors: ['#8FCEFF', '#4EA3F5'], edge: '#3789D8', featured: true, description: 'Pick your target and roll under or over.' },
  { slug: 'mines', name: 'Mines', category: 'Originals', art: 'mines', colors: ['#8DE9CD', '#42C9A4'], edge: '#2CAF8B', featured: true, description: 'Reveal gems and cash out before a mine.' },
  { slug: 'plinko', name: 'Plinko', category: 'Originals', art: 'plinko', colors: ['#B7A4FF', '#8264F2'], edge: '#6A4CD8', featured: true, description: 'Bounce a clay ball into a multiplier.' },
  { slug: 'slots', name: 'Clay Reels', category: 'Slots', art: 'slots', colors: ['#FFC5DC', '#FF7FB0'], edge: '#E95A95', featured: true, description: 'Three tactile reels and one lucky line.' },
  { slug: 'roulette', name: 'Roulette', category: 'Table', art: 'roulette', colors: ['#8DE0FF', '#4EA3F5'], edge: '#3789D8', featured: true, description: 'European roulette with 0 through 36.' },
  { slug: 'crash', name: 'Rocket Ride', category: 'Originals', art: 'rocket', colors: ['#FFE08F', '#FFB13D'], edge: '#E6961F', featured: true, description: 'Cash out before the clay rocket pops.' },
  { slug: 'baccarat', name: 'Baccarat', category: 'Table', art: 'baccarat', colors: ['#B7A4FF', '#8264F2'], edge: '#6A4CD8', description: 'A quick round of Punto Banco.' },
  { slug: 'video-poker', name: 'Video Poker', category: 'Table', art: 'poker', colors: ['#8DE9CD', '#42C9A4'], edge: '#2CAF8B', description: 'Jacks or Better with hold and draw.' },
  { slug: 'hilo', name: 'Hi-Lo', category: 'Table', art: 'hilo', colors: ['#FFB7A8', '#FF7668'], edge: '#DB5344', description: 'Guess whether the next card is higher.' },
  { slug: 'wheel', name: 'Lucky Wheel', category: 'Arcade', art: 'wheel', colors: ['#8DE0FF', '#4EA3F5'], edge: '#3789D8', description: 'Spin a colorful wheel of multipliers.' },
  { slug: 'keno', name: 'Keno Pop', category: 'Arcade', art: 'keno', colors: ['#FFC5DC', '#FF7FB0'], edge: '#E95A95', description: 'Pick numbers and watch the balls pop.' },
  { slug: 'limbo', name: 'Limbo', category: 'Originals', art: 'number', colors: ['#C4B4FF', '#8E74F5'], edge: '#6A4CD8', description: 'Set a multiplier and clear the target.' },
  { slug: 'towers', name: 'Towers', category: 'Originals', art: 'tower', colors: ['#8DE9CD', '#42C9A4'], edge: '#2CAF8B', description: 'Climb safely and cash out whenever.' },
  { slug: 'coin-flip', name: 'Coin Flip', category: 'Arcade', art: 'coin', colors: ['#FFE08F', '#FFB13D'], edge: '#E6961F', description: 'Heads or tails, in satisfyingly soft clay.' },
  { slug: 'diamonds', name: 'Diamonds', category: 'Arcade', art: 'diamond', colors: ['#8DE0FF', '#4EA3F5'], edge: '#3789D8', description: 'Pick a gem and match its sparkle.' },
  { slug: 'roshambo', name: 'Roshambo', category: 'Arcade', art: 'hands', colors: ['#FFB7A8', '#FF7668'], edge: '#DB5344', description: 'Rock, paper, scissors with clay hands.' },
  { slug: 'dragon-tower', name: 'Dragon Tower', category: 'Originals', art: 'dragon', colors: ['#B7A4FF', '#8264F2'], edge: '#6A4CD8', description: 'Choose safe eggs as the tower rises.' },
  { slug: 'poker', name: 'Three Card Poker', category: 'Table', art: 'poker', colors: ['#8DE9CD', '#42C9A4'], edge: '#2CAF8B', description: 'A compact three-card hand showdown.' },
  { slug: 'scratch', name: 'Scratch Party', category: 'Arcade', art: 'scratch', colors: ['#FFC5DC', '#FF7FB0'], edge: '#E95A95', description: 'Reveal three matching clay prizes.' },
  { slug: 'lucky-cups', name: 'Lucky Cups', category: 'Arcade', art: 'cups', colors: ['#FFE08F', '#FFB13D'], edge: '#E6961F', description: 'Follow the coin beneath three cups.' },
  { slug: 'red-dog', name: 'Red Dog', category: 'Table', art: 'red-dog', colors: ['#FF9E8E', '#F4695A'], edge: '#DB5344', description: 'Bet on a card landing between two ranks.' },
];

export const GAME_BY_SLUG = Object.fromEntries(GAMES.map((game) => [game.slug, game])) as Record<GameSlug, GameDefinition>;

export const getFeaturedGames = () => GAMES.filter((game) => game.featured);

