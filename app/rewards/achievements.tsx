import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ClayCard } from '@/components/ClayCard';
import { GameHeader } from '@/components/GameHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ACHIEVEMENTS } from '@/store/achievements';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, radius, typography } from '@/theme';

export default function AchievementsScreen() {
  const { state } = useAppStore();
  const unlocked = new Set(state.rewards.unlockedAchievements);
  return (
    <Screen bottomInset={32} scroll>
      <GameHeader title="Achievements" />
      <View style={styles.content}>
        <ClayCard colors={gradients.lavender}>
          <Text style={styles.heroLabel}>Your collection</Text>
          <View style={styles.heroRow}><Text style={styles.heroValue}>{unlocked.size} / {ACHIEVEMENTS.length}</Text><Ionicons color={colors.yellow} name="trophy" size={34} /></View>
          <View style={styles.progress}><ProgressBar color={gradients.yellow} value={unlocked.size / ACHIEVEMENTS.length} /></View>
        </ClayCard>
        <View style={styles.list}>
          {ACHIEVEMENTS.map((achievement) => {
            const done = unlocked.has(achievement.id);
            return (
              <View key={achievement.id} style={[styles.item, !done && styles.locked]}>
                <View style={[styles.icon, done ? styles.iconDone : styles.iconLocked]}>
                  <Ionicons color={done ? colors.surface : colors.textFaint} name={achievement.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} />
                </View>
                <View style={styles.copy}><Text style={styles.title}>{achievement.title}</Text><Text style={styles.description}>{achievement.description}</Text></View>
                <Ionicons color={done ? colors.mintDark : colors.disabled} name={done ? 'checkmark-circle' : 'lock-closed'} size={22} />
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  heroLabel: { color: 'rgba(255,255,255,.76)', fontFamily: typography.uiExtra, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
  heroRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroValue: { color: colors.surface, fontFamily: typography.display, fontSize: 36 },
  progress: { marginTop: 9 },
  list: { gap: 9 },
  item: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.button, flexDirection: 'row', gap: 13, minHeight: 72, padding: 13 },
  locked: { opacity: 0.66 },
  icon: { alignItems: 'center', borderRadius: 16, height: 46, justifyContent: 'center', width: 46 },
  iconDone: { backgroundColor: colors.primaryDark },
  iconLocked: { backgroundColor: colors.inset },
  copy: { flex: 1 },
  title: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 15 },
  description: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12, marginTop: 2 },
});
