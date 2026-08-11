import React from 'react';
import { StyleSheet, View } from 'react-native';

import { GameTile } from '@/components/GameTile';
import type { GameDefinition } from '@/types';

export function GameGrid({ games, compact = false }: { games: GameDefinition[]; compact?: boolean }) {
  const rows: GameDefinition[][] = [];
  for (let index = 0; index < games.length; index += 2) rows.push(games.slice(index, index + 2));
  return (
    <View style={styles.rows}>
      {rows.map((row) => (
        <View key={row.map((game) => game.slug).join('-')} style={styles.row}>
          {row.map((game) => <GameTile compact={compact} game={game} key={game.slug} />)}
          {row.length === 1 && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 18 },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 14 },
  spacer: { flex: 1 },
});

