import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BetControl } from '@/components/BetControl';
import { ClayIconButton } from '@/components/ClayIconButton';
import { GameHeader } from '@/components/GameHeader';
import { Screen } from '@/components/Screen';
import {
  SLOT_PAYTABLE,
  SYMBOLS,
  spinSlots,
  type ReelResult,
  type SlotSpinResult,
  type SlotSymbol,
} from '@/games/slots/engine';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';
import { soundManager } from '@/utils/sound';

const STARTING_REELS: ReelResult = ['7', 'heart', 'diamond'];
const MAX_AUTO_SPINS = 20;

type PendingSpin = {
  id: number;
  roundId: string;
  result: SlotSpinResult;
  settled: boolean;
};

const SYMBOL_LABELS: Readonly<Record<SlotSymbol, string>> = {
  '7': 'Seven',
  heart: 'Heart',
  diamond: 'Diamond',
  star: 'Star',
  bell: 'Bell',
  cherry: 'Cherry',
  crown: 'Crown',
};

const SYMBOL_COLORS: Readonly<Record<SlotSymbol, string>> = {
  '7': colors.red,
  heart: colors.pinkDark,
  diamond: colors.blueDark,
  star: colors.yellowDark,
  bell: colors.coralDark,
  cherry: colors.red,
  crown: colors.primaryDark,
};

function SymbolArt({ symbol, muted = false, large = false }: { symbol: SlotSymbol; muted?: boolean; large?: boolean }) {
  const color = muted ? '#C9C2E0' : SYMBOL_COLORS[symbol];
  const size = large ? 47 : 22;
  if (symbol === '7') {
    return <Text style={[styles.seven, { color, fontSize: large ? 52 : 25 }]}>{symbol}</Text>;
  }
  const iconName = symbol === 'heart'
    ? 'heart'
    : symbol === 'diamond'
      ? 'diamond'
      : symbol === 'star'
        ? 'star'
        : symbol === 'bell'
          ? 'notifications'
          : symbol === 'cherry'
            ? 'nutrition'
            : 'trophy';
  return <Ionicons color={color} name={iconName} size={size} />;
}

function ReelWindow({
  symbol,
  spinning,
  stopped,
  reducedMotion,
}: {
  symbol: SlotSymbol;
  spinning: boolean;
  stopped: boolean;
  reducedMotion: boolean;
}) {
  const shift = useSharedValue(0);
  const scale = useSharedValue(1);
  const symbolIndex = SYMBOLS.indexOf(symbol);
  const previous = SYMBOLS[(symbolIndex - 1 + SYMBOLS.length) % SYMBOLS.length]!;
  const next = SYMBOLS[(symbolIndex + 1) % SYMBOLS.length]!;

  useEffect(() => {
    if (reducedMotion) {
      shift.value = 0;
      scale.value = 1;
      return;
    }
    if (spinning && !stopped) {
      shift.value = -9;
      shift.value = withTiming(0, { duration: 75, easing: Easing.linear });
    } else if (stopped) {
      scale.value = withSequence(
        withTiming(1.09, { duration: 80 }),
        withSpring(1, { damping: 11, stiffness: 250 }),
      );
    }
  }, [reducedMotion, scale, shift, spinning, stopped, symbol]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shift.value }, { scale: scale.value }],
  }));

  return (
    <View accessibilityLabel={`Reel showing ${SYMBOL_LABELS[symbol]}`} style={styles.reelWindow}>
      <View style={styles.paylineMark} />
      <Animated.View style={[styles.reelStrip, animatedStyle]}>
        <View style={styles.ghostSymbol}><SymbolArt muted symbol={previous} /></View>
        <View style={styles.mainSymbol}><SymbolArt large symbol={symbol} /></View>
        <View style={styles.ghostSymbol}><SymbolArt muted symbol={next} /></View>
      </Animated.View>
    </View>
  );
}

