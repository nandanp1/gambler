import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { OptionPill } from '@/components/game/OptionPill';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { crashMultiplierAt, settleCrashRound, startCrashRound, type CrashRound, type CrashSettlement } from '@/games/quick/crash';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const GROWTH_RATE = 0.0005;

export function CrashGameScreen() {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoTarget, setAutoTarget] = useState(2);
  const [round, setRound] = useState<CrashRound | null>(null);
  const [settlement, setSettlement] = useState<CrashSettlement | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledRef = useRef(false);
  const startingRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);
  const startTimeRef = useRef(0);
  const flight = useSharedValue(0);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => {
    activeRoundRef.current = null;
    clearTimer();
    cancelAnimation(flight);
  }, [flight]);

  const finish = (value: CrashSettlement, displayed: number, roundId: string) => {
    if (activeRoundRef.current !== roundId || settledRef.current) return;
    settledRef.current = true;
    clearTimer();
    cancelAnimation(flight);
    setMultiplier(displayed);
    setSettlement(value);
    setRound(null);
    activeRoundRef.current = null;
    startingRef.current = false;
    const result = value.payout > value.bet ? 'win' : value.payout === value.bet ? 'push' : 'loss';
    completeGame({
      roundId,
      game: 'crash',
      bet: value.bet,
      payout: value.payout,
      result,
      detail: value.status === 'cashed-out' ? `${value.attemptedAt?.toFixed(2)}x` : `crash-${value.crashPoint.toFixed(2)}x`,
    });
  };

  const start = () => {
    if (startingRef.current || round) return;
    startingRef.current = true;
    const roundId = debit(bet, 'crash');
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;
    const next = startCrashRound(bet, autoEnabled ? autoTarget : undefined);
    setSettlement(null);
    setMultiplier(1);
    setRound(next);
    settledRef.current = false;
    startTimeRef.current = Date.now();
    const duration = Math.max(100, Math.log(next.crashPoint) / GROWTH_RATE);
    const flightDuration = state.settings.reducedMotion ? Math.min(500, duration) : duration;
    flight.value = 0;
    flight.value = withTiming(1, {
      duration: flightDuration,
      easing: state.settings.reducedMotion ? Easing.linear : Easing.in(Easing.quad),
    });
    const handle = setInterval(() => {
      if (activeRoundRef.current !== roundId) {
        clearInterval(handle);
        return;
      }
      const elapsed = Date.now() - startTimeRef.current;
      const current = state.settings.reducedMotion
        ? Math.min(next.crashPoint, 1 + (elapsed / flightDuration) * (next.crashPoint - 1))
        : crashMultiplierAt(elapsed, GROWTH_RATE);
      setMultiplier(Math.min(current, next.crashPoint));
      if (next.autoCashOut && current >= next.autoCashOut && next.autoCashOut < next.crashPoint) {
        finish(settleCrashRound(next), next.autoCashOut, roundId);
      } else if (current >= next.crashPoint) {
        finish(settleCrashRound(next), next.crashPoint, roundId);
      }
    }, 60);
    timerRef.current = handle;
  };

  const cashOut = () => {
    const roundId = activeRoundRef.current;
    if (!round || !roundId) return;
    const attempt = Math.max(1, Math.min(multiplier, round.crashPoint));
    finish(settleCrashRound(round, attempt), attempt, roundId);
  };

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: flight.value * -155 },
      { translateX: flight.value * 70 },
      { rotate: `${-32 + flight.value * 20}deg` },
      { scale: 0.88 + flight.value * 0.2 },
    ],
  }));

  const board = (
    <View style={styles.board}>
      <View style={styles.cloudOne} /><View style={styles.cloudTwo} />
      <Animated.View style={[styles.rocket, rocketStyle]}>
        <View style={styles.rocketNose} />
        <View style={styles.rocketWindow} />
        <View style={styles.flame} />
      </Animated.View>
      <Text style={[styles.multiplier, settlement?.status === 'crashed' && styles.crashed]}>{multiplier.toFixed(2)}×</Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>{round ? 'Rocket rising…' : settlement?.status === 'cashed-out' ? (settlement.profit > 0 ? `Cashed out · +${formatCoins(settlement.profit)} profit` : 'Cashed out · stake returned') : settlement ? `Popped at ${settlement.crashPoint.toFixed(2)}×` : 'Ready for launch'}</Text>
    </View>
  );

  return (
    <QuickGameFrame board={board} result={settlement ? (settlement.status === 'cashed-out' ? (settlement.profit > 0 ? `Safe landing · +${formatCoins(settlement.profit)} profit` : 'Safe landing · no profit') : 'The rocket popped before cash out') : null} slug="crash">
      <BetControl disabled={!!round} onChange={setBet} step={10} value={bet} />
      <View style={styles.options}><OptionPill disabled={!!round} label="Manual" onPress={() => setAutoEnabled(false)} selected={!autoEnabled} /><OptionPill disabled={!!round} label="Auto Cash Out" onPress={() => setAutoEnabled(true)} selected={autoEnabled} /></View>
      {autoEnabled && <View style={styles.autoRow}><Text style={styles.label}>Auto target</Text><OptionPill disabled={!!round} label="−" onPress={() => setAutoTarget(Math.max(1.1, Number((autoTarget - 0.25).toFixed(2))))} /><Text style={styles.autoValue}>{autoTarget.toFixed(2)}×</Text><OptionPill disabled={!!round} label="+" onPress={() => setAutoTarget(Math.min(25, Number((autoTarget + 0.25).toFixed(2))))} /></View>}
      {round ? (
        <ClayButton colors={gradients.mint} edgeColor={colors.mintEdge} label={`Cash Out · ${multiplier.toFixed(2)}×`} onPress={cashOut} />
      ) : (
        <ClayButton icon={<Ionicons color={colors.surface} name="rocket" size={21} />} label="Launch" onPress={start} />
      )}
    </QuickGameFrame>
  );
}

