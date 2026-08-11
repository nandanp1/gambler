import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GameArtwork } from '@/components/GameArtwork';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, radius, typography } from '@/theme';
import type { GameDefinition } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GameTile({ game, compact = false }: { game: GameDefinition; compact?: boolean }) {
  const { haptic } = useAppStore();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.035 }, { translateY: pressed.value * 3 }],
  }));
  const animate = (value: number) => { pressed.value = withSpring(value, { damping: 15, stiffness: 330 }); };

  return (
    <AnimatedPressable
      accessibilityHint={game.description}
      accessibilityLabel={`Play ${game.name}`}
      accessibilityRole="button"
      onPress={() => {
        haptic('selection');
        router.push({ pathname: '/game/[slug]', params: { slug: game.slug } } as Href);
      }}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      style={[styles.wrapper, animatedStyle]}
    >
      <View style={[styles.edge, { backgroundColor: game.edge, borderRadius: compact ? radius.button : 26 }]}>
        <LinearGradient colors={game.colors} style={[styles.art, compact ? styles.compactArt : styles.regularArt, { borderRadius: compact ? radius.button : 26 }]}>
          <View style={styles.bubble} />
          <GameArtwork art={game.art} />
        </LinearGradient>
      </View>
      <Text numberOfLines={1} style={[styles.name, compact && styles.compactName]}>{game.name}</Text>
      <Text style={styles.category}>{game.category === 'Originals' ? 'Original' : game.category}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 0 },
  edge: { paddingBottom: 4, ...clayShadow('rgba(84,64,170,0.22)', 6) },
  art: { borderTopColor: 'rgba(255,255,255,.42)', borderTopWidth: 3, overflow: 'hidden', position: 'relative' },
  regularArt: { height: 150 },
  compactArt: { height: 128 },
  bubble: { backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 70, height: 130, left: -35, position: 'absolute', top: -42, width: 130 },
  name: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16, lineHeight: 19, marginLeft: 3, marginTop: 11 },
  compactName: { fontSize: 15, marginTop: 10 },
  category: { color: colors.textFaint, fontFamily: typography.uiBold, fontSize: 10.5, letterSpacing: 0.75, marginLeft: 3, marginTop: 2, textTransform: 'uppercase' },
});
