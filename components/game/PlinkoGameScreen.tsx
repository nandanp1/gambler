import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import {
  PLINKO_MAX_ROWS,
  PLINKO_MIN_ROWS,
  dropPlinkoBall,
  getMultiplierTable,
  type PlinkoDropResult,
  type PlinkoRisk,
} from '@/games/plinko/engine';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';
import { soundManager } from '@/utils/sound';

const BALL_SIZE = 24;
const BALL_TOP = 16;
const RISKS: readonly { label: string; value: PlinkoRisk }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
];

type PendingDrop = {
  id: number;
  roundId: string;
  result: PlinkoDropResult;
  settled: boolean;
};

const multiplierLabel = (multiplier: number): string =>
  `${Number.isInteger(multiplier) ? multiplier.toFixed(0) : multiplier.toFixed(multiplier < 1 ? 2 : 1).replace(/\.0$/, '')}×`;

const bucketColors = (multiplier: number): readonly [string, string] => {
  if (multiplier >= 3) return gradients.coral;
  if (multiplier >= 1) return gradients.yellow;
  return ['#E8E2FA', '#CFC5EE'];
};

const bucketEdge = (multiplier: number): string => {
  if (multiplier >= 3) return colors.coralEdge;
  if (multiplier >= 1) return '#E8B92C';
  return '#B8AEDF';
};

