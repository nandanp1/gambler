import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';

export function OptionPill({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { haptic } = useAppStore();
  const content = <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => { haptic('selection'); onPress(); }}
      style={({ pressed }) => [styles.outer, style, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {selected ? <LinearGradient colors={gradients.primary} style={styles.inner}>{content}</LinearGradient> : <Text style={[styles.inner, styles.text]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: colors.surface, borderRadius: radius.control, flex: 1, minHeight: 46, ...clayShadow('rgba(84,64,170,.14)', 3) },
  inner: { borderRadius: radius.control, minHeight: 46, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 13, textAlign: 'center' },
  text: { color: colors.inkPurple, fontFamily: typography.uiExtra, fontSize: 13.5, textAlign: 'center' },
  selectedText: { color: colors.surface },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});

