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
import { playRedDog, redDogWinMultiplier, type RedDogResult } from '@/games/quick/redDog';
import type { Card } from '@/games/quick/shared';
import { playThreeCardPoker, type ThreeCardPokerResult } from '@/games/quick/threeCardPoker';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

export type TableQuickGameSlug = 'poker' | 'red-dog';

type TableOutcome =
  | { kind: 'poker'; value: ThreeCardPokerResult }
  | { kind: 'red-dog'; value: RedDogResult };

const titleCase = (value: string) => value
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

function BackRow({ count }: { count: number }) {
  return (
    <View style={styles.cards}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.cardBack, index > 0 && styles.cardGap]}>
          <View style={styles.cardBackInset} />
        </View>
      ))}
    </View>
  );
}

function HandRow({
  cards,
  label,
  rank,
  winner,
}: {
  cards?: readonly Card[];
  label: string;
  rank?: string;
  winner: boolean;
}) {
  return (
    <View style={[styles.handRow, winner && styles.winnerRow]}>
      <View style={styles.handText}>
        <Text style={styles.handLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.handRank}>{rank ?? 'Waiting'}</Text>
      </View>
      {cards ? (
        <View style={styles.cards}>
          {cards.map((card, index) => (
            <View key={card.id} style={index > 0 && styles.cardGap}>
              <QuickPlayingCard card={card} small />
            </View>
          ))}
        </View>
      ) : <BackRow count={3} />}
    </View>
  );
}

function PokerBoard({ result }: { result?: ThreeCardPokerResult }) {
  return (
    <View style={styles.tableBoard}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableEyebrow}>THREE CARD SHOWDOWN</Text>
        <View style={styles.antePill}><Text style={styles.anteText}>ANTE + BONUS</Text></View>
      </View>
      <HandRow
        cards={result?.dealer}
        label="Dealer"
        rank={result ? titleCase(result.dealerRank.name) : undefined}
        winner={result?.outcome === 'loss'}
      />
      <HandRow
        cards={result?.player}
        label="You"
        rank={result ? titleCase(result.playerRank.name) : undefined}
        winner={result?.outcome === 'win'}
      />
    </View>
  );
}

function RedDogBoard({ result }: { result?: RedDogResult }) {
  const spreadLabel = result?.spread === 'pair'
    ? 'PAIR · 11:1'
    : result
      ? result.spread === 0 ? 'CONSECUTIVE · PUSH' : `SPREAD ${result.spread} · ${redDogWinMultiplier(result.spread) - 1}:1`
      : 'LAND BETWEEN THE POSTS';

  return (
    <View style={styles.redDogBoard}>
      <View style={styles.dogHeader}>
        <Text style={styles.dogEyebrow}>RED DOG</Text>
        <Text style={styles.dogRule}>The middle rank wins</Text>
      </View>
      <View style={styles.redDogCards}>
        {result ? (
          <>
            <View style={styles.postCard}><QuickPlayingCard card={result.posts[0]} /></View>
            <View style={styles.middleColumn}>
              <Text style={styles.betweenArrow}>↔</Text>
              {result.thirdCard
                ? <QuickPlayingCard card={result.thirdCard} small />
                : <View style={styles.pushCard}><Text style={styles.pushDash}>—</Text></View>}
              <Text style={styles.drawLabel}>DRAW</Text>
            </View>
            <View style={styles.postCard}><QuickPlayingCard card={result.posts[1]} /></View>
          </>
        ) : (
          <>
            <View style={styles.largeBack}><View style={styles.cardBackInset} /></View>
            <View style={styles.middleColumn}><Text style={styles.betweenArrow}>↔</Text><View style={styles.smallBack}><View style={styles.cardBackInset} /></View><Text style={styles.drawLabel}>DRAW</Text></View>
            <View style={styles.largeBack}><View style={styles.cardBackInset} /></View>
          </>
        )}
      </View>
      <View style={[styles.spreadPill, result?.outcome === 'win' && styles.spreadWin]}>
        <Text style={[styles.spreadText, result?.outcome === 'win' && styles.spreadWinText]}>{spreadLabel}</Text>
      </View>
    </View>
  );
}

