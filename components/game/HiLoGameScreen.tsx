import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  cashOutHiLo,
  getHiLoOdds,
  guessHiLo,
  startHiLo,
  type HiLoPrediction,
  type HiLoState,
} from '@/games/quick/hilo';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

export function HiLoGameScreen() {
  const { state: appState, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [game, setGame] = useState<HiLoState | null>(null);
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

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + motion.value * 0.65,
    transform: [
      { perspective: 650 },
      { rotateY: `${(1 - motion.value) * 105}deg` },
      { scale: 0.88 + motion.value * 0.12 },
    ],
  }));

  const active = game?.status === 'active';
  const higherOdds = useMemo(
    () => active && game ? getHiLoOdds(game, 'higher') : null,
    [active, game],
  );
  const lowerOdds = useMemo(
    () => active && game ? getHiLoOdds(game, 'lower') : null,
    [active, game],
  );

  const animate = (duration: number, roundId: string, onDone: () => void) => {
    motion.value = 0;
    motion.value = withTiming(1, { duration, easing: Easing.out(Easing.back(1.1)) });
    const handle = setTimeout(() => {
      if (activeRoundRef.current !== roundId) return;
      onDone();
      if (timeoutRef.current === handle) timeoutRef.current = null;
    }, duration + 24);
    timeoutRef.current = handle;
  };

  const settle = (terminal: HiLoState, roundId: string) => {
    if (activeRoundRef.current !== roundId || settledRef.current) return;
    settledRef.current = true;
    completeGame({
      roundId,
      game: 'hilo',
      bet: terminal.bet,
      payout: terminal.payout,
      result: terminal.payout > terminal.bet ? 'win' : terminal.payout === terminal.bet ? 'push' : 'loss',
      detail: `${terminal.correctGuesses} correct · ${terminal.multiplier.toFixed(2)}×`,
    });
    activeRoundRef.current = null;
  };

  const start = () => {
    if (busyRef.current || active) return;
    busyRef.current = true;
    const roundId = debit(bet, 'hilo');
    if (!roundId) {
      busyRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;

    const next = startHiLo(bet);
    const duration = appState.settings.reducedMotion ? 140 : 480;
    settledRef.current = false;
    setBusy(true);
    setGame(next);
    animate(duration, roundId, () => {
      busyRef.current = false;
      setBusy(false);
    });
  };

  const guess = (prediction: HiLoPrediction) => {
    const roundId = activeRoundRef.current;
    if (busyRef.current || !game || game.status !== 'active' || !roundId) return;

    const next = guessHiLo(game, prediction);
    const duration = appState.settings.reducedMotion ? 150 : 560;
    busyRef.current = true;
    setBusy(true);
    setGame(next);
    animate(duration, roundId, () => {
      if (next.status !== 'active') settle(next, roundId);
      busyRef.current = false;
      setBusy(false);
    });
  };

  const cashOut = () => {
    const roundId = activeRoundRef.current;
    if (busyRef.current || !game || game.status !== 'active' || game.correctGuesses === 0 || !roundId) return;

    const next = cashOutHiLo(game);
    const duration = appState.settings.reducedMotion ? 100 : 260;
    busyRef.current = true;
    setBusy(true);
    setGame(next);
    animate(duration, roundId, () => {
      settle(next, roundId);
      busyRef.current = false;
      setBusy(false);
    });
  };

  const chance = (value?: number) => `${Math.round((value ?? 0) * 100)}%`;
  const cashOutValue = game ? Math.floor(game.bet * game.multiplier) : 0;
  const resultText = busy
    ? game?.status === 'cashed-out'
      ? 'Locking in your return…'
      : game?.lastPrediction
        ? 'Turning the next card…'
        : 'Cutting the deck…'
    : game?.status === 'lost'
      ? `${game.currentCard.rank} ended the run · ${game.correctGuesses} correct`
      : game?.status === 'cashed-out'
        ? game.profit > 0
          ? `Cashed out · +${formatCoins(Math.floor(game.profit))} profit (${formatCoins(Math.floor(game.payout))} returned)`
          : game.profit === 0
            ? 'Cashed out · stake returned, no profit'
            : `Cashed out · ${formatCoins(Math.abs(Math.floor(game.profit)))} loss`
        : game?.status === 'completed'
          ? game.profit > 0
            ? `Deck cleared · +${formatCoins(Math.floor(game.profit))} profit`
            : game.profit === 0
              ? 'Deck cleared · stake returned, no profit'
              : `Deck cleared · ${formatCoins(Math.abs(Math.floor(game.profit)))} loss`
          : game && game.correctGuesses > 0
            ? `${game.correctGuesses} correct · ${game.multiplier.toFixed(2)}× live multiplier`
            : game
              ? 'Will the next card be higher or lower? Ties lose.'
              : null;

  const board = (
    <View accessibilityLiveRegion={game && game.status !== 'active' && !busy ? 'polite' : 'none'} style={styles.boardContent}>
      <View style={styles.boardHeader}>
        <View>
          <Text style={styles.eyebrow}>CARD RUN</Text>
          <Text style={styles.streak}>{game ? `${game.correctGuesses} correct` : 'Start a streak'}</Text>
        </View>
        <View style={styles.multiplierPill}>
          <Text accessibilityLiveRegion={game && game.status !== 'active' ? 'polite' : 'none'} style={styles.multiplier}>{game?.multiplier.toFixed(2) ?? '1.00'}×</Text>
        </View>
      </View>

      <View style={styles.cardStage}>
        {game?.lastCard && (
          <View style={styles.previousCard}>
            <QuickPlayingCard card={game.lastCard} small />
            <Text style={styles.cardCaption}>PREVIOUS</Text>
          </View>
        )}
        {game?.lastCard && <Text style={styles.arrow}>→</Text>}
        {game ? (
          <Animated.View style={[styles.currentCard, cardStyle]}>
            <QuickPlayingCard card={game.currentCard} />
            <Text style={styles.cardCaption}>CURRENT</Text>
          </Animated.View>
        ) : (
          <View style={styles.mysteryCard}>
            <View style={styles.mysteryInset}><Text style={styles.question}>?</Text></View>
          </View>
        )}
      </View>

      <View style={styles.oddsStrip}>
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>LOWER</Text>
          <Text style={styles.oddsValue}>{active ? chance(lowerOdds?.chance) : '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.oddsItem}>
          <Text style={styles.oddsLabel}>HIGHER</Text>
          <Text style={styles.oddsValue}>{active ? chance(higherOdds?.chance) : '—'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <QuickGameFrame board={board} result={resultText} slug="hilo">
      <BetControl disabled={busy || active} onChange={setBet} step={10} value={bet} />
      {active ? (
        <>
          <View style={styles.options}>
            <OptionPill
              accessibilityLabel={`Guess lower, ${chance(lowerOdds?.chance)} chance`}
              disabled={busy || !lowerOdds?.winningCards}
              label={`Lower · ${chance(lowerOdds?.chance)}`}
              onPress={() => guess('lower')}
            />
            <OptionPill
              accessibilityLabel={`Guess higher, ${chance(higherOdds?.chance)} chance`}
              disabled={busy || !higherOdds?.winningCards}
              label={`Higher · ${chance(higherOdds?.chance)}`}
              onPress={() => guess('higher')}
            />
          </View>
          <ClayButton
            colors={gradients.mint}
            disabled={busy || game.correctGuesses === 0}
            edgeColor={colors.mintEdge}
            label={game.correctGuesses === 0 ? 'Win One to Cash Out' : `Cash Out · ${formatCoins(cashOutValue)}`}
            loading={busy}
            onPress={cashOut}
          />
        </>
      ) : (
        <ClayButton
          disabled={busy}
          label={busy ? 'Dealing…' : game ? 'New Run' : 'Deal First Card'}
          loading={busy}
          onPress={start}
        />
      )}
    </QuickGameFrame>
  );
}

export default HiLoGameScreen;

const styles = StyleSheet.create({
  boardContent: { alignItems: 'center', gap: 12, width: '100%' },
  boardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  eyebrow: { color: 'rgba(255,255,255,.68)', fontFamily: typography.uiBlack, fontSize: 9, letterSpacing: 1.6 },
  streak: { color: colors.surface, fontFamily: typography.display, fontSize: 20, lineHeight: 24 },
  multiplierPill: { backgroundColor: 'rgba(100,35,35,.18)', borderColor: 'rgba(255,255,255,.25)', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7 },
  multiplier: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 14 },
  cardStage: { alignItems: 'center', flexDirection: 'row', height: 140, justifyContent: 'center', width: '100%' },
  previousCard: { alignItems: 'center', opacity: 0.68, transform: [{ rotate: '-5deg' }, { scale: 0.88 }] },
  currentCard: { alignItems: 'center', transform: [{ rotate: '3deg' }] },
  cardCaption: { color: 'rgba(255,255,255,.76)', fontFamily: typography.uiBlack, fontSize: 8, letterSpacing: 1, marginTop: 7 },
  arrow: { color: 'rgba(255,255,255,.65)', fontFamily: typography.display, fontSize: 25, marginHorizontal: 16 },
  mysteryCard: { backgroundColor: '#F8F3FF', borderRadius: 15, height: 104, padding: 8, transform: [{ rotate: '3deg' }], width: 74 },
  mysteryInset: { alignItems: 'center', backgroundColor: 'rgba(221,81,86,.28)', borderRadius: 10, flex: 1, justifyContent: 'center' },
  question: { color: colors.coralDark, fontFamily: typography.display, fontSize: 34 },
  oddsStrip: { alignItems: 'center', backgroundColor: 'rgba(100,35,35,.14)', borderRadius: radius.control, flexDirection: 'row', minHeight: 58, width: '100%' },
  oddsItem: { alignItems: 'center', flex: 1 },
  oddsLabel: { color: 'rgba(255,255,255,.64)', fontFamily: typography.uiBlack, fontSize: 8.5, letterSpacing: 1.2 },
  oddsValue: { color: colors.surface, fontFamily: typography.display, fontSize: 20 },
  divider: { backgroundColor: 'rgba(255,255,255,.24)', height: 30, width: 1 },
  options: { flexDirection: 'row', gap: 9 },
});
