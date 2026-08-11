import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { CoinIcon } from '@/components/CoinIcon';
import { colors, gradients, typography } from '@/theme';

function ArtCard({ rank, red, rotate, left, top }: { rank: string; red?: boolean; rotate: string; left: number; top: number }) {
  return (
    <View style={[styles.card, { left, top, transform: [{ rotate }] }]}>
      <Text style={[styles.cardRank, red && styles.red]}>{rank}</Text>
      <Text style={[styles.cardSuit, red && styles.red]}>{red ? '♥' : '♠'}</Text>
    </View>
  );
}

function PickGameArt() {
  const dotPositions = [
    { left: 14, top: 14 },
    { right: 14, top: 14 },
    { left: 36, top: 36 },
    { bottom: 14, left: 14 },
    { bottom: 14, right: 14 },
  ];
  return (
    <View style={styles.scene}>
      <View style={styles.wheel}>
        <View style={[styles.wheelQuarter, styles.wheelPink]} />
        <View style={[styles.wheelQuarter, styles.wheelYellow]} />
        <View style={styles.wheelHub} />
      </View>
      <ArtCard left={88} rank="A" rotate="-15deg" top={43} />
      <ArtCard left={146} rank="K" red rotate="11deg" top={58} />
      <View style={styles.bigDie}>{dotPositions.map((position, dot) => <View key={dot} style={[styles.dieDot, position]} />)}</View>
      <View style={styles.coinPosition}><CoinIcon size={52} /></View>
    </View>
  );
}

function PlayWayArt() {
  return (
    <View style={styles.scene}>
      <View style={[styles.pokerChip, styles.chipPink]}><View style={styles.chipInset} /></View>
      <View style={[styles.pokerChip, styles.chipMint]}><View style={styles.chipInset} /></View>
      <View style={[styles.pokerChip, styles.chipGold]}><View style={styles.chipInset} /></View>
      <View style={styles.slider}><View style={styles.sliderTrack} /><LinearGradient colors={gradients.primary} style={styles.sliderKnob} /></View>
      <LinearGradient colors={gradients.mint} style={styles.toggle}><View style={styles.toggleKnob} /></LinearGradient>
      <View style={styles.smallDie}><View style={styles.centerDot} /></View>
    </View>
  );
}

function RewardsArt() {
  return (
    <View style={styles.scene}>
      <LinearGradient colors={gradients.primary} style={styles.giftBox} />
      <LinearGradient colors={['#B8A9FF', '#8C71F5']} style={styles.giftLid} />
      <LinearGradient colors={gradients.gold} style={styles.giftRibbon} />
      <View style={styles.bowLeft} /><View style={styles.bowRight} />
      <View style={styles.rewardCoinBig}><CoinIcon size={76} /></View>
      <View style={styles.rewardCoinSmall}><CoinIcon size={48} /></View>
      <LinearGradient colors={gradients.gold} style={styles.trophyCup}><Ionicons color="#B8791A" name="trophy" size={34} /></LinearGradient>
    </View>
  );
}

