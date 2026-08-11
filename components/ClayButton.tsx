import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';

type ClayButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  colors?: readonly [string, string];
  edgeColor?: string;
  textColor?: string;
  height?: number;
  compact?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ClayButton({
  label,
  colors: gradientColors = gradients.primary,
  edgeColor = colors.primaryEdge,
  textColor,
  height = 60,
  compact = false,
  loading = false,
  disabled,
  icon,
  style,
  onPressIn,
  onPressOut,
  ...pressableProps
}: ClayButtonProps) {
  const { state, haptic } = useAppStore();
  const pressed = useSharedValue(0);
  const isDisabled = disabled || loading;
  const resolvedTextColor = textColor ?? (gradientColors === gradients.mint || gradientColors === gradients.yellow || gradientColors === gradients.gold
    ? colors.text
    : colors.surface);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressed.value * 0.04 },
      { translateY: pressed.value * 3 },
    ],
    opacity: isDisabled ? 0.46 : 1,
  }));

  const setPressed = (value: number) => {
    pressed.value = state.settings.reducedMotion
      ? withTiming(value, { duration: 50 })
      : withSpring(value, { damping: 16, stiffness: 330, mass: 0.45 });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={pressableProps.accessibilityLabel ?? label}
      disabled={isDisabled}
      onPressIn={(event) => {
        setPressed(1);
        haptic('light');
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(0);
        onPressOut?.(event);
      }}
      style={[styles.outer, { backgroundColor: edgeColor, borderRadius: compact ? radius.control : radius.button }, style, animatedStyle]}
      {...pressableProps}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.inner,
          {
            minHeight: compact ? Math.min(48, height) : height,
            borderRadius: compact ? radius.control : radius.button,
          },
        ]}
      >
        {loading ? <ActivityIndicator color={resolvedTextColor} /> : icon}
        {!loading && <Text style={[styles.label, { color: resolvedTextColor, fontSize: compact ? 15 : 18 }]}>{label}</Text>}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingBottom: 4,
    ...clayShadow('rgba(120,90,240,0.38)', 8),
  },
  inner: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.46)',
    borderTopWidth: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  label: {
    fontFamily: typography.uiBlack,
    lineHeight: 24,
    textAlign: 'center',
  },
});
