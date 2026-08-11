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
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { ClayButton } from '@/components/ClayButton';
import { ClayIconButton } from '@/components/ClayIconButton';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import {
  EUROPEAN_WHEEL_ORDER,
  getNumberColor,
  getTargetRotation,
  normalizeBetType,
  resolveRouletteBets,
  spinRoulette,
  type RouletteBet,
  type RouletteBetKind,
  type RouletteColor,
  type RouletteResolution,
} from '@/games/roulette/engine';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';
import { soundManager } from '@/utils/sound';

const CHIP_VALUES = [10, 50, 100] as const;
const POCKET_ANGLE = 360 / EUROPEAN_WHEEL_ORDER.length;
const LEADING_NUMBER = /^\d+/;

type BetSelection = {
  type: RouletteBetKind;
  number?: number;
};

type CompletedSpin = {
  number: number;
  color: RouletteColor;
  payout: number;
  stake: number;
};

type PendingSpin = {
  id: number;
  roundId: string;
  settled: boolean;
  resolution: RouletteResolution;
  bets: RouletteBet[];
};

const OUTSIDE_BETS: readonly { label: string; selection: BetSelection; tone: 'red' | 'black' | 'plain' }[] = [
  { label: 'Red', selection: { type: 'red' }, tone: 'red' },
  { label: 'Black', selection: { type: 'black' }, tone: 'black' },
  { label: 'Odd', selection: { type: 'odd' }, tone: 'plain' },
  { label: 'Even', selection: { type: 'even' }, tone: 'plain' },
  { label: '1–18', selection: { type: 'low' }, tone: 'plain' },
  { label: '19–36', selection: { type: 'high' }, tone: 'plain' },
];

const selectionKey = (selection: BetSelection): string =>
  selection.type === 'straight' ? `straight-${selection.number}` : selection.type;

const betKey = (bet: RouletteBet): string => {
  const type = normalizeBetType(bet.type);
  return type === 'straight' ? `straight-${bet.number ?? bet.value}` : type;
};

const polarPoint = (center: number, radiusValue: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: center + Math.cos(radians) * radiusValue,
    y: center + Math.sin(radians) * radiusValue,
  };
};

