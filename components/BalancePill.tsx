import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { CoinIcon } from '@/components/CoinIcon';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

export function BalancePill({ compact = false }: { compact?: boolean }) {
  const { state } = useAppStore();
  const previous = useRef(state.balance);
  const pulse = useSharedValue(1);
  const positive = state.balance > previous.current;

  useEffect(() => {
    if (state.balance !== previous.current) {
      pulse.value = withSequence(withTiming(1.1, { duration: 120 }), withSpring(1, { damping: 12 }));
      previous.current = state.balance;
    }
  }, [pulse, state.balance]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View accessibilityLabel={`Balance, ${formatCoins(state.balance)} coins`} accessibilityLiveRegion="polite" accessible style={[styles.outer, compact && styles.compactOuter, animatedStyle]}>
      <LinearGradient colors={gradients.surface} style={[styles.inner, compact && styles.compactInner]}>
        <CoinIcon size={compact ? 27 : 30} />
        <Text style={[styles.balance, positive && styles.positive, compact && styles.compactText]} numberOfLines={1}>
          {formatCoins(state.balance)}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.pill,
    ...clayShadow('rgba(93,74,180,0.26)', 5),
  },
  inner: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderTopColor: colors.surface,
    borderTopWidth: 2,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    paddingLeft: 7,
    paddingRight: 15,
  },
  compactOuter: { maxWidth: 132 },
  compactInner: { height: 42, paddingRight: 12 },
  balance: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16 },
  compactText: { fontSize: 14 },
  positive: { color: colors.success },
});
