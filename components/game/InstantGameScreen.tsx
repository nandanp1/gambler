import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { GameArtwork } from '@/components/GameArtwork';
import { OptionPill } from '@/components/game/OptionPill';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { GAME_BY_SLUG } from '@/data/games';
import { playDiamonds, DIAMOND_COLORS, type DiamondColor } from '@/games/quick/diamonds';
import { getDiceOdds, playDice, type DiceDirection } from '@/games/quick/dice';
import { flipCoin, type CoinSide } from '@/games/quick/coinFlip';
import { playLimbo } from '@/games/quick/limbo';
import { playLuckyCups, type CupIndex } from '@/games/quick/luckyCups';
import { playRoshambo, ROSHAMBO_MOVES, type RoshamboMove } from '@/games/quick/roshambo';
import { useAppStore } from '@/store/AppStore';
import { colors, typography } from '@/theme';
import type { GameResult, GameSlug } from '@/types';
import { formatCoins } from '@/utils/format';

export type InstantGameSlug = 'dice' | 'limbo' | 'coin-flip' | 'diamonds' | 'roshambo' | 'lucky-cups';

interface InstantOutcome {
  payout: number;
  result: GameResult;
  title: string;
  detail: string;
  primaryValue: string;
}

const titleCase = (value: string) => value.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');

