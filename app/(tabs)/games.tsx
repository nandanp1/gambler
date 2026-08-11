import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { GameGrid } from '@/components/GameGrid';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { GAME_CATEGORIES, GAMES } from '@/data/games';
import { colors, typography } from '@/theme';
import type { GameCategory } from '@/types';

export default function GamesScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Featured' | GameCategory>('Featured');

  const games = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const matchesQuery = !normalized || `${game.name} ${game.category} ${game.description}`.toLowerCase().includes(normalized);
      const matchesCategory = normalized ? true : category === 'Featured' ? game.featured : game.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  return (
    <Screen bottomInset={128} scroll>
      <View style={styles.header}>
        <PageHeader title="All Games" />
        <View style={styles.search}><SearchBar onChangeText={setQuery} placeholder="Search 22 games" value={query} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.categories} horizontal showsHorizontalScrollIndicator={false}>
        {GAME_CATEGORIES.map((item) => <CategoryChip key={item} label={item} onPress={() => setCategory(item)} selected={category === item} />)}
      </ScrollView>
      <View style={styles.grid}>
        {games.length ? <GameGrid compact games={games} /> : <Text style={styles.empty}>No games found. Try another category.</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 2 },
  search: { marginTop: 8 },
  categories: { gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  grid: { paddingHorizontal: 20, paddingTop: 20 },
  empty: { color: colors.textMuted, fontFamily: typography.uiBold, paddingVertical: 40, textAlign: 'center' },
});
