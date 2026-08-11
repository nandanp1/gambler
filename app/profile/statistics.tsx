import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ClayCard } from '@/components/ClayCard';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { GAME_BY_SLUG } from '@/data/games';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, radius, typography } from '@/theme';
import type { GameSlug } from '@/types';
import { formatCoins } from '@/utils/format';

export default function StatisticsScreen() {
  const { state } = useAppStore();
  const winRate = state.stats.gamesPlayed ? Math.round((state.stats.wins / state.stats.gamesPlayed) * 100) : 0;
  const gameRows = useMemo(() => Object.entries(state.stats.perGame)
    .sort(([, a], [, b]) => (b?.plays ?? 0) - (a?.plays ?? 0)), [state.stats.perGame]);
  const net = state.stats.coinsWon - state.stats.coinsWagered;

  return (
    <Screen bottomInset={32} scroll>
      <GameHeader title="Statistics" />
      <View style={styles.content}>
        <View style={styles.statRow}><StatCard label="Games" value={state.stats.gamesPlayed} /><StatCard color={colors.success} label="Win rate" value={`${winRate}%`} /></View>
        <View style={styles.statRow}><StatCard label="Best streak" value={state.stats.bestStreak} /><StatCard color={net >= 0 ? colors.success : colors.danger} label="Net coins" value={`${net >= 0 ? '+' : ''}${formatCoins(net)}`} /></View>

        <Text style={styles.heading}>By game</Text>
        {gameRows.length ? gameRows.map(([slug, stats]) => {
          if (!stats) return null;
          const game = GAME_BY_SLUG[slug as GameSlug];
          return (
            <ClayCard key={slug} padded={false} style={styles.gameCard}>
              <View style={styles.gameRow}>
                <View style={[styles.colorDot, { backgroundColor: game.colors[1] }]} />
                <View style={styles.gameCopy}><Text style={styles.gameName}>{game.name}</Text><Text style={styles.gameDetail}>{stats.plays} plays · {stats.wins} wins · {formatCoins(stats.coinsWagered)} wagered</Text></View>
                <Text style={styles.best}>{stats.bestResult > 0 ? `+${formatCoins(stats.bestResult)}` : '—'}</Text>
              </View>
            </ClayCard>
          );
        }) : <Text style={styles.empty}>Play a game and your stats will appear here.</Text>}

        <Text style={styles.heading}>Recent activity</Text>
        {state.history.slice(0, 20).map((event) => (
          <View key={event.id} style={styles.historyRow}>
            <View style={styles.gameCopy}><Text style={styles.gameName}>{GAME_BY_SLUG[event.game].name}</Text><Text style={styles.gameDetail}>{new Date(event.timestamp).toLocaleString()} · bet {formatCoins(event.bet)}</Text></View>
            <Text style={[styles.net, { color: event.net >= 0 ? colors.success : colors.danger }]}>{event.net >= 0 ? '+' : ''}{formatCoins(event.net)}</Text>
          </View>
        ))}
        {!state.history.length && <Text style={styles.empty}>No recent rounds yet.</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  heading: { color: colors.text, fontFamily: typography.display, fontSize: 23, marginBottom: 10, marginTop: 12 },
  gameCard: { marginBottom: 9 },
  gameRow: { alignItems: 'center', flexDirection: 'row', gap: 11, minHeight: 68, paddingHorizontal: 14, paddingVertical: 11 },
  colorDot: { borderRadius: 14, height: 28, width: 28 },
  gameCopy: { flex: 1 },
  gameName: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 14.5 },
  gameDetail: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 11.5, marginTop: 2 },
  best: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 13 },
  historyRow: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.control, flexDirection: 'row', marginBottom: 7, minHeight: 62, paddingHorizontal: 14, paddingVertical: 9 },
  net: { fontFamily: typography.uiBlack, fontSize: 14 },
  empty: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 14, paddingVertical: 18, textAlign: 'center' },
});