export default CrashGameScreen;

const styles = StyleSheet.create({
  board: { alignItems: 'center', height: 280, justifyContent: 'flex-start', position: 'relative', width: '100%' },
  cloudOne: { backgroundColor: 'rgba(255,255,255,.22)', borderRadius: 38, bottom: 22, height: 48, left: 4, position: 'absolute', width: 110 },
  cloudTwo: { backgroundColor: 'rgba(255,255,255,.17)', borderRadius: 36, bottom: 55, height: 43, position: 'absolute', right: -10, width: 92 },
  rocket: { backgroundColor: '#F3EEFF', borderRadius: 25, bottom: 20, height: 92, left: 55, position: 'absolute', width: 48 },
  rocketNose: { alignSelf: 'center', backgroundColor: colors.coralDark, borderTopLeftRadius: 26, borderTopRightRadius: 26, height: 27, marginTop: -10, width: 48 },
  rocketWindow: { alignSelf: 'center', backgroundColor: colors.blue, borderRadius: 10, height: 20, marginTop: 15, width: 20 },
  flame: { alignSelf: 'center', backgroundColor: colors.yellow, borderBottomLeftRadius: 11, borderBottomRightRadius: 11, height: 30, marginTop: 25, width: 22 },
  multiplier: { color: colors.surface, fontFamily: typography.display, fontSize: 48, marginTop: 28, textShadowColor: 'rgba(100,65,0,.3)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 8 },
  crashed: { color: colors.coralDark },
  status: { color: 'rgba(23,23,39,.62)', fontFamily: typography.uiBlack, fontSize: 14, marginTop: 3 },
  options: { flexDirection: 'row', gap: 9 },
  autoRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  label: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 11, marginRight: 'auto', textTransform: 'uppercase' },
  autoValue: { color: colors.text, fontFamily: typography.uiBlack, minWidth: 62, textAlign: 'center' },
});