function WheelFace({ size }: { size: number }) {
  const center = size / 2;
  const outer = size * 0.43;
  const inner = size * 0.265;
  const labelRadius = size * 0.36;

  return (
    <Svg height={size} width={size}>
      <Circle cx={center} cy={center} fill="#E7E0F7" r={outer + size * 0.055} />
      {EUROPEAN_WHEEL_ORDER.map((number, index) => {
        const middle = -90 + index * POCKET_ANGLE;
        const start = middle - POCKET_ANGLE / 2;
        const end = middle + POCKET_ANGLE / 2;
        const innerStart = polarPoint(center, inner, start);
        const outerStart = polarPoint(center, outer, start);
        const outerEnd = polarPoint(center, outer, end);
        const innerEnd = polarPoint(center, inner, end);
        const label = polarPoint(center, labelRadius, middle);
        const pocketColor = getNumberColor(number);
        const fill = pocketColor === 'green'
          ? colors.mintDark
          : pocketColor === 'red'
            ? colors.red
            : colors.rouletteBlack;
        const d = [
          `M ${innerStart.x} ${innerStart.y}`,
          `L ${outerStart.x} ${outerStart.y}`,
          `A ${outer} ${outer} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
          `L ${innerEnd.x} ${innerEnd.y}`,
          `A ${inner} ${inner} 0 0 0 ${innerStart.x} ${innerStart.y}`,
          'Z',
        ].join(' ');
        return (
          <React.Fragment key={number}>
            <Path d={d} fill={fill} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
            <SvgText
              fill="#FFFFFF"
              fontFamily={typography.uiBlack}
              fontSize={size < 190 ? 5.6 : 6.3}
              textAnchor="middle"
              x={label.x}
              y={label.y + 2}
            >
              {number}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Circle cx={center} cy={center} fill="none" r={outer + size * 0.02} stroke="rgba(255,255,255,0.72)" strokeWidth={size * 0.025} />
    </Svg>
  );
}

function StakeBadge({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <View pointerEvents="none" style={styles.stakeBadge}>
      <Text style={styles.stakeBadgeText}>{formatCoins(amount)}</Text>
    </View>
  );
}

export function RouletteGameScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, debit, completeGame, haptic, showToast } = useAppStore();
  const wheelSize = Math.min(214, Math.max(176, width * 0.52));
  const [selectedChip, setSelectedChip] = useState<(typeof CHIP_VALUES)[number]>(50);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [lastBets, setLastBets] = useState<RouletteBet[]>([]);
  const [recent, setRecent] = useState<number[]>([]);
  const [lastSpin, setLastSpin] = useState<CompletedSpin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const wheelRotation = useSharedValue(0);
  const wheelAngleRef = useRef(0);
  const transactionRef = useRef(0);
  const pendingRef = useRef<PendingSpin | null>(null);
  const spinLockRef = useRef(false);
  const mountedRef = useRef(true);
  const loadedHistoryRef = useRef(false);
  const lastPlacementRef = useRef({ key: '', time: 0 });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated || loadedHistoryRef.current) return;
    loadedHistoryRef.current = true;
    const savedNumbers = state.history
      .filter((event) => event.game === 'roulette')
      .map((event) => Number(event.detail?.match(LEADING_NUMBER)?.[0]))
      .filter((number) => Number.isInteger(number) && number >= 0 && number <= 36)
      .slice(0, 8);
    if (savedNumbers.length) {
      setRecent(savedNumbers);
      const number = savedNumbers[0]!;
      setLastSpin({ number, color: getNumberColor(number), payout: 0, stake: 0 });
    }
  }, [state.history, state.hydrated]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wheelRotation.value}deg` }],
  }));

  const totalBet = useMemo(
    () => bets.reduce((sum, bet) => sum + bet.amount, 0),
    [bets],
  );

  const stakeFor = useCallback((selection: BetSelection) => {
    const key = selectionKey(selection);
    return bets.reduce((sum, bet) => sum + (betKey(bet) === key ? bet.amount : 0), 0);
  }, [bets]);

  const placeBet = useCallback((selection: BetSelection) => {
    if (spinning || spinLockRef.current) return;
    const key = selectionKey(selection);
    const now = Date.now();
    if (lastPlacementRef.current.key === key && now - lastPlacementRef.current.time < 160) return;
    lastPlacementRef.current = { key, time: now };
    if (totalBet + selectedChip > state.balance) {
      showToast('That wager is above your balance');
      haptic('warning');
      return;
    }
    const next: RouletteBet = selection.type === 'straight'
      ? { type: 'straight', amount: selectedChip, number: selection.number }
      : { type: selection.type, amount: selectedChip };
    setBets((current) => [...current, next]);
    haptic('selection');
    soundManager.play('chip', state.settings.sound);
  }, [haptic, selectedChip, showToast, spinning, state.balance, state.settings.sound, totalBet]);

  const clearBets = useCallback(() => {
    if (spinning) return;
    setBets([]);
    haptic('light');
  }, [haptic, spinning]);

  const repeatBets = useCallback(() => {
    if (spinning || lastBets.length === 0) return;
    const repeatedTotal = lastBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (repeatedTotal > state.balance) {
      showToast('Not enough coins to repeat');
      return;
    }
    setBets(lastBets.map((bet) => ({ ...bet })));
    haptic('selection');
  }, [haptic, lastBets, showToast, spinning, state.balance]);

  const spinWheel = useCallback(() => {
    if (spinLockRef.current || spinning) return;
    if (bets.length === 0 || totalBet <= 0) {
      showToast('Place a bet first');
      haptic('warning');
      return;
    }
    spinLockRef.current = true;
    const storeRoundId = debit(totalBet, 'roulette');
    if (!storeRoundId) {
      spinLockRef.current = false;
      return;
    }

    // The winning pocket and payout are locked before the wheel moves.
    const winningNumber = spinRoulette();
    const resolution = resolveRouletteBets(bets, winningNumber);
    const id = ++transactionRef.current;
    const frozenBets = bets.map((bet) => ({ ...bet }));
    pendingRef.current = { id, roundId: storeRoundId, settled: false, resolution, bets: frozenBets };
    setLastBets(frozenBets);
    setSpinning(true);
    setLastSpin(null);
    soundManager.play('rouletteSpin', state.settings.sound);

    const reduced = state.settings.reducedMotion;
    let target = getTargetRotation(winningNumber, reduced ? 1 : 5);
    const minimumTravel = reduced ? 180 : 4 * 360;
    while (target > wheelAngleRef.current - minimumTravel) target -= 360;

    if (reduced) {
      wheelRotation.value = withTiming(target, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
    } else {
      const accelerationTarget = wheelAngleRef.current - 360;
      wheelRotation.value = withSequence(
        withTiming(accelerationTarget, {
          duration: 340,
          easing: Easing.in(Easing.cubic),
        }),
        withTiming(target, {
          duration: 2_560,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
    wheelAngleRef.current = target;

    const settleAfter = reduced ? 210 : 2_940;
    setTimeout(() => {
      const pending = pendingRef.current;
      if (
        !pending
        || pending.id !== id
        || pending.roundId !== storeRoundId
        || pending.settled
      ) return;
      pending.settled = true;
      const outcome = pending.resolution;
      const wonStraightBet = outcome.bets.some(
        ({ bet: resolvedBet, won }) => won && normalizeBetType(resolvedBet.type) === 'straight',
      );
      completeGame({
        roundId: pending.roundId,
        game: 'roulette',
        bet: outcome.totalStake,
        payout: outcome.totalPayout,
        detail: wonStraightBet ? 'single-number-win' : `${outcome.winningNumber} ${outcome.color}`,
      });
      soundManager.play(outcome.totalPayout > outcome.totalStake ? 'win' : 'lose', state.settings.sound);
      spinLockRef.current = false;
      if (!mountedRef.current) return;
      setLastSpin({
        number: outcome.winningNumber,
        color: outcome.color,
        payout: outcome.totalPayout,
        stake: outcome.totalStake,
      });
      setRecent((current) => [outcome.winningNumber, ...current].slice(0, 8));
      setBets([]);
      setSpinning(false);
    }, settleAfter);
  }, [bets, completeGame, debit, haptic, showToast, spinning, state.settings.reducedMotion, state.settings.sound, totalBet, wheelRotation]);

  const statusText = spinning
    ? 'The ball is circling…'
    : lastSpin
      ? lastSpin.payout > lastSpin.stake
        ? `Won ${formatCoins(lastSpin.payout)} · ${lastSpin.number} ${lastSpin.color}`
        : `${lastSpin.number} ${lastSpin.color} · No win`
      : 'Choose a chip, then place your bets';

  return (
    <Screen bottomInset={0}>
      <View pointerEvents={spinning ? 'none' : 'auto'} style={spinning && styles.headerDisabled}>
        <GameHeader title="Roulette" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroller}
      >
        <View
          accessibilityLabel={spinning ? 'Roulette wheel spinning' : lastSpin ? `Roulette result ${lastSpin.number} ${lastSpin.color}` : 'Roulette wheel ready'}
          style={[styles.wheelStage, { height: wheelSize + 28 }]}
        >
          <View style={[styles.wheelShadow, { borderRadius: wheelSize / 2 + 12, height: wheelSize + 18, width: wheelSize + 18 }]}>
            <LinearGradient colors={['#FFFFFF', '#DCD3F4']} style={styles.wheelRim}>
              <Animated.View style={wheelStyle}>
                <WheelFace size={wheelSize} />
              </Animated.View>
            </LinearGradient>
          </View>
          <View style={[styles.ball, { right: width / 2 - wheelSize * 0.43 - 6, top: 30 }]} />
          <View style={styles.pointer} />
          <LinearGradient colors={gradients.lavender} style={[styles.hub, { height: wheelSize * 0.47, width: wheelSize * 0.47 }]}>
            <LinearGradient colors={gradients.gold} style={[styles.resultBall, { height: wheelSize * 0.255, width: wheelSize * 0.255 }]}>
              <Text style={[styles.resultNumber, { fontSize: wheelSize * 0.125 }]}>
                {spinning ? '•' : lastSpin?.number ?? '—'}
              </Text>
            </LinearGradient>
          </LinearGradient>
        </View>

        <View accessibilityLiveRegion="polite" style={styles.statusPill}>
          <View style={[styles.statusDot, lastSpin && { backgroundColor: lastSpin.color === 'green' ? colors.mintDark : lastSpin.color === 'red' ? colors.red : colors.rouletteBlack }]} />
          <Text numberOfLines={1} style={styles.statusText}>{statusText}</Text>
        </View>

        <View style={styles.recentRow}>
          <Text style={styles.eyebrow}>Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
            {recent.length ? recent.map((number, index) => {
              const pocketColor = getNumberColor(number);
              return (
                <View
                  accessibilityLabel={`Recent result ${number}, ${pocketColor}`}
                  key={`${number}-${index}`}
                  style={[
                    styles.recentBall,
                    { backgroundColor: pocketColor === 'green' ? colors.mintDark : pocketColor === 'red' ? colors.red : colors.rouletteBlack },
                  ]}
                >
                  <Text style={styles.recentNumber}>{number}</Text>
                </View>
              );
            }) : <Text style={styles.emptyRecent}>Results appear here</Text>}
          </ScrollView>
        </View>

        <View style={styles.betBoard}>
          <View style={styles.boardHeading}>
            <Text style={styles.eyebrow}>Number board</Text>
            <Text style={styles.boardHint}>Swipe for 1–36</Text>
          </View>
          <View style={styles.numberBoardRow}>
            <Pressable
              accessibilityLabel={`Bet ${selectedChip} on zero`}
              disabled={spinning}
              onPress={() => placeBet({ type: 'straight', number: 0 })}
              style={({ pressed }) => [styles.zeroButton, pressed && styles.betPressed]}
            >
              <Text style={styles.coloredBetText}>0</Text>
              <StakeBadge amount={stakeFor({ type: 'straight', number: 0 })} />
            </Pressable>
            <ScrollView
              contentContainerStyle={styles.numberColumns}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
            >
              {Array.from({ length: 12 }, (_, column) => (
                <View key={column} style={styles.numberColumn}>
                  {[column * 3 + 1, column * 3 + 2, column * 3 + 3].map((number) => {
                    const pocketColor = getNumberColor(number);
                    const selection: BetSelection = { type: 'straight', number };
                    return (
                      <Pressable
                        accessibilityLabel={`Bet ${selectedChip} on number ${number}, ${pocketColor}`}
                        disabled={spinning}
                        key={number}
                        onPress={() => placeBet(selection)}
                        style={({ pressed }) => [
                          styles.numberButton,
                          pocketColor === 'red' ? styles.redNumber : styles.blackNumber,
                          pressed && styles.betPressed,
                        ]}
                      >
                        <Text style={styles.coloredBetText}>{number}</Text>
                        <StakeBadge amount={stakeFor(selection)} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.outsideGrid}>
            {OUTSIDE_BETS.map(({ label, selection, tone }) => (
              <Pressable
                accessibilityLabel={`Bet ${selectedChip} on ${label}`}
                disabled={spinning}
                key={label}
                onPress={() => placeBet(selection)}
                style={({ pressed }) => [
                  styles.outsideButton,
                  tone === 'red' && styles.redOutside,
                  tone === 'black' && styles.blackOutside,
                  pressed && styles.betPressed,
                ]}
              >
                <Text style={[styles.outsideText, tone !== 'plain' && styles.coloredBetText]}>{label}</Text>
                <StakeBadge amount={stakeFor(selection)} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <LinearGradient
        colors={gradients.surface}
        style={[styles.controlPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.panelHandle} />
        <View style={styles.chipRow}>
          <View style={styles.chipList}>
            {CHIP_VALUES.map((value) => (
              <Chip
                disabled={spinning}
                key={value}
                onPress={() => setSelectedChip(value)}
                selected={selectedChip === value}
                value={value}
              />
            ))}
          </View>
          <View style={styles.totalWrap}>
            <Text style={styles.eyebrow}>Total bet</Text>
            <Text accessibilityLabel={`Total bet ${formatCoins(totalBet)} coins`} style={styles.totalBet}>{formatCoins(totalBet)}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <ClayIconButton
            accessibilityLabel="Clear roulette bets"
            disabled={spinning || bets.length === 0}
            name="trash-outline"
            onPress={clearBets}
            size={54}
          />
          <ClayIconButton
            accessibilityLabel="Repeat previous roulette bets"
            disabled={spinning || lastBets.length === 0}
            name="refresh"
            onPress={repeatBets}
            size={54}
          />
          <ClayButton
            accessibilityLabel="Roulette Spin"
            disabled={spinning || totalBet <= 0}
            height={54}
            label={spinning ? 'Spinning…' : 'Spin'}
            loading={spinning}
            onPress={spinWheel}
            style={styles.spinButton}
          />
        </View>
      </LinearGradient>
    </Screen>
  );
}

export default RouletteGameScreen;

const styles = StyleSheet.create({
  scroller: { flex: 1 },
  content: { alignItems: 'center', paddingBottom: 16 },
  headerDisabled: { opacity: 0.62 },
  wheelStage: { alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' },
  wheelShadow: { alignItems: 'center', justifyContent: 'center', ...clayShadow('rgba(84,64,170,0.42)', 10) },
  wheelRim: { alignItems: 'center', borderRadius: radius.pill, borderTopColor: '#FFFFFF', borderTopWidth: 3, flex: 1, justifyContent: 'center', overflow: 'hidden', width: '100%' },
  ball: { backgroundColor: '#F8F5FF', borderColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, height: 18, position: 'absolute', width: 18, ...clayShadow('rgba(20,15,60,0.55)', 4) },
  pointer: { borderLeftColor: 'transparent', borderLeftWidth: 10, borderRightColor: 'transparent', borderRightWidth: 10, borderTopColor: colors.coral, borderTopWidth: 17, height: 0, position: 'absolute', top: 0, width: 0 },
  hub: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.38)', borderRadius: radius.pill, borderWidth: 3, justifyContent: 'center', position: 'absolute', ...clayShadow('rgba(32,18,75,0.48)', 6) },
  resultBall: { alignItems: 'center', borderRadius: radius.pill, borderTopColor: 'rgba(255,255,255,0.82)', borderTopWidth: 2, justifyContent: 'center' },
  resultNumber: { color: '#A66D12', fontFamily: typography.display, lineHeight: 32 },
  statusPill: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: radius.pill, flexDirection: 'row', gap: 8, maxWidth: 340, minHeight: 38, paddingHorizontal: 16 },
  statusDot: { backgroundColor: colors.primary, borderRadius: 5, height: 9, width: 9 },
  statusText: { color: colors.textMuted, flexShrink: 1, fontFamily: typography.uiExtra, fontSize: 13 },
  recentRow: { alignItems: 'center', flexDirection: 'row', marginTop: 12, paddingHorizontal: 20, width: '100%' },
  eyebrow: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 10.5, letterSpacing: 0.7, textTransform: 'uppercase' },
  recentList: { alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  recentBall: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.48)', borderRadius: 17, borderTopWidth: 2, height: 34, justifyContent: 'center', width: 34, ...clayShadow('rgba(40,30,80,0.24)', 3) },
  recentNumber: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 12 },
  emptyRecent: { color: colors.textFaint, fontFamily: typography.uiBold, fontSize: 12 },
  betBoard: { backgroundColor: colors.surface, borderRadius: radius.card, marginHorizontal: 16, marginTop: 12, maxWidth: 430, padding: 12, width: '92%', ...clayShadow('rgba(84,64,170,0.17)', 5) },
  boardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  boardHint: { color: colors.textFaint, fontFamily: typography.uiBold, fontSize: 11 },
  numberBoardRow: { flexDirection: 'row', gap: 5 },
  numberColumns: { gap: 5, paddingRight: 2 },
  numberColumn: { gap: 5 },
  numberButton: { alignItems: 'center', borderRadius: 10, height: 39, justifyContent: 'center', width: 43 },
  zeroButton: { alignItems: 'center', backgroundColor: colors.mintDark, borderRadius: 12, height: 127, justifyContent: 'center', width: 43 },
  redNumber: { backgroundColor: colors.red },
  blackNumber: { backgroundColor: colors.rouletteBlack },
  coloredBetText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 13 },
  stakeBadge: { alignItems: 'center', backgroundColor: colors.yellow, borderColor: '#FFFFFF', borderRadius: 8, borderWidth: 1.5, height: 17, justifyContent: 'center', minWidth: 17, paddingHorizontal: 3, position: 'absolute', right: -4, top: -5, zIndex: 2 },
  stakeBadgeText: { color: '#7A4F00', fontFamily: typography.uiBlack, fontSize: 7.5 },
  outsideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  outsideButton: { alignItems: 'center', backgroundColor: colors.surfaceLavender, borderRadius: 13, flexBasis: '31%', flexGrow: 1, height: 41, justifyContent: 'center' },
  redOutside: { backgroundColor: colors.red },
  blackOutside: { backgroundColor: colors.rouletteBlack },
  outsideText: { color: colors.inkPurple, fontFamily: typography.uiBlack, fontSize: 12.5 },
  betPressed: { opacity: 0.76, transform: [{ scale: 0.96 }, { translateY: 1 }] },
  controlPanel: { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, paddingHorizontal: 20, paddingTop: 9, ...clayShadow('rgba(84,64,170,0.28)', 9) },
  panelHandle: { alignSelf: 'center', backgroundColor: '#DDD7F0', borderRadius: 3, height: 5, marginBottom: 9, width: 44 },
  chipRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  chipList: { flex: 1, flexDirection: 'row', gap: 5 },
  totalWrap: { alignItems: 'flex-end', marginLeft: 12 },
  totalBet: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 19, marginTop: 1 },
  actionRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  spinButton: { flex: 1 },
});
