import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

interface BetControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function BetControl({ value, onChange, min = 10, max = 5_000, step = 10, label = 'Bet', disabled = false }: BetControlProps) {
  const { haptic } = useAppStore();
  const update = (next: number) => {
    haptic('selection');
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.control}>
        <Pressable accessibilityLabel={`Decrease ${label}`} accessibilityRole="button" disabled={disabled} hitSlop={2} onPress={() => update(value - step)} style={({ pressed }) => [styles.square, pressed && styles.pressed]}>
          <Text style={styles.symbol}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`${label}, ${formatCoins(value)} coins`} style={styles.value}>{formatCoins(value)}</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} accessibilityRole="button" disabled={disabled} hitSlop={2} onPress={() => update(value + step)} style={({ pressed }) => [styles.square, pressed && styles.pressed]}>
          <Text style={styles.symbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
  control: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  square: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  symbol: { color: colors.inkPurple, fontFamily: typography.uiBlack, fontSize: 21, lineHeight: 24 },
  value: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 21, minWidth: 78, textAlign: 'center' },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.95 }], opacity: 0.72 },
  disabled: { opacity: 0.46 },
});
