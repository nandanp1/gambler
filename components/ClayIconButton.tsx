import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ionicons } from '@expo/vector-icons';
import { Ionicons as Icon } from '@expo/vector-icons';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ClayIconButtonProps extends Omit<PressableProps, 'children'> {
  name: IconName;
  size?: number;
  iconSize?: number;
  color?: string;
}

export function ClayIconButton({ name, size = 44, iconSize = 21, color = colors.inkPurple, onPressIn, ...props }: ClayIconButtonProps) {
  const { haptic } = useAppStore();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      onPressIn={(event) => {
        haptic('light');
        onPressIn?.(event);
      }}
      style={({ pressed }) => [
        styles.outer,
        { width: size, height: size, borderRadius: Math.min(radius.md, size / 2) },
        pressed && styles.pressed,
      ]}
      {...props}
    >
      <LinearGradient colors={gradients.surface} style={[styles.inner, { borderRadius: Math.min(radius.md, size / 2) }]}>
        <Icon name={name} color={color} size={iconSize} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    ...clayShadow('rgba(93,74,180,0.25)', 5),
  },
  inner: {
    alignItems: 'center',
    borderTopColor: '#FFFFFF',
    borderTopWidth: 2,
    flex: 1,
    justifyContent: 'center',
  },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.96 }], opacity: 0.86 },
});
