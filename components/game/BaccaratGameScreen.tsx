import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  playBaccarat,
  type BaccaratBet,
  type BaccaratResult,
} from '@/games/quick/baccarat';
import type { Card } from '@/games/quick/shared';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const BETS: readonly BaccaratBet[] = ['player', 'banker', 'tie'];
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function CardBack() {
  return (
    <View style={styles.cardBack}>
      <View style={styles.cardBackInset} />
    </View>
  );
}

function BaccaratHand({
  cards,
  label,
  total,
  winner,
}: {
  cards?: readonly Card[];
  label: string;
  total?: number;
  winner: boolean;
}) {
  return (
    <View style={[styles.handLane, winner && styles.winningLane]}>
      <View style={styles.handCopy}>
        <Text style={styles.handLabel}>{label}</Text>
        <Text style={styles.handSub}>{winner ? 'Winner' : cards ? `${cards.length} cards` : 'Waiting'}</Text>
      </View>
      <View style={styles.cardFan}>
        {cards
          ? cards.map((card, index) => (
              <View key={card.id} style={index > 0 && styles.cardOverlap}>
                <QuickPlayingCard card={card} small />
              </View>
            ))
          : <><CardBack /><View style={styles.cardOverlap}><CardBack /></View></>}
      </View>
      <View style={[styles.totalBubble, winner && styles.winningTotal]}>
        <Text style={[styles.total, winner && styles.winningTotalText]}>{total ?? '—'}</Text>
      </View>
    </View>
  );
}

export function BaccaratGameScreen() {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(100);
  const [betOn, setBetOn] = useState<BaccaratBet>('player');
  const [round, setRound] = useState<BaccaratResult | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const settledRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = useSharedValue(1);

  useEffect(() => () => {
    activeRoundRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const cardsStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + reveal.value * 0.55,
    transform: [
      { perspective: 700 },
      { rotateY: `${(1 - reveal.value) * 82}deg` },
      { translateY: (1 - reveal.value) * 12 },
    ],
  }));

  const play = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const roundId = debit(bet, 'baccarat');
    if (!roundId) {
      busyRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;

    const next = playBaccarat(bet, betOn);
    const duration = state.settings.reducedMotion ? 160 : 720;
    settledRef.current = false;
    setBusy(true);
    setRound(next);
    reveal.value = 0;
    reveal.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });

    const handle = setTimeout(() => {
      if (activeRoundRef.current !== roundId) return;
      if (!settledRef.current) {
        settledRef.current = true;
        completeGame({
          roundId,
          game: 'baccarat',
          bet: next.bet,
          payout: next.payout,
          result: next.outcome,
          detail: `${titleCase(next.betOn)} · ${next.playerTotal}–${next.bankerTotal}`,
        });
      }
      activeRoundRef.current = null;
      busyRef.current = false;
      setBusy(false);
      if (timeoutRef.current === handle) timeoutRef.current = null;
    }, duration + 30);
    timeoutRef.current = handle;
  };

  const resultText = busy
    ? 'The shoe is dealing…'
    : round?.outcome === 'win'
      ? `${titleCase(round.betOn)} bet wins · ${formatCoins(round.payout)} returned`
      : round?.outcome === 'push'
        ? `Tie hand · ${formatCoins(round.payout)} returned`
        : round
          ? `${titleCase(round.winner)} wins this hand`
          : null;

  const board = (
    <View accessibilityLiveRegion={round && !busy ? 'polite' : 'none'} style={styles.boardContent}>
      <View style={styles.tableMark}>
        <Text style={styles.tableMarkText}>PUNTO · BANCO</Text>
        <View style={styles.shoeDot} />
      </View>
      <Animated.View style={[styles.hands, cardsStyle]}>
        <BaccaratHand
          cards={round?.banker}
          label="Banker"
          total={round?.bankerTotal}
          winner={!busy && round?.winner === 'banker'}
        />
        <BaccaratHand
          cards={round?.player}
          label="Player"
          total={round?.playerTotal}
          winner={!busy && round?.winner === 'player'}
        />
      </Animated.View>
      <View accessibilityLiveRegion="polite" style={[styles.rulePill, !busy && round?.winner === 'tie' && styles.tiePill]}>
        <Text style={styles.ruleText}>
          {!busy && round?.winner === 'tie'
            ? `Tie · ${round.playerTotal} each`
            : round?.natural
              ? 'Natural hand'
              : 'Closest to 9 wins'}
        </Text>
      </View>
    </View>
  );

  return (
    <QuickGameFrame board={board} result={resultText} slug="baccarat">
      <BetControl disabled={busy} min={20} onChange={setBet} step={20} value={bet} />
      <View style={styles.options}>
        {BETS.map((choice) => (
          <OptionPill
            disabled={busy}
            key={choice}
            label={choice === 'tie' ? 'Tie · 8:1' : titleCase(choice)}
            onPress={() => setBetOn(choice)}
            selected={betOn === choice}
          />
        ))}
      </View>
      <ClayButton
        disabled={busy}
        label={busy ? 'Dealing…' : 'Deal Baccarat'}
        loading={busy}
        onPress={play}
      />
    </QuickGameFrame>
  );
}

export default BaccaratGameScreen;

const styles = StyleSheet.create({
  boardContent: { alignItems: 'center', gap: 10, width: '100%' },
  tableMark: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  tableMarkText: { color: 'rgba(255,255,255,.82)', fontFamily: typography.uiBlack, fontSize: 10, letterSpacing: 1.8 },
  shoeDot: { backgroundColor: colors.yellow, borderRadius: 5, height: 7, width: 7 },
  hands: { gap: 9, width: '100%' },
  handLane: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.17)', borderColor: 'rgba(255,255,255,.16)', borderRadius: radius.control, borderWidth: 1, flexDirection: 'row', minHeight: 104, paddingHorizontal: 10, paddingVertical: 9 },
  winningLane: { backgroundColor: 'rgba(255,255,255,.32)', borderColor: 'rgba(255,255,255,.62)' },
  handCopy: { width: 58 },
  handLabel: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 13 },
  handSub: { color: 'rgba(255,255,255,.68)', fontFamily: typography.uiBold, fontSize: 9.5, marginTop: 2 },
  cardFan: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 84 },
  cardOverlap: { marginLeft: -25 },
  cardBack: { backgroundColor: '#F6F1FF', borderColor: 'rgba(255,255,255,.85)', borderRadius: 13, borderWidth: 2, height: 84, padding: 7, width: 60 },
  cardBackInset: { backgroundColor: 'rgba(126,94,230,.32)', borderRadius: 9, flex: 1 },
  totalBubble: { alignItems: 'center', backgroundColor: 'rgba(45,35,90,.20)', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  winningTotal: { backgroundColor: colors.surface },
  total: { color: colors.surface, fontFamily: typography.display, fontSize: 22 },
  winningTotalText: { color: colors.primaryDark },
  rulePill: { backgroundColor: 'rgba(45,35,90,.16)', borderRadius: radius.pill, paddingHorizontal: 15, paddingVertical: 7 },
  tiePill: { backgroundColor: colors.yellowDark },
  ruleText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 11.5 },
  options: { flexDirection: 'row', gap: 8 },
});
