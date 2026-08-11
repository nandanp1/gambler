import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, radius } from '@/theme';

export function ProgressBar({ value, color = gradients.primary, height = 14 }: { value: number; color?: readonly [string, string]; height?: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <LinearGradient colors={color} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${clamped * 100}%`, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.insetDeep, overflow: 'hidden', padding: 2 },
  fill: { flex: 1, minWidth: 4 },
});
