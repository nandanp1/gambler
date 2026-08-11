import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { ClayIconButton } from '@/components/ClayIconButton';
import { MenuRow } from '@/components/MenuRow';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { GAME_BY_SLUG } from '@/data/games';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCompact } from '@/utils/format';

export default function ProfileScreen() {
  const { state, level, levelProgress } = useAppStore();
  const currentLevelXp = state.xp % 3_000;
  const xpRemaining = currentLevelXp === 0 && state.xp > 0 ? 3_000 : 3_000 - currentLevelXp;
  const favourite = useMemo(() => {
    const entries = Object.entries(state.stats.perGame);
    const best = entries.sort(([, a], [, b]) => (b?.plays ?? 0) - (a?.plays ?? 0))[0];
    return best ? GAME_BY_SLUG[best[0] as keyof typeof GAME_BY_SLUG].name : '—';
  }, [state.stats.perGame]);

  return (
    <Screen bottomInset={128} scroll>
      <View style={styles.content}>
        <View style={styles.top}><View /><ClayIconButton accessibilityLabel="Settings" name="settings-outline" onPress={() => router.push('/profile/settings')} /></View>
        <View style={styles.profile}>
          <LinearGradient colors={gradients.pink} style={styles.avatar}><Text style={styles.avatarText}>N</Text></LinearGradient>
          <View style={styles.nameRow}><Text style={styles.name}>Nandan</Text><LinearGradient colors={gradients.primary} style={styles.level}><Text style={styles.levelText}>LV {level}</Text></LinearGradient></View>
          <View style={styles.xpWrap}>
            <View style={styles.xpLabels}><Text style={styles.xpText}>{currentLevelXp} XP</Text><Text style={styles.xpText}>{xpRemaining.toLocaleString('en-US')} to LV {level + 1}</Text></View>
            <ProgressBar value={levelProgress} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}><StatCard label="Games played" value={formatCompact(state.stats.gamesPlayed)} /><StatCard color={colors.success} label="Wins" value={formatCompact(state.stats.wins)} /></View>
          <View style={styles.statsRow}><StatCard label="Best streak" value={state.stats.bestStreak} /><StatCard label="Favourite" value={favourite} /></View>
        </View>

        <View style={styles.menu}>
          <MenuRow icon="trophy-outline" iconBackground="#FFF0D6" iconColor="#E9A81F" onPress={() => router.push('/rewards/achievements')} title="Achievements" />
          <MenuRow icon="bar-chart-outline" iconBackground="#E4F2FF" iconColor={colors.blueDark} onPress={() => router.push('/profile/statistics')} title="Statistics" />
          <MenuRow icon="color-palette-outline" iconBackground="#EDE7FF" iconColor={colors.primaryDark} onPress={() => router.push('/profile/settings')} title="Appearance" />
          <MenuRow icon="volume-high-outline" iconBackground="#DFF7EF" iconColor={colors.mintDark} onPress={() => router.push('/profile/settings')} title="Sound & Haptics" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  profile: { alignItems: 'center', paddingTop: 5 },
  avatar: { alignItems: 'center', borderRadius: 34, height: 100, justifyContent: 'center', width: 100, ...clayShadow('rgba(180,50,110,.32)', 9) },
  avatarText: { color: colors.surface, fontFamily: typography.display, fontSize: 44 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 16 },
  name: { color: colors.text, fontFamily: typography.display, fontSize: 26, lineHeight: 31 },
  level: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  levelText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 12 },
  xpWrap: { marginTop: 14, width: '100%' },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  xpText: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 11.5 },
  statsGrid: { gap: 12, marginTop: 22 },
  statsRow: { flexDirection: 'row', gap: 12 },
  menu: { gap: 6, marginTop: 16 },
});