export function InstantGameScreen({ slug }: { slug: InstantGameSlug }) {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<InstantOutcome | null>(null);
  const [diceTarget, setDiceTarget] = useState(50);
  const [diceDirection, setDiceDirection] = useState<DiceDirection>('under');
  const [limboTarget, setLimboTarget] = useState(2);
  const [coinSide, setCoinSide] = useState<CoinSide>('heads');
  const [diamond, setDiamond] = useState<DiamondColor>('violet');
  const [move, setMove] = useState<RoshamboMove>('rock');
  const [cup, setCup] = useState<CupIndex>(1);
  const animation = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);

  useEffect(() => () => {
    activeRoundRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const diceOdds = useMemo(() => getDiceOdds(diceTarget, diceDirection), [diceDirection, diceTarget]);
  const reducedMotion = state.settings.reducedMotion;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateY: `${animation.value * 1080}deg` },
      { scale: 0.9 + Math.abs(0.5 - animation.value) * 0.2 },
    ],
  }));

  const generate = (): InstantOutcome => {
    if (slug === 'dice') {
      const value = playDice(bet, diceTarget, diceDirection);
      return { payout: value.payout, result: value.won ? 'win' : 'loss', title: value.won ? 'Nice roll!' : 'Missed it', detail: `${titleCase(diceDirection)} ${diceTarget.toFixed(2)} · ${value.multiplier.toFixed(2)}×`, primaryValue: value.roll.toFixed(2) };
    }
    if (slug === 'limbo') {
      const value = playLimbo(bet, limboTarget);
      return { payout: value.payout, result: value.won ? 'win' : 'loss', title: value.won ? 'Target cleared!' : 'Under the bar', detail: `Target ${limboTarget.toFixed(2)}×`, primaryValue: `${value.result.toFixed(2)}×` };
    }
    if (slug === 'coin-flip') {
      const value = flipCoin(bet, coinSide);
      return { payout: value.payout, result: value.won ? 'win' : 'loss', title: value.won ? 'You called it!' : 'Other side', detail: `You chose ${coinSide}`, primaryValue: titleCase(value.result) };
    }
    if (slug === 'diamonds') {
      const value = playDiamonds(bet, diamond);
      return { payout: value.payout, result: value.won ? 'win' : 'loss', title: value.won ? 'Perfect match!' : 'Different sparkle', detail: `You chose ${diamond}`, primaryValue: titleCase(value.result) };
    }
    if (slug === 'roshambo') {
      const value = playRoshambo(bet, move);
      return { payout: value.payout, result: value.outcome === 'tie' ? 'push' : value.outcome, title: value.outcome === 'win' ? 'You win!' : value.outcome === 'tie' ? 'Tie game' : 'Opponent wins', detail: `${titleCase(move)} vs ${titleCase(value.opponent)}`, primaryValue: titleCase(value.opponent) };
    }
    const value = playLuckyCups(bet, cup);
    return { payout: value.payout, result: value.won ? 'win' : 'loss', title: value.won ? 'Found it!' : 'Empty cup', detail: `Coin was under cup ${value.winningCup + 1}`, primaryValue: `Cup ${value.winningCup + 1}` };
  };

  const play = () => {
    if (startingRef.current || busy) return;
    startingRef.current = true;
    const roundId = debit(bet, slug);
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;
    const generated = generate();
    setOutcome(null);
    setBusy(true);
    animation.value = 0;
    animation.value = withTiming(1, { duration: reducedMotion ? 180 : 820, easing: Easing.out(Easing.cubic) });
    const handle = setTimeout(() => {
      if (activeRoundRef.current !== roundId) return;
      setOutcome(generated);
      setBusy(false);
      activeRoundRef.current = null;
      startingRef.current = false;
      completeGame({ roundId, game: slug, bet, payout: generated.payout, result: generated.result });
      if (timeoutRef.current === handle) timeoutRef.current = null;
    }, reducedMotion ? 200 : 840);
    timeoutRef.current = handle;
  };

  const options = slug === 'dice' ? (
    <>
      <View style={styles.options}><OptionPill disabled={busy} label="Roll Under" onPress={() => setDiceDirection('under')} selected={diceDirection === 'under'} /><OptionPill disabled={busy} label="Roll Over" onPress={() => setDiceDirection('over')} selected={diceDirection === 'over'} /></View>
      <View style={styles.stepRow}><Text style={styles.controlLabel}>Target</Text><OptionPill disabled={busy} label="−" onPress={() => setDiceTarget(Math.max(5, diceTarget - 5))} /><Text style={styles.stepValue}>{diceTarget.toFixed(2)}</Text><OptionPill disabled={busy} label="+" onPress={() => setDiceTarget(Math.min(95, diceTarget + 5))} /></View>
      <View style={styles.metrics}><Text style={styles.metric}>Chance <Text style={styles.metricValue}>{diceOdds.chance.toFixed(2)}%</Text></Text><Text style={styles.metric}>Payout <Text style={styles.metricValue}>{diceOdds.multiplier.toFixed(2)}×</Text></Text></View>
    </>
  ) : slug === 'limbo' ? (
    <View style={styles.stepRow}><Text style={styles.controlLabel}>Target</Text><OptionPill disabled={busy} label="−" onPress={() => setLimboTarget(Math.max(1.1, Number((limboTarget - 0.25).toFixed(2))))} /><Text style={styles.stepValue}>{limboTarget.toFixed(2)}×</Text><OptionPill disabled={busy} label="+" onPress={() => setLimboTarget(Math.min(100, Number((limboTarget + 0.25).toFixed(2))))} /></View>
  ) : slug === 'coin-flip' ? (
    <View style={styles.options}>{(['heads', 'tails'] as const).map((side) => <OptionPill disabled={busy} key={side} label={titleCase(side)} onPress={() => setCoinSide(side)} selected={coinSide === side} />)}</View>
  ) : slug === 'diamonds' ? (
    <View style={styles.wrapOptions}>{DIAMOND_COLORS.map((color) => <OptionPill disabled={busy} key={color} label={titleCase(color)} onPress={() => setDiamond(color)} selected={diamond === color} style={styles.thirdOption} />)}</View>
  ) : slug === 'roshambo' ? (
    <View style={styles.options}>{ROSHAMBO_MOVES.map((choice) => <OptionPill disabled={busy} key={choice} label={titleCase(choice)} onPress={() => setMove(choice)} selected={move === choice} />)}</View>
  ) : (
    <View style={styles.options}>{([0, 1, 2] as CupIndex[]).map((choice) => <OptionPill disabled={busy} key={choice} label={`Cup ${choice + 1}`} onPress={() => setCup(choice)} selected={cup === choice} />)}</View>
  );

  const board = (
    <Animated.View style={[styles.artWrap, animatedStyle]}>
      {outcome ? (
        <View accessibilityLiveRegion="polite" style={styles.outcomeArt}>
          <Text style={styles.primaryValue}>{outcome.primaryValue}</Text>
          <Text style={styles.outcomeTitle}>{outcome.title}</Text>
          {outcome.result === 'win' && <View style={styles.winPill}><Ionicons color={colors.text} name="sparkles" size={18} /><Text style={styles.winText}>+{formatCoins(outcome.payout)}</Text></View>}
        </View>
      ) : <GameArtwork art={GAME_BY_SLUG[slug].art} />}
    </Animated.View>
  );

  return (
    <QuickGameFrame board={board} result={outcome?.detail} slug={slug}>
      <BetControl disabled={busy} onChange={setBet} step={10} value={bet} />
      {options}
      <ClayButton disabled={busy} label={busy ? 'In motion…' : slug === 'dice' ? 'Roll Dice' : slug === 'limbo' ? 'Play Limbo' : 'Play'} loading={busy} onPress={play} />
    </QuickGameFrame>
  );
}

export default InstantGameScreen;

const styles = StyleSheet.create({
  artWrap: { alignItems: 'center', height: 250, justifyContent: 'center', width: '100%' },
  outcomeArt: { alignItems: 'center', justifyContent: 'center' },
  primaryValue: { color: colors.surface, fontFamily: typography.display, fontSize: 48, textShadowColor: 'rgba(45,25,90,.3)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 8 },
  outcomeTitle: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 17, marginTop: 6 },
  winPill: { alignItems: 'center', backgroundColor: colors.mintDark, borderRadius: 999, flexDirection: 'row', gap: 6, marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  winText: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 17 },
  options: { flexDirection: 'row', gap: 9 },
  wrapOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thirdOption: { flexBasis: '30%' },
  stepRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  controlLabel: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 11, letterSpacing: 0.65, marginRight: 'auto', textTransform: 'uppercase' },
  stepValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 18, minWidth: 76, textAlign: 'center' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12.5 },
  metricValue: { color: colors.primaryDark, fontFamily: typography.uiBlack },
});