export function PlinkoGameScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, debit, completeGame, haptic, showToast } = useAppStore();
  const [bet, setBet] = useState(25);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [rows, setRows] = useState(6);
  const [dropping, setDropping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<PlinkoDropResult | null>(null);
  const mountedRef = useRef(true);
  const dropLockRef = useRef(false);
  const transactionRef = useRef(0);
  const pendingRef = useRef<PendingDrop | null>(null);
  const ballOffset = useSharedValue(0);
  const ballY = useSharedValue(0);
  const ballScaleX = useSharedValue(1);
  const ballScaleY = useSharedValue(1);

  const boardWidth = Math.min(430, Math.max(270, width - 24));
  const boardHeight = Math.min(350, 252 + rows * 6);
  const centerX = boardWidth / 2;
  const horizontalPadding = 14;
  const stepX = (boardWidth - horizontalPadding * 2) / (rows + 1);
  const halfStep = stepX / 2;
  const bucketTop = boardHeight - 45;
  const pegStartY = 52;
  const pegEndY = bucketTop - 28;
  const rowGap = (pegEndY - pegStartY) / Math.max(1, rows - 1);
  const pegSize = rows >= 13 ? 7 : rows >= 10 ? 8 : 10;
  const multiplierFontSize = rows >= 14 ? 7 : rows >= 11 ? 8 : rows >= 9 ? 9 : 10.5;
  const multipliers = useMemo(() => getMultiplierTable(risk, rows), [risk, rows]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballOffset.value * halfStep },
      { translateY: ballY.value },
      { scaleX: ballScaleX.value },
      { scaleY: ballScaleY.value },
    ],
  }));

  const resetBoard = useCallback(() => {
    setLastResult(null);
    setActiveBucket(null);
    setProgress(0);
    ballOffset.value = state.settings.reducedMotion
      ? 0
      : withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    ballY.value = state.settings.reducedMotion
      ? 0
      : withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    ballScaleX.value = 1;
    ballScaleY.value = 1;
  }, [ballOffset, ballScaleX, ballScaleY, ballY, state.settings.reducedMotion]);

  const changeRisk = useCallback((nextRisk: PlinkoRisk) => {
    if (dropping || nextRisk === risk) return;
    setRisk(nextRisk);
    resetBoard();
    haptic('selection');
  }, [dropping, haptic, resetBoard, risk]);

  const changeRows = useCallback((delta: number) => {
    if (dropping) return;
    const next = Math.min(PLINKO_MAX_ROWS, Math.max(PLINKO_MIN_ROWS, rows + delta));
    if (next === rows) return;
    setRows(next);
    resetBoard();
    haptic('selection');
  }, [dropping, haptic, resetBoard, rows]);

  const dropBall = useCallback(() => {
    if (dropLockRef.current || dropping) return;
    dropLockRef.current = true;
    const storeRoundId = debit(bet, 'plinko');
    if (!storeRoundId) {
      dropLockRef.current = false;
      return;
    }

    // The complete left/right path and matching bucket are fixed before motion starts.
    const result = dropPlinkoBall({ bet, risk, rows });
    const id = ++transactionRef.current;
    pendingRef.current = { id, roundId: storeRoundId, result, settled: false };
    setDropping(true);
    setLastResult(null);
    setActiveBucket(null);
    setProgress(0);
    ballOffset.value = 0;
    ballY.value = 0;
    ballScaleX.value = 1;
    ballScaleY.value = 1;

    const reduced = state.settings.reducedMotion;
    const bounceDuration = reduced ? 45 : 145;
    const moveDuration = reduced ? 42 : 132;

    result.steps.forEach((step, index) => {
      setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending || pending.id !== id || pending.settled || !mountedRef.current) return;
        const pegY = pegStartY + step.row * rowGap;
        const belowPeg = pegY + Math.min(rowGap * 0.62, 16);
        ballOffset.value = withTiming(step.offset, {
          duration: moveDuration,
          easing: Easing.inOut(Easing.quad),
        });
        ballY.value = withTiming(belowPeg - BALL_TOP, {
          duration: moveDuration,
          easing: Easing.in(Easing.quad),
        });
      }, index * bounceDuration);

      setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending || pending.id !== id || pending.settled || !mountedRef.current) return;
        if (!reduced) {
          ballScaleX.value = withSequence(
            withTiming(1.18, { duration: 42 }),
            withSpring(1, { damping: 13, stiffness: 310 }),
          );
          ballScaleY.value = withSequence(
            withTiming(0.8, { duration: 42 }),
            withSpring(1, { damping: 13, stiffness: 310 }),
          );
        }
        setProgress(index + 1);
        soundManager.play('plinkoPeg', state.settings.sound);
        haptic('light');
      }, index * bounceDuration + Math.round(moveDuration * 0.68));
    });

    const landingStart = result.steps.length * bounceDuration;
    setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending || pending.id !== id || pending.settled || !mountedRef.current) return;
      const finalOffset = result.steps[result.steps.length - 1]?.offset ?? 0;
      ballOffset.value = withTiming(finalOffset, {
        duration: moveDuration,
        easing: Easing.out(Easing.quad),
      });
      ballY.value = withTiming(bucketTop + 8 - BALL_TOP, {
        duration: moveDuration,
        easing: Easing.in(Easing.cubic),
      });
    }, landingStart);

    setTimeout(() => {
      const pending = pendingRef.current;
      if (
        !pending
        || pending.id !== id
        || pending.roundId !== storeRoundId
        || pending.settled
      ) return;
      pending.settled = true;
      const outcome = pending.result;
      completeGame({
        roundId: pending.roundId,
        game: 'plinko',
        bet: outcome.bet,
        payout: outcome.payout,
        detail: outcome.multiplier === 10
          ? '10x'
          : `${outcome.multiplier}× · ${outcome.risk} · ${outcome.rows} rows`,
      });
      soundManager.play(outcome.payout > outcome.bet ? 'win' : 'lose', state.settings.sound);
      dropLockRef.current = false;
      if (!mountedRef.current) return;
      setActiveBucket(outcome.bucketIndex);
      setLastResult(outcome);
      setProgress(outcome.rows);
      setDropping(false);
      if (outcome.multiplier >= 10) showToast(`${multiplierLabel(outcome.multiplier)} edge catch!`);
    }, landingStart + moveDuration + (reduced ? 25 : 70));
  }, [
    ballOffset,
    ballScaleX,
    ballScaleY,
    ballY,
    bet,
    bucketTop,
    completeGame,
    debit,
    dropping,
    haptic,
    pegStartY,
    risk,
    rowGap,
    rows,
    showToast,
    state.settings.reducedMotion,
    state.settings.sound,
  ]);

  const status = dropping
    ? `Bouncing through row ${Math.max(1, progress)} of ${rows}`
    : lastResult
      ? lastResult.payout > lastResult.bet
        ? `Landed ${multiplierLabel(lastResult.multiplier)} · won ${formatCoins(lastResult.payout)}`
        : lastResult.payout === lastResult.bet
          ? `Landed ${multiplierLabel(lastResult.multiplier)} · stake returned`
          : `Landed ${multiplierLabel(lastResult.multiplier)} · try another drop`
      : `${rows} rows · ${risk === 'medium' ? 'medium' : risk} risk`;

  return (
    <Screen bottomInset={0}>
      <View pointerEvents={dropping ? 'none' : 'auto'} style={dropping && styles.headerDisabled}>
        <GameHeader title="Plinko" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroller}>
        <View
          accessibilityLabel={`Plinko board, ${risk} risk, ${rows} rows`}
          style={[styles.boardShadow, { height: boardHeight, width: boardWidth }]}
        >
          <LinearGradient colors={gradients.lavender} style={styles.board}>
            <View style={styles.launchHalo} />
            {Array.from({ length: rows }, (_, row) => {
              const pegY = pegStartY + row * rowGap;
              return Array.from({ length: row + 1 }, (__, pegIndex) => {
                const offset = pegIndex * 2 - row;
                const pegX = centerX + offset * halfStep;
                return (
                  <View
                    key={`${row}-${pegIndex}`}
                    style={[
                      styles.peg,
                      {
                        borderRadius: pegSize / 2,
                        height: pegSize,
                        left: pegX - pegSize / 2,
                        top: pegY - pegSize / 2,
                        width: pegSize,
                      },
                    ]}
                  />
                );
              });
            })}

            <View style={[styles.bucketRow, { top: bucketTop }]}>
              {multipliers.map((multiplier, bucketIndex) => {
                const bucketCenter = centerX + (bucketIndex * 2 - rows) * halfStep;
                const bucketWidth = Math.max(12, stepX - 3);
                const selected = activeBucket === bucketIndex;
                return (
                  <View
                    accessibilityLabel={`Bucket ${bucketIndex + 1}, ${multiplierLabel(multiplier)}`}
                    key={bucketIndex}
                    style={[
                      styles.bucketEdge,
                      {
                        backgroundColor: bucketEdge(multiplier),
                        left: bucketCenter - bucketWidth / 2,
                        width: bucketWidth,
                      },
                      selected && styles.selectedBucket,
                    ]}
                  >
                    <LinearGradient colors={bucketColors(multiplier)} style={styles.bucketFace}>
                      <Text numberOfLines={1} style={[styles.bucketText, { fontSize: multiplierFontSize }]}>
                        {multiplierLabel(multiplier)}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>

            <Animated.View
              accessibilityLabel={dropping ? `Plinko ball at row ${progress}` : 'Plinko ball'}
              style={[
                styles.ballOuter,
                { left: centerX - BALL_SIZE / 2, top: BALL_TOP },
                ballStyle,
              ]}
            >
              <LinearGradient colors={['#FFFFFF', '#DED6F3']} style={styles.ballFace} />
            </Animated.View>
          </LinearGradient>
        </View>

        <View accessibilityLiveRegion="polite" style={styles.statusPill}>
          <View style={[styles.statusDot, dropping && styles.statusDotActive]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </ScrollView>

      <LinearGradient
        colors={gradients.surface}
        style={[styles.controlPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <BetControl
          disabled={dropping}
          label="Bet"
          max={5_000}
          min={25}
          onChange={setBet}
          step={25}
          value={bet}
        />

        <View style={styles.optionRow}>
          <View style={styles.riskWrap}>
            <Text style={styles.eyebrow}>Risk</Text>
            <View style={styles.segmentedControl}>
              {RISKS.map((item) => {
                const selected = item.value === risk;
                return (
                  <Pressable
                    accessibilityLabel={`${item.label} Plinko risk`}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: dropping }}
                    disabled={dropping}
                    key={item.value}
                    onPress={() => changeRisk(item.value)}
                    style={({ pressed }) => [
                      styles.riskSegment,
                      selected && styles.riskSegmentSelected,
                      pressed && styles.controlPressed,
                    ]}
                  >
                    {selected ? (
                      <LinearGradient colors={gradients.primary} style={styles.selectedRiskFill}>
                        <Text style={styles.selectedRiskText}>{item.label}</Text>
                      </LinearGradient>
                    ) : <Text style={styles.riskText}>{item.label}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.rowsWrap}>
            <Text style={styles.eyebrow}>Rows</Text>
            <View style={styles.rowsControl}>
              <Pressable
                accessibilityLabel="Decrease Plinko rows"
                disabled={dropping || rows <= PLINKO_MIN_ROWS}
                hitSlop={4}
                onPress={() => changeRows(-1)}
                style={({ pressed }) => [styles.rowStep, pressed && styles.controlPressed]}
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text accessibilityLabel={`${rows} Plinko rows`} style={styles.rowsValue}>{rows}</Text>
              <Pressable
                accessibilityLabel="Increase Plinko rows"
                disabled={dropping || rows >= PLINKO_MAX_ROWS}
                hitSlop={4}
                onPress={() => changeRows(1)}
                style={({ pressed }) => [styles.rowStep, pressed && styles.controlPressed]}
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <ClayButton
          accessibilityLabel="Plinko Drop Ball"
          disabled={dropping}
          height={56}
          label={dropping ? 'Ball dropping…' : 'Drop Ball'}
          loading={dropping}
          onPress={dropBall}
        />
      </LinearGradient>
    </Screen>
  );
}

export default PlinkoGameScreen;

const styles = StyleSheet.create({
  scroller: { flex: 1 },
  content: { alignItems: 'center', paddingBottom: 16, paddingTop: 10 },
  headerDisabled: { opacity: 0.62 },
  boardShadow: { borderRadius: radius.panel, ...clayShadow('rgba(90,55,200,0.45)', 11) },
  board: { borderRadius: radius.panel, borderTopColor: 'rgba(255,255,255,0.44)', borderTopWidth: 3, flex: 1, overflow: 'hidden', position: 'relative' },
  launchHalo: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24, height: 46, position: 'absolute', top: 3, width: 46 },
  peg: { backgroundColor: '#F5F1FF', borderTopColor: '#FFFFFF', borderTopWidth: 2, position: 'absolute', shadowColor: '#351F79', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.34, shadowRadius: 3, elevation: 3 },
  ballOuter: { borderRadius: BALL_SIZE / 2, height: BALL_SIZE, position: 'absolute', width: BALL_SIZE, zIndex: 8, ...clayShadow('rgba(35,20,92,0.54)', 5) },
  ballFace: { borderColor: 'rgba(255,255,255,0.86)', borderRadius: BALL_SIZE / 2, borderTopWidth: 3, flex: 1 },
  bucketRow: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  bucketEdge: { borderRadius: 8, height: 35, paddingBottom: 4, position: 'absolute' },
  bucketFace: { alignItems: 'center', borderRadius: 8, borderTopColor: 'rgba(255,255,255,0.46)', borderTopWidth: 2, flex: 1, justifyContent: 'center', overflow: 'hidden' },
  bucketText: { color: colors.surface, fontFamily: typography.uiBlack, letterSpacing: -0.4, textAlign: 'center' },
  selectedBucket: { borderColor: colors.surface, borderWidth: 2, shadowColor: '#FFFFFF', shadowOpacity: 0.8, shadowRadius: 8, transform: [{ translateY: -3 }, { scale: 1.08 }], zIndex: 5 },
  statusPill: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: radius.pill, flexDirection: 'row', gap: 8, marginTop: 13, minHeight: 39, paddingHorizontal: 18 },
  statusDot: { backgroundColor: colors.textFaint, borderRadius: 5, height: 9, width: 9 },
  statusDotActive: { backgroundColor: colors.mintDark },
  statusText: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 13 },
  controlPanel: { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, paddingHorizontal: 20, paddingTop: 15, ...clayShadow('rgba(84,64,170,0.28)', 9) },
  optionRow: { flexDirection: 'row', gap: 11, marginBottom: 13, marginTop: 12 },
  riskWrap: { flex: 1 },
  rowsWrap: { width: 122 },
  eyebrow: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 10.5, letterSpacing: 0.7, marginBottom: 5, textTransform: 'uppercase' },
  segmentedControl: { backgroundColor: colors.inset, borderRadius: 16, flexDirection: 'row', height: 44, padding: 4 },
  riskSegment: { alignItems: 'center', borderRadius: 12, flex: 1, justifyContent: 'center', overflow: 'hidden' },
  riskSegmentSelected: { ...clayShadow('rgba(120,90,240,0.3)', 3) },
  selectedRiskFill: { alignItems: 'center', borderRadius: 12, flex: 1, justifyContent: 'center', width: '100%' },
  riskText: { color: colors.textFaint, fontFamily: typography.uiExtra, fontSize: 11.5 },
  selectedRiskText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 11.5 },
  rowsControl: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: 16, flexDirection: 'row', height: 44, justifyContent: 'space-between', paddingHorizontal: 3 },
  rowStep: { alignItems: 'center', height: 40, justifyContent: 'center', width: 36 },
  stepText: { color: colors.textMuted, fontFamily: typography.uiBlack, fontSize: 18 },
  rowsValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16 },
  controlPressed: { opacity: 0.68, transform: [{ scale: 0.94 }] },
});
