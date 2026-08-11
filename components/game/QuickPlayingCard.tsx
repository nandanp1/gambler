import React from 'react';

import { PlayingCard } from '@/components/PlayingCard';
import type { Card } from '@/games/quick/shared';

const SUITS = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;

export function QuickPlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  return <PlayingCard card={{ rank: card.rank, suit: SUITS[card.suit] }} small={small} />;
}
