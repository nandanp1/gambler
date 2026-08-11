import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, typography } from '@/theme';

export function CoinIcon({ size = 30 }: { size?: number }) {
  return (
    <View style={[styles.edge, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient colors={gradients.gold} style={[styles.coin, { borderRadius: size / 2 }]}>
        <Text style={[styles.letter, { fontSize: size * 0.48 }]}>C</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    backgroundColor: '#D99A16',
    paddingBottom: 2,
    shadowColor: '#9A6200',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  coin: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.72)',
    borderTopWidth: 2,
    flex: 1,
    justifyContent: 'center',
  },
  letter: {
    color: '#B8791A',
    fontFamily: typography.display,
    lineHeight: 20,
  },
});
