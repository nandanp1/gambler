import { describe, expect, it } from 'vitest';

import { GAMES } from '@/data/games';

describe('game catalog', () => {
  it('contains 22 unique playable game slugs', () => {
    expect(GAMES).toHaveLength(22);
    expect(new Set(GAMES.map((game) => game.slug)).size).toBe(22);
  });

  it('keeps the five fully featured games in the catalog', () => {
    const slugs = new Set(GAMES.map((game) => game.slug));
    expect([...slugs]).toEqual(expect.arrayContaining(['blackjack', 'roulette', 'slots', 'plinko', 'mines']));
  });
});
