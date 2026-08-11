import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAppStore } from '@/store/AppStore';
import { colors, gradients, radius } from '@/theme';

export function ClayToggle({ value, onValueChange, label }: { value: boolean; onValueChange: (value: boolean) => void; label: string }) {
  const { haptic } = useAppStore();
  const progress = useSharedValue(value ? 1 : 0);
  progress.value = withSpring(value ? 1 : 0, { damping: 17, stiffness: 260 });
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 24 }] }));
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={7}
      onPress={() => { haptic('selection'); onValueChange(!value); }}
      style={styles.track}
    >
      {value ? <LinearGradient colors={gradients.mint} style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, styles.off]} />}
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, height: 30, overflow: 'hidden', padding: 4, width: 56 },
  off: { backgroundColor: '#DCD5F2' },
  knob: { backgroundColor: colors.surface, borderRadius: 11, height: 22, shadowColor: '#5D4AB4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 3, width: 24 },
});
