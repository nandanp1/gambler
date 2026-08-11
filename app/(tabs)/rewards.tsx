import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ClayCard } from '@/components/ClayCard';
import { CoinIcon } from '@/components/CoinIcon';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ACHIEVEMENTS } from '@/store/achievements';
import { localWeekKey, useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { isYesterday, localDateKey } from '@/utils/format';

const REWARDS = [250, 300, 400, 500, 650, 800, 1_500];

const formatWait = (milliseconds: number) => {
  if (milliseconds <= 0) return 'Ready to open';
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.ceil((milliseconds % 3_600_000) / 60_000);
  return hours ? `Unlocks in ${hours}h ${minutes}m` : `Unlocks in ${minutes}m`;
};

export default function RewardsScreen() {
  const { state, claimDaily, claimMystery, claimWeekly } = useAppStore();
  const [now, setNow] = useState(Date.now());
  const claimedToday = state.rewards.lastDailyClaimDate === localDateKey();
  const activeStreak = claimedToday || isYesterday(state.rewards.lastDailyClaimDate) ? state.rewards.streak : 0;
  const displayDay = Math.max(1, claimedToday ? state.rewards.streak : (activeStreak % 7) + 1);
  const mysteryWait = state.rewards.mysteryAvailableAt - now;
  const achievementCount = state.rewards.unlockedAchievements.length;
  const currentWeek = state.rewards.weeklyKey === localWeekKey();
  const weeklyWins = currentWeek ? state.rewards.weeklyWins : 0;
  const weeklyClaimed = currentWeek && state.rewards.weeklyClaimed;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dayStatus = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    if (claimedToday && day <= state.rewards.streak) return 'done';
    if (!claimedToday && day < displayDay) return 'done';
    if (day === displayDay) return 'current';
    return 'future';
  }), [claimedToday, displayDay, state.rewards.streak]);

  return (
    <Screen bottomInset={128} scroll>
      <View style={styles.content}>
        <PageHeader title="Rewards" />
        <ClayCard style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View><Text style={styles.sectionTitle}>Daily streak</Text><Text style={styles.helper}>Day {displayDay} of 7 · keep it going</Text></View>
            <View style={styles.daysPill}><Text style={styles.daysPillText}>{state.rewards.streak} days</Text></View>
          </View>
          <View style={styles.dayGrid}>
            {dayStatus.map((status, index) => (
              <View key={index} style={[styles.day, status === 'done' && styles.dayDone, status === 'current' && styles.dayCurrent]}>
                {status === 'done' ? <Ionicons color={colors.text} name="checkmark" size={17} /> : status === 'current' ? <CoinIcon size={17} /> : <View style={styles.futureDot} />}
                <Text style={[styles.dayText, status !== 'future' && styles.dayTextActive, status === 'done' && styles.dayTextDone]}>{index + 1}</Text>
              </View>
            ))}
          </View>
        </ClayCard>

        <View style={styles.rewardTiles}>
          <Pressable accessibilityLabel="Claim daily bonus" accessibilityRole="button" accessibilityState={{ disabled: claimedToday }} disabled={claimedToday} onPress={() => claimDaily()} style={({ pressed }) => [styles.rewardPressable, pressed && styles.pressed]}>
            <LinearGradient colors={gradients.yellow} style={[styles.rewardTile, claimedToday && styles.claimed]}>
              <View style={styles.gift}><Ionicons color={colors.pinkDark} name="gift" size={32} /></View>
              <View><Text style={styles.rewardTitle}>Daily Bonus</Text><Text style={styles.rewardSubtitle}>{claimedToday ? 'Come back tomorrow' : `Ready · +${REWARDS[displayDay - 1]!.toLocaleString('en-US')}`}</Text></View>
            </LinearGradient>
          </Pressable>
          <Pressable accessibilityLabel="Open mystery box" accessibilityRole="button" accessibilityState={{ disabled: mysteryWait > 0 }} disabled={mysteryWait > 0} onPress={() => { claimMystery(); setNow(Date.now()); }} style={({ pressed }) => [styles.rewardPressable, pressed && styles.pressed]}>
            <LinearGradient colors={gradients.lavender} style={[styles.rewardTile, mysteryWait > 0 && styles.locked]}>
              <View style={styles.mystery}><Text style={styles.question}>?</Text></View>
              <View><Text style={[styles.rewardTitle, styles.white]}>Mystery Box</Text><Text style={[styles.rewardSubtitle, styles.whiteSoft]}>{formatWait(mysteryWait)}</Text></View>
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable accessibilityLabel="Claim weekly challenge" accessibilityRole="button" accessibilityState={{ disabled: weeklyWins < 10 || weeklyClaimed }} disabled={weeklyWins < 10 || weeklyClaimed} onPress={claimWeekly} style={styles.challenge}>
          <View style={[styles.rowIcon, { backgroundColor: '#E4F2FF' }]}><Ionicons color={colors.blueDark} name="star" size={22} /></View>
          <View style={styles.challengeCopy}>
            <Text style={styles.challengeTitle}>Weekly Challenge</Text>
            <Text style={styles.helper}>Win 10 rounds · {Math.min(10, weeklyWins)} of 10</Text>
            <View style={styles.progress}><ProgressBar color={gradients.blue} height={8} value={weeklyWins / 10} /></View>
          </View>
          <Text style={styles.rewardAmount}>{weeklyClaimed ? 'Claimed' : '+2,000'}</Text>
        </Pressable>

        <Pressable accessibilityLabel="View achievements" accessibilityRole="button" onPress={() => router.push('/rewards/achievements')} style={({ pressed }) => [styles.challenge, pressed && styles.pressed]}>
          <View style={[styles.rowIcon, { backgroundColor: '#FFE6F0' }]}><Ionicons color={colors.pinkDark} name="trophy" size={22} /></View>
          <View style={styles.challengeCopy}><Text style={styles.challengeTitle}>Achievements</Text><Text style={styles.helper}>{achievementCount} of {ACHIEVEMENTS.length} unlocked</Text></View>
          <Ionicons color={colors.disabled} name="chevron-forward" size={20} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15, paddingHorizontal: 20, paddingTop: 2 },
  streakCard: { marginTop: 2 },
  streakHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 17 },
  helper: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12.5, marginTop: 2 },
  daysPill: { backgroundColor: '#FFF0D6', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  daysPillText: { color: '#B8791A', fontFamily: typography.uiBlack, fontSize: 12 },
  dayGrid: { flexDirection: 'row', gap: 5 },
  day: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: 14, flex: 1, gap: 2, height: 54, justifyContent: 'center' },
  dayDone: { backgroundColor: colors.mintDark },
  dayCurrent: { backgroundColor: colors.primaryDark, ...clayShadow('rgba(120,90,240,.35)', 4) },
  futureDot: { backgroundColor: '#D4CDEC', borderRadius: 7, height: 14, width: 14 },
  dayText: { color: '#B4AFCB', fontFamily: typography.uiBlack, fontSize: 9.5 },
  dayTextActive: { color: colors.surface },
  dayTextDone: { color: colors.text },
  rewardTiles: { flexDirection: 'row', gap: 14 },
  rewardPressable: { flex: 1 },
  rewardTile: { borderRadius: radius.card, height: 172, justifyContent: 'space-between', overflow: 'hidden', padding: 18, ...clayShadow('rgba(84,64,170,.24)', 7) },
  gift: { alignItems: 'center', backgroundColor: '#F4F0FF', borderRadius: 12, height: 52, justifyContent: 'center', width: 58 },
  mystery: { alignItems: 'center', backgroundColor: '#F4F0FF', borderRadius: 16, height: 52, justifyContent: 'center', width: 52 },
  question: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 26 },
  rewardTitle: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16 },
  rewardSubtitle: { color: 'rgba(23,23,39,.56)', fontFamily: typography.uiBold, fontSize: 12, marginTop: 2 },
  white: { color: colors.surface },
  whiteSoft: { color: 'rgba(255,255,255,.72)' },
  claimed: { opacity: 0.62 },
  locked: { opacity: 0.78 },
  challenge: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.button, flexDirection: 'row', gap: 13, minHeight: 78, paddingHorizontal: 16, paddingVertical: 11, ...clayShadow('rgba(84,64,170,.15)', 4) },
  rowIcon: { alignItems: 'center', borderRadius: 16, height: 46, justifyContent: 'center', width: 46 },
  challengeCopy: { flex: 1 },
  challengeTitle: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 15.5 },
  progress: { marginTop: 7 },
  rewardAmount: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 13 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
