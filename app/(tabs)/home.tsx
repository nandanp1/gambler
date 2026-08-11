import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { BalancePill } from '@/components/BalancePill';
import { CategoryChip } from '@/components/CategoryChip';
import { ClayIconButton } from '@/components/ClayIconButton';
import { GameGrid } from '@/components/GameGrid';
import { SearchBar } from '@/components/SearchBar';
import { Screen } from '@/components/Screen';
import { GAMES } from '@/data/games';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';

const HOME_CATEGORIES = ['Featured', 'Originals', 'Table', 'Slots', 'Quick'] as const;

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof HOME_CATEGORIES)[number]>('Featured');
  const { showToast } = useAppStore();
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const games = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const matchesQuery = !normalized || `${game.name} ${game.category}`.toLowerCase().includes(normalized);
      const matchesCategory = category === 'Featured'
        ? game.featured
        : category === 'Quick'
          ? game.category === 'Arcade'
          : game.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  return (
    <Screen bottomInset={128} scroll>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Open profile" accessibilityRole="button" onPress={() => router.push('/(tabs)/profile')} style={styles.identity}>
            <LinearGradient colors={gradients.pink} style={styles.avatar}><Text style={styles.avatarText}>N</Text></LinearGradient>
            <View><Text style={styles.greeting}>{greeting}</Text><Text style={styles.name}>Nandan</Text></View>
          </Pressable>
          <View style={styles.headerActions}>
            <BalancePill compact />
            <View>
              <ClayIconButton accessibilityLabel="Notifications" name="notifications-outline" onPress={() => showToast('You are all caught up')} />
              <View style={styles.unread} />
            </View>
          </View>
        </View>
        <Text style={styles.headline}>What do you want to play?</Text>
        <View style={styles.search}><SearchBar onChangeText={setQuery} placeholder="Search games" value={query} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.categoryRail} horizontal showsHorizontalScrollIndicator={false}>
        {HOME_CATEGORIES.map((item) => <CategoryChip key={item} label={item} onPress={() => setCategory(item)} selected={category === item} />)}
      </ScrollView>
      <View style={styles.grid}>
        {games.length ? <GameGrid games={games} /> : <Text style={styles.empty}>No clay games match that search.</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  avatar: { alignItems: 'center', borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46, ...clayShadow('rgba(180,50,110,.3)', 5) },
  avatarText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 18 },
  greeting: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 13 },
  name: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 15 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  unread: { backgroundColor: '#FF6B8A', borderColor: colors.surface, borderRadius: 5, borderWidth: 2, height: 10, position: 'absolute', right: 8, top: 8, width: 10 },
  headline: { color: colors.text, fontFamily: typography.display, fontSize: 32, letterSpacing: -0.4, lineHeight: 35, marginTop: 22, maxWidth: 320 },
  search: { marginTop: 18 },
  categoryRail: { gap: 8, paddingHorizontal: 20, paddingTop: 18 },
  grid: { paddingHorizontal: 20, paddingTop: 22 },
  empty: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 15, paddingVertical: 40, textAlign: 'center' },
});
