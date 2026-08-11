import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { OptionPill } from '@/components/game/OptionPill';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { QuickPlayingCard } from '@/components/game/QuickPlayingCard';
import {
  dealVideoPoker,
  drawVideoPoker,
  type VideoPokerDeal,
  type VideoPokerHand,
  type VideoPokerResult,
} from '@/games/quick/videoPoker';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const CARD_INDICES = [0, 1, 2, 3, 4] as const;

const handLabel = (rank: VideoPokerHand) => rank
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

function EmptyCards() {
  return (
    <View style={styles.cardRow}>
      {CARD_INDICES.map((index) => (
        <View key={index} style={styles.emptySlot}>
          <Text style={styles.emptySuit}>{index % 2 ? '♥' : '♠'}</Text>
        </View>
      ))}
    </View>
  );
}

export function VideoPokerGameScreen() {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [deal, setDeal] = useState<VideoPokerDeal | null>(null);
  const [result, setResult] = useState<VideoPokerResult | null>(null);
  const [held, setHeld] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const settledRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motion = useSharedValue(1);

  useEffect(() => () => {
    activeRoundRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const cardsStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + motion.value * 0.58,
    transform: [
      { perspective: 650 },
      { rotateY: `${(1 - motion.value) * 95}deg` },
      { translateY: (1 - motion.value) * -10 },
    ],
  }));

  const animate = (duration: number, roundId: string, onDone: () => void) => {
    motion.value = 0;
    motion.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    const handle = setTimeout(() => {
      if (activeRoundRef.current !== roundId) return;
      onDone();
      if (timeoutRef.current === handle) timeoutRef.current = null;
    }, duration + 24);
    timeoutRef.current = handle;
  };

  const startDeal = () => {
    if (busyRef.current || (deal && !result)) return;
    busyRef.current = true;
    const roundId = debit(bet, 'video-poker');
    if (!roundId) {
      busyRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;

    const next = dealVideoPoker(bet);
    const duration = state.settings.reducedMotion ? 150 : 610;
    settledRef.current = false;
    setBusy(true);
    setDeal(next);
    setResult(null);
    setHeld([]);
    animate(duration, roundId, () => {
      busyRef.current = false;
      setBusy(false);
    });
  };

  const draw = () => {
    const roundId = activeRoundRef.current;
    if (busyRef.current || !deal || result || !roundId) return;

    const next = drawVideoPoker(deal, held);
    const duration = state.settings.reducedMotion ? 160 : 680;
    busyRef.current = true;
    setBusy(true);
    setResult(next);
    animate(duration, roundId, () => {
      if (!settledRef.current) {
        settledRef.current = true;
        completeGame({
          roundId,
          game: 'video-poker',
          bet: next.bet,
          payout: next.payout,
          detail: handLabel(next.rank),
        });
      }
      activeRoundRef.current = null;
      busyRef.current = false;
      setBusy(false);
    });
  };

  const toggleHeld = (index: number) => {
    if (busyRef.current || result) return;
    setHeld((current) => current.includes(index)
      ? current.filter((heldIndex) => heldIndex !== index)
      : [...current, index].sort((a, b) => a - b));
  };

  const activeHand = result?.hand ?? deal?.hand;
  const activeRound = Boolean(deal && !result);
  const drawCount = 5 - held.length;
  const resultText = busy
    ? result ? 'Drawing replacement cards…' : 'Dealing five cards…'
    : result
      ? result.payout > 0
        ? `${handLabel(result.rank)} · ${formatCoins(result.payout)} returned`
        : `${handLabel(result.rank)} · no payout`
      : deal
        ? 'Tap cards to hold, then draw once'
        : null;

  const board = (
    <View style={styles.boardContent}>
      <View style={styles.machineHeader}>
        <View>
          <Text style={styles.machineEyebrow}>DRAW POKER</Text>
          <Text style={styles.machineTitle}>Jacks or Better</Text>
        </View>
        <View style={styles.creditLamp}><Text style={styles.creditLampText}>5 CARD</Text></View>
      </View>

      {activeHand ? (
        <Animated.View style={[styles.cardRow, cardsStyle]}>
          {activeHand.map((card, index) => {
            const isHeld = !result && held.includes(index);
            return (
              <Pressable
                accessibilityLabel={`${card.rank} of ${card.suit}${isHeld ? ', held' : ''}`}
                accessibilityHint={!result ? (isHeld ? 'Remove this card from your held cards' : 'Hold this card for the draw') : undefined}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || Boolean(result), selected: isHeld }}
                disabled={busy || Boolean(result)}
                key={card.id}
                onPress={() => toggleHeld(index)}
                style={[styles.cardSlot, isHeld && styles.heldSlot]}
              >
                <View style={styles.scaledCard}><QuickPlayingCard card={card} small /></View>
                <View style={[styles.holdTag, isHeld && styles.holdTagActive]}>
                  <Text style={[styles.holdText, isHeld && styles.holdTextActive]}>
                    {result ? (result.heldIndices.includes(index) ? 'HELD' : 'DRAWN') : isHeld ? 'HELD' : 'TAP'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : <EmptyCards />}

      <View style={styles.readout}>
        <Text style={styles.readoutLabel}>{result ? 'Final hand' : deal ? `${held.length} held` : 'Ready'}</Text>
        <Text accessibilityLiveRegion={result && !busy ? 'polite' : 'none'} numberOfLines={1} style={styles.readoutValue}>
          {result ? handLabel(result.rank) : deal ? `${drawCount} card${drawCount === 1 ? '' : 's'} to draw` : 'Place your bet'}
        </Text>
        {result && <Text style={styles.multiplier}>{result.multiplier}× pay</Text>}
      </View>
    </View>
  );

  return (
    <QuickGameFrame board={board} result={resultText} slug="video-poker">
      <BetControl disabled={busy || activeRound} onChange={setBet} step={10} value={bet} />
      {activeRound && (
        <View style={styles.options}>
          <OptionPill
            disabled={busy}
            label="Hold all"
            onPress={() => setHeld([...CARD_INDICES])}
            selected={held.length === 5}
          />
          <OptionPill
            disabled={busy}
            label="Clear holds"
            onPress={() => setHeld([])}
            selected={held.length === 0}
          />
        </View>
      )}
      <ClayButton
        disabled={busy}
        label={busy
          ? result ? 'Drawing…' : 'Dealing…'
          : activeRound ? `Draw ${drawCount}` : result ? 'Deal Again' : 'Deal Cards'}
        loading={busy}
        onPress={activeRound ? draw : startDeal}
      />
    </QuickGameFrame>
  );
}

export default VideoPokerGameScreen;

const styles = StyleSheet.create({
  boardContent: { alignItems: 'center', gap: 12, width: '100%' },
  machineHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  machineEyebrow: { color: 'rgba(255,255,255,.7)', fontFamily: typography.uiBlack, fontSize: 9, letterSpacing: 1.7 },
  machineTitle: { color: colors.surface, fontFamily: typography.display, fontSize: 22, lineHeight: 26 },
  creditLamp: { backgroundColor: 'rgba(30,92,76,.22)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  creditLampText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 9.5, letterSpacing: 1 },
  cardRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 115, width: '100%' },
  cardSlot: { alignItems: 'center', height: 110, justifyContent: 'flex-start', paddingTop: 7, width: 51 },
  heldSlot: { transform: [{ translateY: -8 }] },
  scaledCard: { alignItems: 'center', height: 72, justifyContent: 'center', width: 50, transform: [{ scale: 0.81 }] },
  holdTag: { backgroundColor: 'rgba(35,76,65,.18)', borderRadius: radius.pill, marginTop: 8, paddingHorizontal: 8, paddingVertical: 4 },
  holdTagActive: { backgroundColor: colors.yellow },
  holdText: { color: 'rgba(255,255,255,.78)', fontFamily: typography.uiBlack, fontSize: 8, letterSpacing: 0.5 },
  holdTextActive: { color: '#6F5114' },
  emptySlot: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.28)', borderRadius: 13, borderWidth: 1, height: 78, justifyContent: 'center', width: 49 },
  emptySuit: { color: 'rgba(255,255,255,.42)', fontFamily: typography.uiBlack, fontSize: 22 },
  readout: { alignItems: 'center', backgroundColor: 'rgba(30,92,76,.22)', borderColor: 'rgba(255,255,255,.22)', borderRadius: radius.control, borderWidth: 1, minHeight: 72, paddingHorizontal: 14, paddingVertical: 9, width: '100%' },
  readoutLabel: { color: 'rgba(255,255,255,.65)', fontFamily: typography.uiBlack, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  readoutValue: { color: colors.surface, fontFamily: typography.display, fontSize: 20, marginTop: 1 },
  multiplier: { color: colors.yellow, fontFamily: typography.uiBlack, fontSize: 10.5 },
  options: { flexDirection: 'row', gap: 9 },
});