export function TableQuickGameScreen({ slug }: { slug: TableQuickGameSlug }) {
  const { state, debit, completeGame } = useAppStore();
  const [bet, setBet] = useState(50);
  const [outcome, setOutcome] = useState<TableOutcome | null>(null);
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

  const boardStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + reveal.value * 0.6,
    transform: [
      { perspective: 700 },
      { rotateX: `${(1 - reveal.value) * -24}deg` },
      { translateY: (1 - reveal.value) * -13 },
    ],
  }));

  const play = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const roundId = debit(bet, slug);
    if (!roundId) {
      busyRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;

    const next: TableOutcome = slug === 'poker'
      ? { kind: 'poker', value: playThreeCardPoker(bet) }
      : { kind: 'red-dog', value: playRedDog(bet) };
    const duration = state.settings.reducedMotion ? 160 : 700;
    settledRef.current = false;
    setBusy(true);
    setOutcome(next);
    reveal.value = 0;
    reveal.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });

    const handle = setTimeout(() => {
      if (activeRoundRef.current !== roundId) return;
      if (!settledRef.current) {
        settledRef.current = true;
        if (next.kind === 'poker') {
          completeGame({
            roundId,
            game: slug,
            bet: next.value.bet,
            payout: next.value.payout,
            result: next.value.payout > next.value.bet ? 'win' : next.value.payout === next.value.bet ? 'push' : 'loss',
            detail: `${titleCase(next.value.playerRank.name)} vs ${titleCase(next.value.dealerRank.name)}`,
          });
        } else {
          completeGame({
            roundId,
            game: slug,
            bet: next.value.bet,
            payout: next.value.payout,
            result: next.value.outcome,
            detail: next.value.spread === 'pair' ? 'Pair spread' : `Spread ${next.value.spread}`,
          });
        }
      }
      activeRoundRef.current = null;
      busyRef.current = false;
      setBusy(false);
      if (timeoutRef.current === handle) timeoutRef.current = null;
    }, duration + 30);
    timeoutRef.current = handle;
  };

  const pokerResult = outcome?.kind === 'poker' ? outcome.value : undefined;
  const redDogResult = outcome?.kind === 'red-dog' ? outcome.value : undefined;
  const pokerShowdown = pokerResult
    ? pokerResult.outcome === 'win' ? 'You win the showdown' : pokerResult.outcome === 'tie' ? 'Showdown tied' : 'Dealer wins the showdown'
    : null;
  const pokerWallet = pokerResult
    ? pokerResult.profit > 0
      ? `wallet +${formatCoins(pokerResult.profit)} profit${pokerResult.bonusPayout ? `, including ${formatCoins(pokerResult.bonusPayout)} bonus` : ''}`
      : pokerResult.profit === 0
        ? pokerResult.bonusPayout ? 'hand bonus returns your stake' : 'stake returned'
        : `wallet −${formatCoins(Math.abs(pokerResult.profit))}`
    : null;
  const resultText = busy
    ? slug === 'poker' ? 'Dealer is setting the hands…' : 'Drawing between the posts…'
    : pokerResult
      ? `${pokerShowdown} · ${pokerWallet}`
      : redDogResult
        ? redDogResult.outcome === 'win'
          ? `Card lands between · ${formatCoins(redDogResult.payout)} returned`
          : redDogResult.outcome === 'push'
            ? `Consecutive posts · ${formatCoins(redDogResult.payout)} returned`
            : redDogResult.spread === 'pair' ? 'The third card did not match the pair' : 'The card landed outside the spread'
        : null;

  const board = (
    <Animated.View accessibilityLiveRegion={!busy && outcome ? 'polite' : 'none'} style={[styles.animatedBoard, boardStyle]}>
      {slug === 'poker'
        ? <PokerBoard result={pokerResult} />
        : <RedDogBoard result={redDogResult} />}
    </Animated.View>
  );

  return (
    <QuickGameFrame board={board} result={resultText} slug={slug}>
      <BetControl disabled={busy} onChange={setBet} step={10} value={bet} />
      <View style={styles.options}>
        <OptionPill
          disabled={busy}
          label="Min · 10"
          onPress={() => setBet(10)}
        />
        <OptionPill
          disabled={busy}
          label="Double stake"
          onPress={() => setBet((current) => Math.min(5_000, current * 2))}
        />
      </View>
      <ClayButton
        disabled={busy}
        label={busy ? 'Dealing…' : slug === 'poker' ? 'Deal Showdown' : 'Deal Red Dog'}
        loading={busy}
        onPress={play}
      />
    </QuickGameFrame>
  );
}