const PARTICLES = [
  { dx: -132, dy: -68, delay: 0 },
  { dx: -96, dy: -112, delay: 90 },
  { dx: -52, dy: -90, delay: 180 },
  { dx: 0, dy: -122, delay: 60 },
  { dx: 54, dy: -94, delay: 210 },
  { dx: 100, dy: -110, delay: 120 },
  { dx: 134, dy: -62, delay: 20 },
  { dx: -118, dy: 22, delay: 150 },
  { dx: 116, dy: 26, delay: 240 },
] as const;

function CelebrationParticle({ dx, dy, delay }: (typeof PARTICLES)[number]) {
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.value = withDelay(delay, withTiming(1, { duration: 920, easing: Easing.out(Easing.cubic) }));
  }, [delay, travel]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - travel.value,
    transform: [
      { translateX: dx * travel.value },
      { translateY: dy * travel.value },
      { rotate: `${travel.value * 240}deg` },
      { scale: 0.7 + travel.value * 0.55 },
    ],
  }));
  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Text style={styles.particleText}>C</Text>
    </Animated.View>
  );
}

function JackpotBurst({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={styles.burstLayer}>
      {PARTICLES.map((particle, index) => <CelebrationParticle key={index} {...particle} />)}
    </View>
  );
}

export function SlotsGameScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, debit, completeGame, haptic, showToast } = useAppStore();
  const compact = width < 365;
  const [bet, setBet] = useState(50);
  const [reels, setReels] = useState<ReelResult>(STARTING_REELS);
  const [stoppedReels, setStoppedReels] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const mountedRef = useRef(true);
  const spinLockRef = useRef(false);
  const transactionRef = useRef(0);
  const pendingRef = useRef<PendingSpin | null>(null);
  const autoSpinRef = useRef(false);
  const autoCountRef = useRef(0);
  const nextAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startSpinRef = useRef<(fromAuto?: boolean) => void>(() => undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (nextAutoTimerRef.current) clearTimeout(nextAutoTimerRef.current);
    };
  }, []);

  const updateReel = useCallback((index: number, symbol: SlotSymbol) => {
    if (!mountedRef.current) return;
    setReels((current) => {
      const next: [SlotSymbol, SlotSymbol, SlotSymbol] = [current[0], current[1], current[2]];
      next[index] = symbol;
      return next;
    });
  }, []);

  const setAutoMode = useCallback((value: boolean) => {
    if (spinning) return;
    autoSpinRef.current = value;
    setAutoSpin(value);
    autoCountRef.current = 0;
    if (!value && nextAutoTimerRef.current) {
      clearTimeout(nextAutoTimerRef.current);
      nextAutoTimerRef.current = null;
      setAutoWaiting(false);
    }
    haptic('selection');
  }, [haptic, spinning]);

  const startSpin = useCallback((fromAuto = false) => {
    if (spinLockRef.current || spinning) return;
    if (fromAuto && !autoSpinRef.current) return;
    spinLockRef.current = true;
    setAutoWaiting(false);
    const storeRoundId = debit(bet, 'slots');
    if (!storeRoundId) {
      spinLockRef.current = false;
      autoSpinRef.current = false;
      if (mountedRef.current) {
        setAutoSpin(false);
        setAutoWaiting(false);
      }
      return;
    }

    // Weighted symbols and the paytable result are fixed before any reel moves.
    const result = spinSlots(bet);
    const id = ++transactionRef.current;
    pendingRef.current = { id, roundId: storeRoundId, result, settled: false };
    if (!fromAuto) autoCountRef.current = 0;
    setSpinning(true);
    setLastResult(null);
    setStoppedReels([false, false, false]);

    const reduced = state.settings.reducedMotion;
    const stopDelays = reduced ? [90, 165, 240] : [760, 1_100, 1_470];
    const startedAt = Date.now();

    stopDelays.forEach((stopDelay, reelIndex) => {
      const tick = () => {
        if (!mountedRef.current) return;
        const elapsed = Date.now() - startedAt;
        if (elapsed >= stopDelay) {
          updateReel(reelIndex, result.symbols[reelIndex]!);
          setStoppedReels((current) => current.map((value, index) => index === reelIndex ? true : value));
          soundManager.play('slotStop', state.settings.sound);
          haptic('light');
          return;
        }
        const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
        updateReel(reelIndex, randomSymbol);
        const progress = elapsed / stopDelay;
        const nextTick = reduced ? 34 : 42 + Math.round(145 * progress ** 3);
        setTimeout(tick, Math.min(nextTick, Math.max(1, stopDelay - elapsed)));
      };
      tick();
    });

    const settleAfter = stopDelays[2]! + (reduced ? 45 : 160);
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
        game: 'slots',
        bet: outcome.bet,
        payout: outcome.payout,
        detail: outcome.isJackpot
          ? 'triple-seven'
          : `${outcome.symbols.join('-')} · ${outcome.multiplier}×`,
      });
      soundManager.play(outcome.isWin ? 'win' : 'lose', state.settings.sound);
      spinLockRef.current = false;
      autoCountRef.current += 1;

      if (outcome.isJackpot) showToast(`Jackpot! +${formatCoins(outcome.payout)}`);
      if (!mountedRef.current) return;
      setReels(outcome.symbols);
      setStoppedReels([true, true, true]);
      setLastResult(outcome);
      setSpinning(false);

      if (!autoSpinRef.current) return;
      if (outcome.isWin) {
        autoSpinRef.current = false;
        setAutoSpin(false);
        showToast(outcome.isJackpot ? 'Auto Spin stopped on jackpot' : 'Auto Spin stopped on a win');
        return;
      }
      if (autoCountRef.current >= MAX_AUTO_SPINS) {
        autoSpinRef.current = false;
        setAutoSpin(false);
        showToast(`Auto Spin finished ${MAX_AUTO_SPINS} spins`);
        return;
      }
      setAutoWaiting(true);
      nextAutoTimerRef.current = setTimeout(() => {
        nextAutoTimerRef.current = null;
        if (!mountedRef.current || !autoSpinRef.current) return;
        setAutoWaiting(false);
        startSpinRef.current(true);
      }, reduced ? 180 : 620);
    }, settleAfter);
  }, [bet, completeGame, debit, haptic, showToast, spinning, state.settings.reducedMotion, state.settings.sound, updateReel]);

  startSpinRef.current = startSpin;

  const jackpot = Boolean(lastResult?.isJackpot && !spinning);
  const status = spinning
    ? 'Reels in motion…'
    : autoWaiting
      ? `Auto Spin ${Math.min(autoCountRef.current + 1, MAX_AUTO_SPINS)} of ${MAX_AUTO_SPINS}`
      : lastResult
        ? lastResult.isWin
          ? `${lastResult.matchedCount === 3 ? 'Triple match' : 'Pair'} · +${formatCoins(lastResult.payout)}`
          : 'No match · spin again'
        : 'Spin to play · 3 reels · 1 line';

  return (
    <Screen bottomInset={0}>
      <View pointerEvents={spinning ? 'none' : 'auto'} style={spinning && styles.headerDisabled}>
        <GameHeader title="Clay Reels" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroller}>
        <View style={[styles.machineWrap, { maxWidth: Math.min(430, width - 28) }]}>
          <LinearGradient
            colors={jackpot ? gradients.gold : gradients.pink}
            style={[styles.machine, compact && styles.machineCompact, jackpot && styles.jackpotMachine]}
          >
            {jackpot && <JackpotBurst reducedMotion={state.settings.reducedMotion} />}
            <View style={[styles.machineLabel, jackpot && styles.jackpotLabel]}>
              <Text style={[styles.machineLabelText, jackpot && styles.jackpotLabelText]}>
                {jackpot ? 'TRIPLE SEVEN' : '3 REELS · 1 LINE'}
              </Text>
            </View>
            <View style={[styles.reelsRow, compact && styles.reelsRowCompact]}>
              {reels.map((symbol, index) => (
                <ReelWindow
                  key={index}
                  reducedMotion={state.settings.reducedMotion}
                  spinning={spinning}
                  stopped={stoppedReels[index] ?? false}
                  symbol={symbol}
                />
              ))}
            </View>
            <View style={styles.sideLightLeft} />
            <View style={styles.sideLightRight} />
          </LinearGradient>
        </View>

        {jackpot && lastResult ? (
          <View
            accessibilityLabel={`Jackpot, won ${formatCoins(lastResult.payout)} coins`}
            accessibilityLiveRegion="polite"
            style={styles.jackpotCopy}
          >
            <Text style={styles.jackpotTitle}>Jackpot!</Text>
            <LinearGradient colors={gradients.mint} style={styles.jackpotPayout}>
              <View style={styles.miniCoin}><Text style={styles.miniCoinText}>C</Text></View>
              <Text style={styles.jackpotPayoutText}>+{formatCoins(lastResult.payout)}</Text>
            </LinearGradient>
            <Text style={styles.jackpotNote}>100× your {formatCoins(lastResult.bet)} coin stake</Text>
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" style={styles.statusPill}>
            {spinning && <ActivityIndicator color={colors.primaryDark} size="small" />}
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </ScrollView>

      <LinearGradient
        colors={gradients.surface}
        style={[styles.controlPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <BetControl
          disabled={spinning || autoWaiting}
          label="Bet per spin"
          max={5_000}
          min={10}
          onChange={setBet}
          step={10}
          value={bet}
        />
        <View style={styles.footerActions}>
          <View style={styles.secondaryActions}>
            <Pressable
              accessibilityLabel="Auto Spin, stops on a win or after 20 spins"
              accessibilityRole="switch"
              accessibilityState={{ checked: autoSpin, disabled: spinning }}
              disabled={spinning}
              onPress={() => setAutoMode(!autoSpin)}
              style={({ pressed }) => [styles.autoRow, pressed && styles.pressedControl]}
            >
              <View>
                <Text style={styles.controlLabel}>Auto Spin</Text>
                <Text style={styles.controlHint}>Stops on win · max 20</Text>
              </View>
              <View style={[styles.toggleTrack, autoSpin && styles.toggleTrackOn]}>
                <View style={[styles.toggleKnob, autoSpin && styles.toggleKnobOn]} />
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel="Open slots paytable"
              disabled={spinning}
              onPress={() => setPaytableOpen(true)}
              style={({ pressed }) => [styles.paytableButton, pressed && styles.pressedControl, spinning && styles.disabledControl]}
            >
              <Ionicons color={colors.inkPurple} name="list" size={18} />
              <Text style={styles.controlLabel}>Paytable</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="Slots Spin"
            accessibilityRole="button"
            disabled={spinning || autoWaiting}
            onPress={() => startSpin(false)}
            style={({ pressed }) => [
              styles.spinOuter,
              pressed && styles.spinPressed,
              (spinning || autoWaiting) && styles.spinDisabled,
            ]}
          >
            <LinearGradient colors={gradients.primary} style={styles.spinInner}>
              {spinning || autoWaiting
                ? <ActivityIndicator color={colors.surface} />
                : <Ionicons color={colors.surface} name="refresh" size={24} />}
              <Text style={styles.spinLabel}>{spinning ? 'Wait' : autoWaiting ? 'Auto' : 'Spin'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>

      <Modal
        animationType={state.settings.reducedMotion ? 'none' : 'slide'}
        onRequestClose={() => setPaytableOpen(false)}
        statusBarTranslucent
        transparent
        visible={paytableOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close paytable" onPress={() => setPaytableOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={[styles.paytableSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.paytableHeader}>
              <View>
                <Text style={styles.paytableEyebrow}>Clay Reels</Text>
                <Text style={styles.paytableTitle}>Paytable</Text>
              </View>
              <ClayIconButton accessibilityLabel="Close paytable" name="close" onPress={() => setPaytableOpen(false)} />
            </View>
            <ScrollView contentContainerStyle={styles.paytableRows} showsVerticalScrollIndicator={false}>
              {SLOT_PAYTABLE.map((row) => (
                <View key={row.label} style={styles.paytableRow}>
                  <View style={styles.paytableSymbols}>
                    {row.symbols === 'any-pair'
                      ? <Text style={styles.pairMark}>2×</Text>
                      : row.symbols.map((symbol, index) => <SymbolArt key={index} symbol={symbol} />)}
                  </View>
                  <Text style={styles.paytableName}>{row.label}</Text>
                  <Text style={styles.paytableMultiplier}>{row.multiplier}×</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export default SlotsGameScreen;

const styles = StyleSheet.create({
  scroller: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 14, paddingTop: 20, paddingBottom: 18 },
  headerDisabled: { opacity: 0.62 },
  machineWrap: { width: '100%', ...clayShadow('rgba(190,50,110,0.42)', 11) },
  machine: { borderRadius: 32, borderTopColor: 'rgba(255,255,255,0.52)', borderTopWidth: 3, overflow: 'visible', paddingBottom: 20, paddingHorizontal: 18, paddingTop: 18 },
  machineCompact: { paddingHorizontal: 12 },
  jackpotMachine: { borderColor: 'rgba(255,226,132,0.8)', borderWidth: 4, ...clayShadow('rgba(180,110,10,0.5)', 13) },
  machineLabel: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: radius.pill, marginBottom: 14, paddingHorizontal: 16, paddingVertical: 6 },
  jackpotLabel: { backgroundColor: 'rgba(255,255,255,0.68)' },
  machineLabelText: { color: '#A81E5E', fontFamily: typography.uiBlack, fontSize: 11, letterSpacing: 1 },
  jackpotLabelText: { color: '#966000' },
  reelsRow: { flexDirection: 'row', gap: 10, height: 150 },
  reelsRowCompact: { gap: 7 },
  reelWindow: { alignItems: 'center', backgroundColor: '#F3EDFB', borderBottomColor: 'rgba(255,255,255,0.88)', borderBottomWidth: 3, borderRadius: 19, flex: 1, justifyContent: 'center', overflow: 'hidden', shadowColor: '#6D5A99', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 7 },
  reelStrip: { alignItems: 'center', height: 140, justifyContent: 'space-between', paddingVertical: 7 },
  ghostSymbol: { alignItems: 'center', height: 29, justifyContent: 'center', opacity: 0.58 },
  mainSymbol: { alignItems: 'center', height: 60, justifyContent: 'center' },
  seven: { fontFamily: typography.display, lineHeight: 56 },
  paylineMark: { backgroundColor: 'rgba(143,124,247,0.13)', height: 62, left: 0, position: 'absolute', right: 0, top: 44 },
  sideLightLeft: { backgroundColor: colors.yellow, borderRadius: 6, height: 11, left: 6, position: 'absolute', top: '58%', width: 11, ...clayShadow('rgba(130,80,0,0.3)', 2) },
  sideLightRight: { backgroundColor: colors.yellow, borderRadius: 6, height: 11, position: 'absolute', right: 6, top: '58%', width: 11, ...clayShadow('rgba(130,80,0,0.3)', 2) },
  statusPill: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: radius.pill, flexDirection: 'row', gap: 9, marginTop: 22, minHeight: 42, paddingHorizontal: 20 },
  statusText: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 13, textAlign: 'center' },
  jackpotCopy: { alignItems: 'center', marginTop: 17 },
  jackpotTitle: { color: colors.text, fontFamily: typography.display, fontSize: 38, lineHeight: 44 },
  jackpotPayout: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 9, marginTop: 4, paddingHorizontal: 21, paddingVertical: 10, ...clayShadow('rgba(15,150,115,0.42)', 7) },
  jackpotPayoutText: { color: colors.surface, fontFamily: typography.display, fontSize: 27 },
  miniCoin: { alignItems: 'center', backgroundColor: colors.yellowDark, borderColor: '#FFE9AE', borderRadius: 15, borderWidth: 3, height: 30, justifyContent: 'center', width: 30 },
  miniCoinText: { color: '#A66D12', fontFamily: typography.display, fontSize: 13 },
  jackpotNote: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 13, marginTop: 8 },
  burstLayer: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, overflow: 'visible', position: 'absolute', right: 0, top: 0, zIndex: 4 },
  particle: { alignItems: 'center', backgroundColor: colors.yellowDark, borderColor: '#FFE9AE', borderRadius: 8, borderWidth: 2, height: 16, justifyContent: 'center', position: 'absolute', width: 16 },
  particleText: { color: '#A66D12', fontFamily: typography.uiBlack, fontSize: 7 },
  controlPanel: { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, paddingHorizontal: 20, paddingTop: 17, ...clayShadow('rgba(84,64,170,0.28)', 9) },
  footerActions: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 14 },
  secondaryActions: { flex: 1, gap: 8 },
  autoRow: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: 17, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 13 },
  paytableButton: { alignItems: 'center', backgroundColor: colors.inset, borderRadius: 17, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 14 },
  controlLabel: { color: colors.inkPurple, fontFamily: typography.uiExtra, fontSize: 13 },
  controlHint: { color: colors.textFaint, fontFamily: typography.uiBold, fontSize: 9.5, marginTop: 1 },
  toggleTrack: { backgroundColor: '#DCD5F2', borderRadius: 14, height: 26, padding: 3, width: 47 },
  toggleTrackOn: { backgroundColor: colors.mintDark },
  toggleKnob: { backgroundColor: colors.surface, borderRadius: 10, height: 20, width: 20, ...clayShadow('rgba(60,45,115,0.22)', 2) },
  toggleKnobOn: { transform: [{ translateX: 21 }] },
  pressedControl: { opacity: 0.74, transform: [{ scale: 0.98 }] },
  disabledControl: { opacity: 0.46 },
  spinOuter: { backgroundColor: colors.primaryEdge, borderRadius: 57, height: 110, paddingBottom: 5, width: 110, ...clayShadow('rgba(120,90,240,0.48)', 10) },
  spinInner: { alignItems: 'center', borderRadius: 55, borderTopColor: 'rgba(255,255,255,0.48)', borderTopWidth: 3, flex: 1, justifyContent: 'center' },
  spinLabel: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 16, marginTop: 1 },
  spinPressed: { opacity: 0.84, transform: [{ translateY: 3 }, { scale: 0.96 }] },
  spinDisabled: { opacity: 0.48 },
  modalRoot: { backgroundColor: 'rgba(28,22,53,0.36)', flex: 1, justifyContent: 'flex-end' },
  paytableSheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, maxHeight: '78%', paddingHorizontal: 20, paddingTop: 18, ...clayShadow('rgba(35,24,82,0.4)', 12) },
  paytableHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  paytableEyebrow: { color: colors.pinkDark, fontFamily: typography.uiBlack, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  paytableTitle: { color: colors.text, fontFamily: typography.display, fontSize: 30, lineHeight: 34 },
  paytableRows: { gap: 8, paddingBottom: 8 },
  paytableRow: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 17, flexDirection: 'row', minHeight: 54, paddingHorizontal: 14 },
  paytableSymbols: { alignItems: 'center', flexDirection: 'row', gap: 2, width: 82 },
  paytableName: { color: colors.text, flex: 1, fontFamily: typography.uiExtra, fontSize: 13 },
  paytableMultiplier: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 17 },
  pairMark: { color: colors.primaryDark, fontFamily: typography.display, fontSize: 22 },
});
