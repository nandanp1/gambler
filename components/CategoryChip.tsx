import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';

export function CategoryChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { haptic } = useAppStore();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { haptic('selection'); onPress(); }}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
    >
      {selected ? (
        <LinearGradient colors={gradients.primary} style={styles.inner}>
          <Text style={[styles.text, styles.selectedText]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={[styles.inner, styles.text]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: colors.surface, borderRadius: radius.pill, ...clayShadow('rgba(93,74,180,0.18)', 3) },
  inner: { borderRadius: radius.pill, minHeight: 44, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 11 },
  text: { color: '#6C6890', fontFamily: typography.uiExtra, fontSize: 14, textAlign: 'center' },
  selectedText: { color: colors.surface },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
