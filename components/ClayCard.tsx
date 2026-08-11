import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { clayShadow, colors, gradients, radius } from '@/theme';

interface ClayCardProps extends React.PropsWithChildren {
  colors?: readonly [string, string];
  edgeColor?: string;
  radiusValue?: number;
  padded?: boolean;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ClayCard({
  children,
  colors: gradientColors = gradients.surface,
  edgeColor,
  radiusValue = radius.card,
  padded = true,
  inset = false,
  style,
  contentStyle,
}: ClayCardProps) {
  if (inset) {
    return <View style={[styles.inset, { borderRadius: radiusValue }, padded && styles.padded, style, contentStyle]}>{children}</View>;
  }
  return (
    <View style={[styles.outer, { backgroundColor: edgeColor ?? gradientColors[1], borderRadius: radiusValue }, style]}>
      <LinearGradient
        colors={gradientColors}
        style={[styles.content, { borderRadius: radiusValue }, padded && styles.padded, contentStyle]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingBottom: 3,
    ...clayShadow('rgba(84,64,170,0.2)', 6),
  },
  content: {
    borderTopColor: 'rgba(255,255,255,0.62)',
    borderTopWidth: 2,
    overflow: 'hidden',
  },
  padded: {
    padding: 18,
  },
  inset: {
    backgroundColor: colors.inset,
    borderBottomColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 2,
  },
});
