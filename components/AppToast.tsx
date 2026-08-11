import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, radius, typography } from '@/theme';

export function AppToast() {
  const { toast } = useAppStore();
  if (!toast) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      accessible
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      pointerEvents="none"
      style={styles.toast}
    >
      <Text style={styles.text}>{toast}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    backgroundColor: colors.inkPurple,
    borderRadius: radius.pill,
    bottom: 110,
    maxWidth: '88%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'absolute',
    ...clayShadow('rgba(23,23,39,0.28)', 7),
  },
  text: { color: colors.surface, fontFamily: typography.uiExtra, fontSize: 14, textAlign: 'center' },
});
