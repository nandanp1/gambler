import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import { GAME_BY_SLUG } from '@/data/games';
import { clayShadow, colors, radius, typography } from '@/theme';
import type { GameSlug } from '@/types';

export function QuickGameFrame({
  slug,
  board,
  children,
  result,
  boardStyle,
}: React.PropsWithChildren<{
  slug: GameSlug;
  board: React.ReactNode;
  result?: string | null;
  boardStyle?: StyleProp<ViewStyle>;
}>) {
  const game = GAME_BY_SLUG[slug];
  return (
    <Screen bottomInset={34} scroll>
      <GameHeader title={game.name} />
      <View style={styles.content}>
        <View style={[styles.boardEdge, { backgroundColor: game.edge }]}>
          <LinearGradient colors={game.colors} style={[styles.board, boardStyle]}>
            <View style={styles.bubble} />
            {board}
          </LinearGradient>
        </View>
        <View accessibilityLiveRegion="polite" accessible style={styles.resultWrap}>
          <Text style={[styles.result, !result && styles.resultMuted]}>{result ?? game.description}</Text>
        </View>
        <View style={styles.controls}>{children}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  boardEdge: { borderRadius: radius.panel, paddingBottom: 5, ...clayShadow('rgba(84,64,170,.25)', 9) },
  board: { alignItems: 'center', borderRadius: radius.panel, borderTopColor: 'rgba(255,255,255,.5)', borderTopWidth: 3, height: 340, justifyContent: 'center', overflow: 'hidden', padding: 18, position: 'relative' },
  bubble: { backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 90, height: 180, left: -50, position: 'absolute', top: -60, width: 180 },
  resultWrap: { alignItems: 'center', minHeight: 62, paddingHorizontal: 8, paddingVertical: 17 },
  result: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  resultMuted: { color: colors.textMuted, fontFamily: typography.uiBold },
  controls: { backgroundColor: colors.surface, borderRadius: radius.card, gap: 16, padding: 18, ...clayShadow('rgba(84,64,170,.18)', 6) },
});