export default TableQuickGameScreen;

const styles = StyleSheet.create({
  animatedBoard: { height: 292, width: '100%' },
  tableBoard: { gap: 9, width: '100%' },
  tableHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 25 },
  tableEyebrow: { color: 'rgba(255,255,255,.75)', fontFamily: typography.uiBlack, fontSize: 9, letterSpacing: 1.45 },
  antePill: { backgroundColor: 'rgba(30,92,76,.18)', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  anteText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 8.5, letterSpacing: 0.6 },
  handRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.15)', borderRadius: radius.control, borderWidth: 1, flexDirection: 'row', minHeight: 112, paddingHorizontal: 11, paddingVertical: 8 },
  winnerRow: { backgroundColor: 'rgba(255,255,255,.31)', borderColor: 'rgba(255,255,255,.62)' },
  handText: { flex: 1, minWidth: 80 },
  handLabel: { color: colors.surface, fontFamily: typography.display, fontSize: 17 },
  handRank: { color: 'rgba(255,255,255,.72)', fontFamily: typography.uiBlack, fontSize: 9.5, marginTop: 1 },
  cards: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end' },
  cardGap: { marginLeft: -21 },
  cardBack: { backgroundColor: '#F8F3FF', borderColor: 'rgba(255,255,255,.7)', borderRadius: 13, borderWidth: 2, height: 84, padding: 7, width: 60 },
  cardBackInset: { backgroundColor: 'rgba(255,104,92,.28)', borderRadius: 9, flex: 1 },
  redDogBoard: { alignItems: 'center', height: '100%', justifyContent: 'space-between', width: '100%' },
  dogHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  dogEyebrow: { color: colors.surface, fontFamily: typography.display, fontSize: 22 },
  dogRule: { color: 'rgba(255,255,255,.7)', fontFamily: typography.uiBlack, fontSize: 9.5 },
  redDogCards: { alignItems: 'center', flexDirection: 'row', gap: 13, justifyContent: 'center' },
  postCard: { transform: [{ rotate: '-3deg' }] },
  middleColumn: { alignItems: 'center', gap: 4 },
  betweenArrow: { color: 'rgba(255,255,255,.72)', fontFamily: typography.display, fontSize: 22, lineHeight: 23 },
  drawLabel: { color: 'rgba(255,255,255,.66)', fontFamily: typography.uiBlack, fontSize: 8, letterSpacing: 1 },
  pushCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.22)', borderRadius: 13, height: 84, justifyContent: 'center', width: 60 },
  pushDash: { color: colors.surface, fontFamily: typography.display, fontSize: 26 },
  largeBack: { backgroundColor: '#F8F3FF', borderRadius: 15, height: 104, padding: 8, transform: [{ rotate: '-3deg' }], width: 74 },
  smallBack: { backgroundColor: '#F8F3FF', borderRadius: 13, height: 84, padding: 7, width: 60 },
  spreadPill: { backgroundColor: 'rgba(90,30,30,.18)', borderColor: 'rgba(255,255,255,.22)', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 8 },
  spreadWin: { backgroundColor: colors.mintDark },
  spreadWinText: { color: colors.text },
  spreadText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 10, letterSpacing: 0.7 },
  options: { flexDirection: 'row', gap: 9 },
});
