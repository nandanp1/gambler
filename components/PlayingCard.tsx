import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { clayShadow, colors, gradients, typography } from '@/theme';

export interface PlayingCardValue {
  rank: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

export function PlayingCard({ card, hidden = false, small = false, style }: { card?: PlayingCardValue; hidden?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const red = card?.suit === '♥' || card?.suit === '♦';
  const width = small ? 60 : 74;
  const height = small ? 84 : 104;
  return (
    <View style={[styles.outer, { width, height, borderRadius: small ? 13 : 15 }, style]}>
      <LinearGradient colors={hidden ? gradients.primary : ['#FFFFFF', '#F3EEFF']} style={[styles.card, { borderRadius: small ? 13 : 15 }]}>
        {hidden ? (
          <View style={styles.backMark} />
        ) : (
          <>
            <Text style={[styles.rank, small && styles.smallRank, red && styles.red]}>{card?.rank}</Text>
            <Text style={[styles.suit, small && styles.smallSuit, red && styles.red]}>{card?.suit}</Text>
          </>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { ...clayShadow('rgba(80,50,160,0.35)', 6) },
  card: { borderTopColor: colors.surface, borderTopWidth: 2, flex: 1, justifyContent: 'space-between', padding: 9 },
  rank: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 19, lineHeight: 22 },
  suit: { alignSelf: 'flex-end', color: colors.text, fontFamily: typography.uiBlack, fontSize: 24, lineHeight: 27 },
  smallRank: { fontSize: 16 },
  smallSuit: { fontSize: 20 },
  red: { color: colors.red },
  backMark: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.36)', borderRadius: 18, flex: 1, marginVertical: 7, width: '68%' },
});