export function OnboardingArtwork({ page }: { page: number }) {
  const circleColors: readonly [string, string] = page === 0
    ? ['#DCD2FF', '#BEAEF8']
    : page === 1
      ? ['#C8ECFF', '#8FCBFB']
      : ['#FFE0EC', '#FFAECB'];
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={circleColors} start={{ x: 0.3, y: 0.1 }} end={{ x: 0.7, y: 1 }} style={styles.circle}>
        <View style={styles.highlight} />
        {page === 0 ? <PickGameArt /> : page === 1 ? <PlayWayArt /> : <RewardsArt />}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', height: 350, justifyContent: 'center' },
  circle: { borderRadius: 145, height: 290, overflow: 'visible', shadowColor: '#6448B8', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 20, width: 290 },
  highlight: { backgroundColor: 'rgba(255,255,255,.32)', borderRadius: 70, height: 90, left: 35, position: 'absolute', top: 20, transform: [{ rotate: '-25deg' }], width: 145 },
  scene: { flex: 1, position: 'relative' },
  wheel: { backgroundColor: colors.blue, borderRadius: 48, height: 96, left: 6, overflow: 'hidden', position: 'absolute', top: 81, transform: [{ rotate: '-8deg' }], width: 96 },
  wheelQuarter: { height: 48, position: 'absolute', width: 48 },
  wheelPink: { backgroundColor: colors.pink, left: 0, top: 0 },
  wheelYellow: { backgroundColor: colors.yellow, right: 0, top: 0 },
  wheelHub: { backgroundColor: colors.surface, borderRadius: 14, height: 28, left: 34, position: 'absolute', top: 34, width: 28 },
  card: { backgroundColor: '#F5F0FF', borderRadius: 16, height: 114, justifyContent: 'space-between', padding: 11, position: 'absolute', shadowColor: '#5432A0', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.32, shadowRadius: 11, width: 82 },
  cardRank: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 20 },
  cardSuit: { alignSelf: 'flex-end', color: colors.text, fontFamily: typography.uiBlack, fontSize: 26 },
  red: { color: colors.red },
  bigDie: { backgroundColor: '#F2EDFF', borderRadius: 24, height: 86, left: 182, position: 'absolute', top: 158, transform: [{ rotate: '14deg' }], width: 86 },
  dieDot: { backgroundColor: '#3A2E6B', borderRadius: 7, height: 13, position: 'absolute', width: 13 },
  coinPosition: { left: 44, position: 'absolute', top: 210 },
  pokerChip: { alignItems: 'center', borderRadius: 40, height: 80, justifyContent: 'center', position: 'absolute', shadowColor: '#244975', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 8, width: 80 },
  chipPink: { backgroundColor: colors.pink, left: 5, top: 48 }, chipMint: { backgroundColor: colors.mint, left: 37, top: 98 }, chipGold: { backgroundColor: colors.yellow, left: 69, top: 148 },
  chipInset: { backgroundColor: 'rgba(255,255,255,.45)', borderRadius: 17, height: 34, width: 34 },
  slider: { alignItems: 'center', backgroundColor: '#F5F1FF', borderRadius: 28, flexDirection: 'row', height: 56, padding: 8, position: 'absolute', right: -7, top: 80, width: 132 },
  sliderTrack: { backgroundColor: '#E3DCFA', borderRadius: 4, height: 8, width: 82 },
  sliderKnob: { borderRadius: 18, height: 36, marginLeft: -18, width: 36 },
  toggle: { alignItems: 'center', borderRadius: 26, flexDirection: 'row', height: 52, justifyContent: 'flex-end', padding: 6, position: 'absolute', right: 5, top: 166, width: 100 },
  toggleKnob: { backgroundColor: colors.surface, borderRadius: 20, height: 40, width: 40 },
  smallDie: { alignItems: 'center', backgroundColor: '#F3EEFF', borderRadius: 20, bottom: 7, height: 64, justifyContent: 'center', left: 117, position: 'absolute', transform: [{ rotate: '-10deg' }], width: 64 },
  centerDot: { backgroundColor: '#3A2E6B', borderRadius: 6, height: 12, width: 12 },
  giftBox: { borderRadius: 24, height: 112, left: 79, position: 'absolute', top: 84, width: 132 },
  giftLid: { borderRadius: 14, height: 34, left: 71, position: 'absolute', top: 70, width: 148 },
  giftRibbon: { height: 126, left: 135, position: 'absolute', top: 70, width: 20 },
  bowLeft: { backgroundColor: colors.yellowDark, borderBottomLeftRadius: 5, borderRadius: 19, height: 38, left: 107, position: 'absolute', top: 43, transform: [{ rotate: '-14deg' }], width: 38 },
  bowRight: { backgroundColor: colors.yellowDark, borderBottomRightRadius: 5, borderRadius: 19, height: 38, left: 147, position: 'absolute', top: 43, transform: [{ rotate: '14deg' }], width: 38 },
  rewardCoinBig: { left: 3, position: 'absolute', top: 139 },
  rewardCoinSmall: { left: 43, position: 'absolute', top: 209 },
  trophyCup: { alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, borderRadius: 9, height: 64, justifyContent: 'center', position: 'absolute', right: 8, top: 136, width: 72 },
});
