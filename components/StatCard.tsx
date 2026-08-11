import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { clayShadow, colors, radius, typography } from '@/theme';

export function StatCard({ label, value, color = colors.text }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.button, flex: 1, justifyContent: 'center', minHeight: 82, paddingHorizontal: 17, ...clayShadow('rgba(84,64,170,.16)', 4) },
  label: { color: colors.textFaint, fontFamily: typography.uiExtra, fontSize: 10.5, letterSpacing: 0.65, textTransform: 'uppercase' },
  value: { fontFamily: typography.display, fontSize: 25, lineHeight: 31, marginTop: 1 },
});
