import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import {
  calculateMinesMultiplier,
  cashOutMines,
  createMinesRound,
  getTileState,
  revealTile,
  type MineTileState,
  type MinesRoundState,
} from '@/games/mines/engine';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const MINE_PRESETS = [1, 3, 5, 10, 15] as const;
const TILE_GAP = 7;
const BOARD_PADDING = 14;

const formatMultiplier = (value: number | null): string => value === null ? '—' : `${value.toFixed(value >= 10 ? 1 : 2)}×`;

const formatSigned = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded.toLocaleString('en-US')}`;
  if (rounded < 0) return `−${Math.abs(rounded).toLocaleString('en-US')}`;
  return '0';
};

function MetricCard({ label, tone = 'default', value }: { label: string; tone?: 'default' | 'purple' | 'green' | 'red'; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[
          styles.metricValue,
          tone === 'purple' && styles.metricPurple,
          tone === 'green' && styles.metricGreen,
          tone === 'red' && styles.metricRed,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface MineTileProps {
  disabled: boolean;
  index: number;
  lastRevealed: boolean;
  onPress: () => void;
  reducedMotion: boolean;
  size: number;
  state: MineTileState;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MineTile({ disabled, index, lastRevealed, onPress, reducedMotion, size, state }: MineTileProps) {
  const pressed = useSharedValue(0);
  const reveal = useSharedValue(1);
  const previousState = useRef(state);

  useEffect(() => {
    if (previousState.current === 'hidden' && state !== 'hidden' && !reducedMotion) {
      reveal.value = 0;
      reveal.value = withDelay(
        state === 'mine' && !lastRevealed ? Math.min(320, index * 14) : 0,
        withSpring(1, { damping: 13, stiffness: 255, mass: 0.48 }),
      );
    } else {
      reveal.value = 1;
    }
    previousState.current = state;
  }, [index, lastRevealed, reducedMotion, reveal, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.3, 1], [0.55, 0.82, 1]),
    transform: [
      { perspective: 600 },
      { rotateY: `${interpolate(reveal.value, [0, 1], [72, 0])}deg` },
      { rotateZ: `${interpolate(reveal.value, [0, 1], [index % 2 ? -5 : 5, 0])}deg` },
      { scale: interpolate(reveal.value, [0, 0.72, 1], [0.66, 1.09, 1]) * (1 - pressed.value * 0.055) },
      { translateY: pressed.value * 3 },
    ],
  }));

  const isMine = state === 'mine';
  const isSafe = state === 'safe';

  return (
    <AnimatedPressable
      accessibilityLabel={isMine ? 'Mine' : isSafe ? 'Safe gem' : `Hidden tile ${index + 1}`}
      accessibilityRole="button"
      disabled={disabled || state !== 'hidden'}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = reducedMotion ? withTiming(1, { duration: 40 }) : withSpring(1, { damping: 18, stiffness: 360 });
      }}
      onPressOut={() => {
        pressed.value = reducedMotion ? withTiming(0, { duration: 40 }) : withSpring(0, { damping: 18, stiffness: 360 });
      }}
      style={[
        styles.tile,
        { height: size, width: size },
        isSafe && styles.safeTile,
        isMine && styles.mineTile,
        isMine && lastRevealed && styles.triggeredMineTile,
        disabled && state === 'hidden' && styles.disabledTile,
        animatedStyle,
      ]}
    >
      {state === 'hidden' ? (
        <LinearGradient colors={['#FFFFFF', '#EDF7F4']} style={styles.hiddenTileFace}>
          <View style={styles.tileShine} />
        </LinearGradient>
      ) : state === 'safe' ? (
        <View style={styles.gemWrap}>
          <View style={styles.gem} />
          <View style={styles.gemShine} />
        </View>
      ) : (
        <View style={[styles.mineIcon, lastRevealed && styles.triggeredMineIcon]}>
          <View style={styles.fuse} />
          <Ionicons color={lastRevealed ? colors.surface : '#292442'} name="sparkles" size={Math.max(17, size * 0.38)} />
        </View>
      )}
    </AnimatedPressable>
  );
}

function MineSelector({ disabled, onChange, value }: { disabled: boolean; onChange: (value: number) => void; value: number }) {
  return (
    <View style={[styles.selectorSection, disabled && styles.dimmed]}>
      <View style={styles.selectorHeader}>
        <View>
          <Text style={styles.selectorLabel}>Number of mines</Text>
          <Text style={styles.selectorHint}>More mines means a faster multiplier</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="Decrease mines"
            disabled={disabled || value <= 1}
            onPress={() => onChange(Math.max(1, value - 1))}
            style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
          >
            <Text style={styles.stepSymbol}>−</Text>
          </Pressable>
          <Text style={styles.stepValue}>{value}</Text>
          <Pressable
            accessibilityLabel="Increase mines"
            disabled={disabled || value >= 24}
            onPress={() => onChange(Math.min(24, value + 1))}
            style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
          >
            <Text style={styles.stepSymbol}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.minePresets}>
        {MINE_PRESETS.map((preset) => (
          <Pressable
            accessibilityLabel={`${preset} mines`}
            disabled={disabled}
            key={preset}
            onPress={() => onChange(preset)}
            style={({ pressed }) => [
              styles.minePreset,
              value === preset && styles.minePresetSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.minePresetText, value === preset && styles.minePresetTextSelected]}>{preset}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function MinesGameScreen() {
  const { width } = useWindowDimensions();
  const { state, completeGame, debit, haptic } = useAppStore();
  const [bet, setBet] = useState(100);
  const [mineCount, setMineCount] = useState(3);
  const [round, setRound] = useState<MinesRoundState | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const roundRef = useRef<MinesRoundState | null>(null);
  const currentRoundIdRef = useRef<string | null>(null);
  const completedRoundIdsRef = useRef(new Set<string>());
  const resolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resolutionTimerRef.current) clearTimeout(resolutionTimerRef.current);
  }, []);

  const boardWidth = Math.max(250, Math.min(350, width - 40));
  const tileSize = (boardWidth - BOARD_PADDING * 2 - TILE_GAP * 4) / 5;
  const isActive = round?.status === 'active';
  const isSettled = Boolean(round && round.status !== 'active');
  const safeCount = round?.revealedSafePositions.length ?? 0;
  const configNext = useMemo(
    () => calculateMinesMultiplier(1, mineCount),
    [mineCount],
  );

  const finishRound = useCallback((settled: MinesRoundState, roundId: string) => {
    if (
      settled.status === 'active'
      || currentRoundIdRef.current !== roundId
      || completedRoundIdsRef.current.has(roundId)
    ) return;
    completedRoundIdsRef.current.add(roundId);
    setIsResolving(true);
    const payout = settled.status === 'lost' ? 0 : settled.cashOutValue;
    const result = payout > settled.bet ? 'win' : payout === settled.bet ? 'push' : 'loss';
    completeGame({
      roundId,
      game: 'mines',
      bet: settled.bet,
      payout,
      result,
      detail: `safe-${settled.revealedSafePositions.length}`,
    });
    if (resolutionTimerRef.current) clearTimeout(resolutionTimerRef.current);
    resolutionTimerRef.current = setTimeout(
      () => {
        if (currentRoundIdRef.current !== roundId) return;
        resolutionTimerRef.current = null;
        setIsResolving(false);
      },
      state.settings.reducedMotion ? 80 : settled.status === 'lost' ? 780 : 540,
    );
  }, [completeGame, state.settings.reducedMotion]);

  const startRound = useCallback(() => {
    if (isResolving || roundRef.current?.status === 'active') return;
    let next: MinesRoundState;
    try {
      next = createMinesRound({ bet, mineCount });
    } catch {
      return;
    }
    const storeRoundId = debit(bet, 'mines');
    if (!storeRoundId) return;
    currentRoundIdRef.current = storeRoundId;
    roundRef.current = next;
    setRound(next);
  }, [bet, debit, isResolving, mineCount]);

  const openTile = useCallback((position: number) => {
    const current = roundRef.current;
    if (!current || current.status !== 'active' || isResolving) return;
    let next: MinesRoundState;
    try {
      next = revealTile(current, position);
    } catch {
      return;
    }
    if (next === current) return;
    roundRef.current = next;
    setRound(next);
    if (next.status === 'active') haptic('selection');
    const storeRoundId = currentRoundIdRef.current;
    if (next.status !== 'active' && storeRoundId) finishRound(next, storeRoundId);
  }, [finishRound, haptic, isResolving]);

  const cashOut = useCallback(() => {
    const current = roundRef.current;
    if (!current || current.status !== 'active' || current.revealedSafePositions.length === 0 || isResolving) return;
    let next: MinesRoundState;
    try {
      next = cashOutMines(current);
    } catch {
      return;
    }
    roundRef.current = next;
    setRound(next);
    const storeRoundId = currentRoundIdRef.current;
    if (storeRoundId) finishRound(next, storeRoundId);
  }, [finishRound, isResolving]);

  const changeSetup = useCallback(() => {
    if (isResolving || roundRef.current?.status === 'active') return;
    roundRef.current = null;
    setRound(null);
  }, [isResolving]);

  const updateMines = useCallback((value: number) => {
    haptic('selection');
    setMineCount(Math.max(1, Math.min(24, value)));
  }, [haptic]);

  const quickBet = useCallback((mode: 'half' | 'double' | 'max') => {
    if (roundRef.current?.status === 'active') return;
    haptic('selection');
    if (mode === 'half') setBet((current) => Math.max(10, Math.floor(current / 20) * 10));
    else if (mode === 'double') setBet((current) => Math.min(5_000, current * 2));
    else setBet(Math.max(10, Math.min(5_000, state.balance)));
  }, [haptic, state.balance]);

  const tileStates = useMemo(() => Array.from({ length: 25 }, (_, index): MineTileState => (
    round ? getTileState(round, index) : 'hidden'
  )), [round]);

  const resultModel = useMemo(() => {
    if (!round || round.status === 'active') return null;
    if (round.status === 'lost') return {
      body: 'The board has revealed every mine.',
      icon: 'warning' as const,
      title: 'Mine found',
      tone: 'loss' as const,
    };
    if (round.status === 'won') return {
      body: 'Every safe tile cleared — perfect board!',
      icon: 'sparkles' as const,
      title: 'Board cleared',
      tone: 'win' as const,
    };
    const profit = round.cashOutValue - round.bet;
    return {
      body: `${round.revealedSafePositions.length} safe tile${round.revealedSafePositions.length === 1 ? '' : 's'} at ${formatMultiplier(round.multiplier)}.`,
      icon: profit >= 0 ? 'diamond' as const : 'remove' as const,
      title: profit > 0 ? 'Cashed out' : 'Stake returned',
      tone: profit > 0 ? 'win' as const : 'push' as const,
    };
  }, [round]);

  const nextValue = round ? formatMultiplier(round.nextMultiplier) : formatMultiplier(configNext);
  const profit = round?.profit ?? 0;
  const profitTone = profit > 0 ? 'green' : profit < 0 ? 'red' : 'default';

  return (
    <Screen bottomInset={30} scroll>
      <GameHeader title="Mines" />
      <View style={styles.content}>
        <View style={styles.metrics}>
          <MetricCard label="Mines" value={String(round?.mineCount ?? mineCount)} />
          <MetricCard label={isSettled ? 'Result' : 'Next'} tone="purple" value={isSettled ? (round?.status === 'lost' ? 'Boom' : formatMultiplier(round?.multiplier ?? null)) : nextValue} />
          <MetricCard label="Profit" tone={profitTone} value={round ? formatSigned(profit) : '—'} />
        </View>

        <LinearGradient
          colors={round?.status === 'lost' ? ['#FFAAA0', '#F06E63'] : ['#9BEBD3', '#4CCFAB']}
          style={[styles.board, { width: boardWidth }]}
        >
          <View pointerEvents="none" style={styles.boardGlow} />
          <View style={styles.tileGrid}>
            {tileStates.map((tileState, index) => (
              <MineTile
                disabled={!isActive || isResolving}
                index={index}
                key={index}
                lastRevealed={round?.lastRevealedPosition === index}
                onPress={() => openTile(index)}
                reducedMotion={state.settings.reducedMotion}
                size={tileSize}
                state={tileState}
              />
            ))}
          </View>
          {!round && (
            <View pointerEvents="none" style={styles.boardPrompt}>
              <View style={styles.promptIcon}>
                <Ionicons color={colors.mintDark} name="diamond" size={22} />
              </View>
              <Text style={styles.promptTitle}>A fresh 5 × 5 field</Text>
              <Text style={styles.promptCopy}>Mines lock into place when you start.</Text>
            </View>
          )}
        </LinearGradient>

        {resultModel && round && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.resultBanner, resultModel.tone === 'loss' && styles.lossBanner]}
          >
            <View style={[styles.resultIcon, resultModel.tone === 'loss' && styles.lossResultIcon]}>
              <Ionicons
                color={resultModel.tone === 'loss' ? colors.danger : colors.success}
                name={resultModel.icon}
                size={21}
              />
            </View>
            <View style={styles.resultText}>
              <Text style={[styles.resultTitle, resultModel.tone === 'loss' && styles.lossResultTitle]}>{resultModel.title}</Text>
              <Text style={styles.resultBody}>{resultModel.body}</Text>
            </View>
            <Text style={[styles.resultPayout, resultModel.tone === 'loss' && styles.lossResultPayout]}>
              {formatSigned(round.cashOutValue - round.bet)}
            </Text>
          </View>
        )}

        <View style={styles.controlPanel}>
          {!round ? (
            <>
              <BetControl disabled={isResolving} max={5_000} onChange={setBet} step={10} value={bet} />
              <View style={styles.quickBets}>
                <Text style={styles.quickLabel}>Quick bet</Text>
                <View style={styles.quickButtons}>
                  <Pressable onPress={() => quickBet('half')} style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}><Text style={styles.quickButtonText}>½</Text></Pressable>
                  <Pressable onPress={() => quickBet('double')} style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}><Text style={styles.quickButtonText}>2×</Text></Pressable>
                  <Pressable onPress={() => quickBet('max')} style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}><Text style={styles.quickButtonText}>Max</Text></Pressable>
                </View>
              </View>
              <MineSelector disabled={isResolving} onChange={updateMines} value={mineCount} />
              <ClayButton
                colors={gradients.mint}
                disabled={isResolving}
                edgeColor={colors.mintEdge}
                icon={<Ionicons color={colors.surface} name="grid" size={19} />}
                label="Start Round"
                onPress={startRound}
              />
            </>
          ) : isActive ? (
            <>
              <View style={styles.activeSummary}>
                <View>
                  <Text style={styles.summaryLabel}>Bet</Text>
                  <Text style={styles.summaryValue}>{formatCoins(round.bet)}</Text>
                </View>
                <View style={styles.safeCounter}>
                  <Ionicons color={colors.mintDark} name="diamond" size={16} />
                  <Text style={styles.safeCounterText}>{safeCount} safe</Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryLabel}>Current</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>{formatMultiplier(round.multiplier)}</Text>
                </View>
              </View>
              <ClayButton
                colors={gradients.mint}
                disabled={isResolving || safeCount === 0}
                edgeColor={colors.mintEdge}
                icon={<Ionicons color={colors.surface} name="lock-open" size={19} />}
                label={safeCount === 0 ? 'Reveal a Safe Tile' : `Cash Out · ${formatCoins(round.cashOutValue)}`}
                onPress={cashOut}
              />
              <Text style={styles.activeHint}>Your mine positions stay fixed for this entire round.</Text>
            </>
          ) : (
            <>
              <View style={styles.settledSummary}>
                <View>
                  <Text style={styles.summaryLabel}>Bet</Text>
                  <Text style={styles.summaryValue}>{formatCoins(round.bet)}</Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryLabel}>Payout</Text>
                  <Text style={[styles.summaryValue, { color: round.cashOutValue > 0 ? colors.success : colors.danger }]}>{formatCoins(round.cashOutValue)}</Text>
                </View>
              </View>
              <ClayButton
                colors={round.status === 'lost' ? gradients.primary : gradients.mint}
                disabled={isResolving}
                edgeColor={round.status === 'lost' ? colors.primaryEdge : colors.mintEdge}
                label={isResolving ? 'Resolving board…' : 'Play Again'}
                loading={isResolving}
                onPress={startRound}
              />
              <View style={styles.footerActions}>
                <ClayButton
                  colors={gradients.surface}
                  compact
                  disabled={isResolving}
                  edgeColor={colors.insetDeep}
                  label="Change Setup"
                  onPress={changeSetup}
                  style={styles.flexButton}
                  textColor={colors.inkPurple}
                />
                <ClayButton
                  colors={gradients.surface}
                  compact
                  disabled={isResolving}
                  edgeColor={colors.insetDeep}
                  label="Leave Game"
                  onPress={() => router.back()}
                  style={styles.flexButton}
                  textColor={colors.inkPurple}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

export default MinesGameScreen;

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 4 },
  metrics: { flexDirection: 'row', gap: 9, width: '100%' },
  metricCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.insetDeep,
    borderBottomWidth: 2,
    borderRadius: 21,
    flex: 1,
    height: 66,
    justifyContent: 'center',
    paddingHorizontal: 6,
    ...clayShadow('rgba(93,74,180,.12)', 4),
  },
  metricLabel: { color: colors.textFaint, fontFamily: typography.uiExtra, fontSize: 10.5, letterSpacing: 0.55, textTransform: 'uppercase' },
  metricValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 18.5, marginTop: 2, maxWidth: '100%' },
  metricPurple: { color: colors.primaryDark },
  metricGreen: { color: colors.success },
  metricRed: { color: colors.danger },
  board: {
    alignItems: 'center',
    alignSelf: 'center',
    borderBottomColor: '#2AAD8B',
    borderBottomWidth: 5,
    borderRadius: 32,
    justifyContent: 'center',
    minHeight: 350,
    overflow: 'hidden',
    padding: BOARD_PADDING,
    ...clayShadow('rgba(15,130,105,.38)', 11),
  },
  boardGlow: { backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 100, height: 180, left: -60, position: 'absolute', top: -76, width: 250 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP, width: '100%', zIndex: 1 },
  tile: {
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    overflow: 'visible',
  },
  hiddenTileFace: {
    borderRadius: 15,
    borderTopColor: colors.surface,
    borderTopWidth: 2,
    flex: 1,
    overflow: 'hidden',
    width: '100%',
    ...clayShadow('rgba(5,90,70,.3)', 5),
  },
  tileShine: { backgroundColor: 'rgba(255,255,255,.65)', borderRadius: 8, height: '18%', left: '13%', position: 'absolute', top: '11%', width: '42%' },
  safeTile: { backgroundColor: '#35B491', borderBottomColor: '#249174', borderBottomWidth: 2, overflow: 'hidden' },
  mineTile: { backgroundColor: '#403A62', borderBottomColor: '#282442', borderBottomWidth: 3, overflow: 'hidden' },
  triggeredMineTile: { backgroundColor: colors.coralDark, borderBottomColor: colors.coralEdge },
  disabledTile: { opacity: 0.78 },
  gemWrap: { alignItems: 'center', height: '54%', justifyContent: 'center', width: '54%' },
  gem: {
    backgroundColor: '#73F1D2',
    borderColor: '#C8FFF2',
    borderRadius: 5,
    borderWidth: 2,
    height: '78%',
    transform: [{ rotate: '45deg' }],
    width: '78%',
    ...clayShadow('rgba(0,72,55,.38)', 4),
  },
  gemShine: { backgroundColor: 'rgba(255,255,255,.8)', borderRadius: 3, height: 5, left: 4, position: 'absolute', top: 4, transform: [{ rotate: '-25deg' }], width: 10 },
  mineIcon: { alignItems: 'center', backgroundColor: '#C5BDDA', borderRadius: radius.pill, height: '62%', justifyContent: 'center', width: '62%' },
  triggeredMineIcon: { backgroundColor: '#3A304D' },
  fuse: { backgroundColor: colors.yellow, borderRadius: 4, height: 8, position: 'absolute', right: -2, top: -5, transform: [{ rotate: '30deg' }], width: 4 },
  boardPrompt: { alignItems: 'center', backgroundColor: 'rgba(31,128,102,.88)', borderRadius: radius.control, left: 32, paddingHorizontal: 14, paddingVertical: 12, position: 'absolute', right: 32, top: '36%', zIndex: 3 },
  promptIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 40, justifyContent: 'center', marginTop: -29, width: 40, ...clayShadow('rgba(5,90,70,.32)', 4) },
  promptTitle: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 15.5, marginTop: 4 },
  promptCopy: { color: 'rgba(255,255,255,.78)', fontFamily: typography.uiBold, fontSize: 10.5, marginTop: 1 },
  resultBanner: {
    alignItems: 'center',
    backgroundColor: '#E6F8F1',
    borderColor: '#C6ECDE',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
    width: '100%',
  },
  lossBanner: { backgroundColor: '#FFF0EE', borderColor: '#FFD5D0' },
  resultIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  lossResultIcon: { backgroundColor: '#FFE0DC' },
  resultText: { flex: 1 },
  resultTitle: { color: '#167B60', fontFamily: typography.uiBlack, fontSize: 15 },
  lossResultTitle: { color: '#B53646' },
  resultBody: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 11, marginTop: 1 },
  resultPayout: { color: colors.success, fontFamily: typography.display, fontSize: 20 },
  lossResultPayout: { color: colors.danger },
  controlPanel: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.insetDeep,
    borderBottomWidth: 3,
    borderRadius: radius.panel,
    gap: 13,
    padding: 18,
    width: '100%',
    ...clayShadow('rgba(84,64,170,.19)', 8),
  },
  quickBets: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  quickLabel: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 11, letterSpacing: 0.55, textTransform: 'uppercase' },
  quickButtons: { flexDirection: 'row', gap: 8 },
  quickButton: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: 13, height: 36, justifyContent: 'center', minWidth: 48, paddingHorizontal: 10 },
  quickButtonText: { color: colors.inkPurple, fontFamily: typography.uiBlack, fontSize: 13 },
  selectorSection: { gap: 11 },
  selectorHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  selectorLabel: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 14 },
  selectorHint: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 9.5, marginTop: 1 },
  stepper: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: radius.md, flexDirection: 'row', gap: 4, height: 39, paddingHorizontal: 4 },
  stepButton: { alignItems: 'center', borderRadius: 11, height: 31, justifyContent: 'center', width: 31 },
  stepSymbol: { color: colors.inkPurple, fontFamily: typography.uiBlack, fontSize: 18 },
  stepValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16, minWidth: 28, textAlign: 'center' },
  minePresets: { flexDirection: 'row', gap: 7 },
  minePreset: { alignItems: 'center', backgroundColor: colors.inset, borderColor: 'transparent', borderRadius: radius.pill, borderWidth: 2, flex: 1, height: 36, justifyContent: 'center' },
  minePresetSelected: { backgroundColor: '#DFF7EF', borderColor: colors.mintDark },
  minePresetText: { color: colors.textMuted, fontFamily: typography.uiBlack, fontSize: 12.5 },
  minePresetTextSelected: { color: '#167B60' },
  dimmed: { opacity: 0.48 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  activeSummary: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  settledSummary: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  summaryRight: { alignItems: 'flex-end' },
  summaryLabel: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  summaryValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 19, marginTop: 2 },
  safeCounter: { alignItems: 'center', backgroundColor: '#DFF7EF', borderRadius: radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  safeCounterText: { color: '#167B60', fontFamily: typography.uiBlack, fontSize: 12 },
  activeHint: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 10.5, textAlign: 'center' },
  footerActions: { flexDirection: 'row', gap: 12 },
  flexButton: { flex: 1 },
});
