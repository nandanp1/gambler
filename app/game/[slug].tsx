import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import BlackjackGameScreen from '@/components/game/BlackjackGameScreen';
import BaccaratGameScreen from '@/components/game/BaccaratGameScreen';
import { ClimbGameScreen } from '@/components/game/ClimbGameScreen';
import { CrashGameScreen } from '@/components/game/CrashGameScreen';
import HiLoGameScreen from '@/components/game/HiLoGameScreen';
import { InstantGameScreen, type InstantGameSlug } from '@/components/game/InstantGameScreen';
import { KenoGameScreen } from '@/components/game/KenoGameScreen';
import MinesGameScreen from '@/components/game/MinesGameScreen';
import PlinkoGameScreen from '@/components/game/PlinkoGameScreen';
import RouletteGameScreen from '@/components/game/RouletteGameScreen';
import { ScratchGameScreen } from '@/components/game/ScratchGameScreen';
import SlotsGameScreen from '@/components/game/SlotsGameScreen';
import TableQuickGameScreen from '@/components/game/TableQuickGameScreen';
import VideoPokerGameScreen from '@/components/game/VideoPokerGameScreen';
import { WheelGameScreen } from '@/components/game/WheelGameScreen';
import { ClayButton } from '@/components/ClayButton';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import { GAMES } from '@/data/games';
import { colors, typography } from '@/theme';
import type { GameSlug } from '@/types';

const INSTANT = new Set<GameSlug>(['dice', 'limbo', 'coin-flip', 'diamonds', 'roshambo', 'lucky-cups']);

function UnknownGame() {
  return (
    <Screen padded>
      <GameHeader title="Game not found" />
      <View style={styles.unknown}>
        <Ionicons color={colors.primaryDark} name="game-controller-outline" size={66} />
        <Text style={styles.title}>This cabinet is being polished.</Text>
        <Text style={styles.body}>Choose another game from the arcade while the clay dries.</Text>
      </View>
    </Screen>
  );
}

export default function GameRoute() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const raw = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = raw as GameSlug | undefined;
  if (!slug || !GAMES.some((game) => game.slug === slug)) return <UnknownGame />;

  if (slug === 'blackjack') return <BlackjackGameScreen />;
  if (slug === 'roulette') return <RouletteGameScreen />;
  if (slug === 'slots') return <SlotsGameScreen />;
  if (slug === 'plinko') return <PlinkoGameScreen />;
  if (slug === 'mines') return <MinesGameScreen />;
  if (INSTANT.has(slug)) return <InstantGameScreen slug={slug as InstantGameSlug} />;
  if (slug === 'crash') return <CrashGameScreen />;
  if (slug === 'wheel') return <WheelGameScreen />;
  if (slug === 'keno') return <KenoGameScreen />;
  if (slug === 'towers' || slug === 'dragon-tower') return <ClimbGameScreen slug={slug} />;
  if (slug === 'scratch') return <ScratchGameScreen />;
  if (slug === 'baccarat') return <BaccaratGameScreen />;
  if (slug === 'video-poker') return <VideoPokerGameScreen />;
  if (slug === 'hilo') return <HiLoGameScreen />;
  if (slug === 'poker' || slug === 'red-dog') return <TableQuickGameScreen slug={slug} />;
  return <UnknownGame />;
}

const styles = StyleSheet.create({
  unknown: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 28, marginTop: 18, textAlign: 'center' },
  body: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
});

