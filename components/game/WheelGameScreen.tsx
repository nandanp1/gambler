import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { DEFAULT_WHEEL_SEGMENTS, spinWheel, type WheelResult } from '@/games/quick/wheel';
import { useAppStore } from '@/store/AppStore';
import { colors, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const polar = (angle: number, radius: number) => ({
  x: 125 + Math.cos((angle * Math.PI) / 180) * radius,
  y: 125 + Math.sin((angle * Math.PI) / 180) * radius,
});

function ClayWheel() {
  const segmentAngle = 360 / DEFAULT_WHEEL_SEGMENTS.length;
  return (
    <Svg height="250" viewBox="0 0 250 250" width="250">
      <Circle cx="125" cy="125" fill="#F3EEFF" r="122" />
      {DEFAULT_WHEEL_SEGMENTS.map((segment, index) => {
        const start = index * segmentAngle - 90;
        const end = start + segmentAngle;
        const a = polar(start, 102);
        const b = polar(end, 102);
        const label = polar(start + segmentAngle / 2, 75);
        return (
          <G key={segment.id}>
            <Path d={`M125 125 L${a.x} ${a.y} A102 102 0 0 1 ${b.x} ${b.y} Z`} fill={segment.color} stroke="rgba(255,255,255,.45)" strokeWidth="2" />
            <SvgText fill={segment.multiplier === 0 ? 'rgba(23,23,39,.55)' : '#FFFFFF'} fontFamily="Nunito_900Black" fontSize="10" textAnchor="middle" x={label.x} y={label.y + 4}>{segment.label}</SvgText>
          </G>
        );
      })}
      <Circle cx="125" cy="125" fill="#FFC53D" r="35" stroke="#FFE9AE" strokeWidth="7" />
      <Circle cx="125" cy="125" fill="rgba(255,255,255,.35)" r="13" />
      <Circle cx="125" cy="125" fill="none" r="116" stroke="rgba(255,255,255,.75)" strokeWidth="8" />
    </Svg>
  );
}

export function WheelGameScreen() {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WheelResult | null>(null);
  const rotation = useSharedValue(0);
  const restAngle = useRef(0);
  const startingRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);

  useEffect(() => () => {
    activeRoundRef.current = null;
    cancelAnimation(rotation);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const settle = (next: WheelResult, roundId: string) => {
    if (activeRoundRef.current !== roundId) return;
    setResult(next);
    setBusy(false);
    activeRoundRef.current = null;
    startingRef.current = false;
    completeGame({
      roundId,
      game: 'wheel',
      bet: next.bet,
      payout: next.payout,
      result: next.payout > next.bet ? 'win' : next.payout === next.bet ? 'push' : 'loss',
      detail: next.segment.label,
    });
  };

  const spin = () => {
    if (startingRef.current || busy) return;
    startingRef.current = true;
    const roundId = debit(bet, 'wheel');
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;
    const next = spinWheel(bet);
    setResult(null);
    setBusy(true);
    const delta = ((next.targetAngle - restAngle.current) % 360 + 360) % 360;
    const target = rotation.value + (state.settings.reducedMotion ? 360 : 5 * 360) + delta;
    restAngle.current = next.targetAngle;
    rotation.value = withTiming(target, {
      duration: state.settings.reducedMotion ? 650 : 3_300,
      easing: Easing.bezier(0.12, 0.7, 0.12, 1),
    }, (finished) => { if (finished) runOnJS(settle)(next, roundId); });
  };

  const board = (
    <View style={styles.board}>
      <View style={styles.pointer} />
      <Animated.View style={[styles.wheel, style]}><ClayWheel /></Animated.View>
      {result && <View accessibilityLiveRegion="polite" style={styles.resultPill}><Text style={styles.resultLabel}>{result.segment.label}</Text><Text style={styles.resultAmount}>{result.payout > result.bet ? `+${formatCoins(result.payout - result.bet)} profit` : result.payout === result.bet ? 'Stake back' : 'Miss'}</Text></View>}
    </View>
  );

  return (
    <QuickGameFrame board={board} result={result ? `${result.segment.label} · ${result.won ? 'Prize landed' : result.payout === bet ? 'Stake returned' : 'Try another spin'}` : null} slug="wheel">
      <BetControl disabled={busy} onChange={setBet} step={10} value={bet} />
      <ClayButton disabled={busy} label={busy ? 'Spinning…' : 'Spin the Wheel'} loading={busy} onPress={spin} />
    </QuickGameFrame>
  );
}

export default WheelGameScreen;

const styles = StyleSheet.create({
  board: { alignItems: 'center', height: 300, justifyContent: 'center', position: 'relative', width: '100%' },
  wheel: { shadowColor: '#3D2B66', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 12 },
  pointer: { borderLeftColor: 'transparent', borderLeftWidth: 13, borderRightColor: 'transparent', borderRightWidth: 13, borderTopColor: colors.coralDark, borderTopWidth: 22, position: 'absolute', top: 4, zIndex: 3 },
  resultPill: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, bottom: 4, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 7, position: 'absolute' },
  resultLabel: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 13 },
  resultAmount: { color: colors.success, fontFamily: typography.uiBlack, fontSize: 13 },
});
