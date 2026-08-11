import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';

const CHIP_COLORS: Record<number, readonly [string, string]> = {
  10: ['#B7EEDF', '#5CD2AF'],
  25: ['#A8D9FF', '#5CA9F5'],
  50: ['#FFD8E6', '#FF8FBB'],
  100: ['#C3B4FF', '#8264F2'],
  500: ['#FFE6A8', '#FFC53D'],
};

export function Chip({ value, selected, onPress, disabled = false }: { value: number; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  const { haptic } = useAppStore();
  const chipColors = CHIP_COLORS[value] ?? ['#C3B4FF', '#8264F2'];
  const light = value === 10 || value === 25 || value === 50 || value === 500;
  return (
    <Pressable
      accessibilityLabel={`${value} coin chip`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => { haptic('selection'); onPress(); }}
      style={({ pressed }) => [styles.outer, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <LinearGradient colors={chipColors} style={styles.inner}>
        <Text style={[styles.text, light ? styles.darkText : styles.lightText]}>{value}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { borderColor: 'transparent', borderRadius: radius.pill, borderWidth: 3, flex: 1, maxWidth: 58, padding: 3 },
  selected: { borderColor: colors.primaryDark },
  inner: { alignItems: 'center', borderRadius: radius.pill, borderTopColor: 'rgba(255,255,255,0.62)', borderTopWidth: 2, height: 46, justifyContent: 'center' },
  text: { fontFamily: typography.uiBlack, fontSize: 13 },
  darkText: { color: colors.inkPurple },
  lightText: { color: colors.surface },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.95 }] },
  disabled: { opacity: 0.42 },
});

