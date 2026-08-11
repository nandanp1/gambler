import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, radius, typography } from '@/theme';

interface MenuRowProps {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBackground: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

export function MenuRow({ title, subtitle, icon, iconColor, iconBackground, onPress, right }: MenuRowProps) {
  const { haptic } = useAppStore();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress ? () => { haptic('light'); onPress(); } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: iconBackground }]}><Ionicons color={iconColor} name={icon} size={20} /></View>
      <View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>
      {right ?? (onPress ? <Ionicons color={colors.disabled} name="chevron-forward" size={19} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.control, flexDirection: 'row', gap: 13, minHeight: 62, paddingHorizontal: 16, paddingVertical: 10, ...clayShadow('rgba(84,64,170,.12)', 3) },
  icon: { alignItems: 'center', borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  copy: { flex: 1 },
  title: { color: colors.text, fontFamily: typography.uiExtra, fontSize: 15.5 },
  subtitle: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
