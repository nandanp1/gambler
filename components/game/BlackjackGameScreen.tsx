import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { GameHeader } from '@/components/GameHeader';
import { PlayingCard } from '@/components/PlayingCard';
import { Screen } from '@/components/Screen';
import {
  classifyRoundByNet,
  getActionCost,
  getVisibleDealerScore,
  playBlackjackAction,
  startBlackjack,
  type BlackjackActionName,
  type BlackjackCard,
  type BlackjackHand,
  type BlackjackState,
} from '@/games/blackjack/engine';
import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const CHIP_VALUES = [10, 25, 50, 100, 500] as const;
const CHIP_COLORS = [
  { fill: ['#B7EEDF', '#5CD2AF'] as const, ink: '#0B6B53', shadow: 'rgba(15,130,105,.42)' },
  { fill: ['#A8D9FF', '#5CA9F5'] as const, ink: '#0C4A85', shadow: 'rgba(30,100,180,.42)' },
  { fill: ['#FFD8E6', '#FF8FBB'] as const, ink: '#8C1450', shadow: 'rgba(190,50,110,.4)' },
  { fill: ['#C3B4FF', '#8264F2'] as const, ink: colors.surface, shadow: 'rgba(120,90,240,.55)' },
  { fill: ['#FFE6A8', '#FFC53D'] as const, ink: '#8A5A00', shadow: 'rgba(160,100,10,.4)' },
] as const;

const CONFETTI = [
  { color: colors.yellow, left: '8%', top: 30, rotate: '22deg' },
  { color: colors.pink, left: '20%', top: 14, rotate: '-35deg' },
  { color: colors.blue, left: '40%', top: 42, rotate: '8deg' },
  { color: colors.primary, left: '58%', top: 18, rotate: '47deg' },
  { color: colors.coral, left: '78%', top: 44, rotate: '-18deg' },
  { color: colors.yellow, left: '88%', top: 104, rotate: '32deg' },
  { color: colors.mint, left: '7%', top: 148, rotate: '62deg' },
  { color: colors.pink, left: '14%', top: 268, rotate: '12deg' },
  { color: colors.primary, left: '82%', top: 254, rotate: '-50deg' },
  { color: colors.coral, left: '31%', top: 332, rotate: '18deg' },
  { color: colors.blue, left: '70%', top: 340, rotate: '30deg' },
] as const;

const formatSigned = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded.toLocaleString('en-US')}`;
  if (rounded < 0) return `−${Math.abs(rounded).toLocaleString('en-US')}`;
  return '0';
};

interface DealtCardProps {
  card: BlackjackCard;
  dealIndex: number;
  hidden?: boolean;
  onDeal: () => void;
  reducedMotion: boolean;
  small?: boolean;
}

function DealtCard({ card, dealIndex, hidden = false, onDeal, reducedMotion, small = false }: DealtCardProps) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const holeScale = useSharedValue(1);
  const wasHidden = useRef(hidden);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      onDeal();
      return;
    }
    progress.value = 0;
    const timer = setTimeout(() => {
      onDeal();
      progress.value = withSpring(1, { damping: 16, stiffness: 165, mass: 0.68 });
    }, Math.min(360, dealIndex * 65));
    return () => clearTimeout(timer);
  }, [card.id, dealIndex, onDeal, progress, reducedMotion]);

  useEffect(() => {
    if (wasHidden.current && !hidden && !reducedMotion) {
      holeScale.value = 0.08;
      holeScale.value = withSpring(1, { damping: 15, stiffness: 250, mass: 0.5 });
    }
    wasHidden.current = hidden;
  }, [hidden, holeScale, reducedMotion]);

  const dealtStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.22, 1], [0, 0.65, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [142, 0]) },
      { translateY: interpolate(progress.value, [0, 1], [-112, 0]) },
      { rotate: `${interpolate(progress.value, [0, 1], [16, 0])}deg` },
      { scale: interpolate(progress.value, [0, 1], [0.72, 1]) * holeScale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.dealtCard, dealtStyle]}>
      <PlayingCard card={card} hidden={hidden} small={small} />
    </Animated.View>
  );
}

function ScorePill({ active = false, label, score, settled = false }: { active?: boolean; label: string; score: string; settled?: boolean }) {
  return (
    <LinearGradient
      colors={active ? (settled ? gradients.mint : gradients.primary) : ['rgba(255,255,255,.88)', 'rgba(255,255,255,.7)']}
      style={[styles.scorePill, active && styles.scorePillRaised]}
    >
      <Text style={[styles.scoreLabel, active && styles.scoreLabelActive]}>{label}</Text>
      <Text style={[styles.scoreValue, active && styles.scoreValueActive]}>{score}</Text>
    </LinearGradient>
  );
}

function CardFan({
  cards,
  dealer = false,
  handIndex = 0,
  hideHole = false,
  onDeal,
  reducedMotion,
  small = false,
}: {
  cards: readonly BlackjackCard[];
  dealer?: boolean;
  handIndex?: number;
  hideHole?: boolean;
  onDeal: () => void;
  reducedMotion: boolean;
  small?: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.cardFanContent}
      horizontal
      pointerEvents="none"
      showsHorizontalScrollIndicator={false}
      style={styles.cardFan}
    >
      {cards.map((card, index) => (
        <View key={`${dealer ? 'dealer' : `hand-${handIndex}`}-${card.id}-${index}`} style={index > 0 && styles.overlapCard}>
          <DealtCard
            card={card}
            dealIndex={(dealer ? index * 2 + 1 : index * 2) + handIndex * 2}
            hidden={hideHole && index === 1}
            onDeal={onDeal}
            reducedMotion={reducedMotion}
            small={small}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function EmptyTable() {
  return (
    <View style={styles.emptyTable}>
      <View style={styles.deckStack}>
        <LinearGradient colors={gradients.primary} style={[styles.deckCard, styles.deckBack]}>
          <View style={styles.deckMark} />
        </LinearGradient>
        <LinearGradient colors={['#FFFFFF', '#F2EDFF']} style={[styles.deckCard, styles.deckFront]}>
          <Text style={styles.deckAce}>A</Text>
          <Text style={styles.deckSuit}>♠</Text>
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>The table is ready</Text>
      <Text style={styles.emptyCopy}>Choose your stake, then deal a fresh hand.</Text>
    </View>
  );
}

function HandView({
  active,
  hand,
  handIndex,
  handCount,
  onDeal,
  reducedMotion,
  settled,
}: {
  active: boolean;
  hand: BlackjackHand;
  handIndex: number;
  handCount: number;
  onDeal: () => void;
  reducedMotion: boolean;
  settled: boolean;
}) {
  const outcome = hand.outcome === 'bust' ? 'Bust' : hand.outcome
    ? hand.outcome.charAt(0).toUpperCase() + hand.outcome.slice(1)
    : null;
  return (
    <View style={[styles.hand, handCount > 1 && styles.splitHand, active && styles.activeHand]}>
      {handCount > 1 && (
        <Text style={[styles.handNumber, active && styles.handNumberActive]}>
          Hand {handIndex + 1}{outcome ? ` · ${outcome}` : ''}
        </Text>
      )}
      <CardFan
        cards={hand.cards}
        handIndex={handIndex}
        onDeal={onDeal}
        reducedMotion={reducedMotion}
        small={handCount > 1 || hand.cards.length > 3}
      />
      <ScorePill
        active={active || settled}
        label={handCount > 1 ? `You · ${formatCoins(hand.bet)}` : 'You'}
        score={hand.score.isBust ? `${hand.score.total} bust` : String(hand.score.total)}
        settled={settled && (hand.outcome === 'win' || hand.outcome === 'blackjack')}
      />
    </View>
  );
}

export function BlackjackGameScreen() {
  const { state, completeGame, debit, haptic } = useAppStore();
  const [bet, setBet] = useState(100);
  const [round, setRound] = useState<BlackjackState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const roundRef = useRef<BlackjackState | null>(null);
  const currentRoundIdRef = useRef<string | null>(null);
  const completedRoundIdsRef = useRef(new Set<string>());
  const interactionLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
  }, []);

  const unlockAfter = useCallback((delay: number, roundId: string) => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      if (currentRoundIdRef.current !== roundId) return;
      unlockTimerRef.current = null;
      interactionLockRef.current = false;
      setIsBusy(false);
      setIsResolving(false);
    }, state.settings.reducedMotion ? 60 : delay);
  }, [state.settings.reducedMotion]);

  const finishRound = useCallback((settled: BlackjackState, roundId: string) => {
    if (
      settled.phase !== 'settled'
      || currentRoundIdRef.current !== roundId
      || completedRoundIdsRef.current.has(roundId)
    ) return;
    completedRoundIdsRef.current.add(roundId);
    interactionLockRef.current = true;
    setIsBusy(true);
    setIsResolving(true);
    const result = classifyRoundByNet(settled);
    const outcomes = settled.playerHands.map((hand) => hand.outcome ?? hand.status).join(', ');
    completeGame({
      roundId,
      game: 'blackjack',
      bet: settled.totalBet,
      payout: settled.payout,
      result,
      detail: settled.outcome === 'blackjack'
        ? 'blackjack'
        : `${settled.playerHands.length} hand${settled.playerHands.length === 1 ? '' : 's'} · ${outcomes}`,
    });
    unlockAfter(720, roundId);
  }, [completeGame, unlockAfter]);

  const dealRound = useCallback(() => {
    if (interactionLockRef.current) return;
    let next: BlackjackState;
    try {
      next = startBlackjack(bet);
    } catch {
      return;
    }
    const storeRoundId = debit(bet, 'blackjack');
    if (!storeRoundId) return;
    currentRoundIdRef.current = storeRoundId;
    roundRef.current = next;
    setRound(next);
    interactionLockRef.current = true;
    setIsBusy(true);
    if (next.phase === 'settled') finishRound(next, storeRoundId);
    else unlockAfter(470, storeRoundId);
  }, [bet, debit, finishRound, unlockAfter]);

  const takeAction = useCallback((action: BlackjackActionName) => {
    const current = roundRef.current;
    if (!current || current.phase !== 'player-turn' || interactionLockRef.current) return;
    const storeRoundId = currentRoundIdRef.current;
    if (!storeRoundId) return;
    const cost = getActionCost(current, action);
    let next: BlackjackState;
    try {
      next = playBlackjackAction(current, action);
    } catch {
      return;
    }
    if (cost > 0 && !debit(cost, 'blackjack', { additional: true, roundId: storeRoundId })) return;
    if (currentRoundIdRef.current !== storeRoundId) return;
    interactionLockRef.current = true;
    setIsBusy(true);
    roundRef.current = next;
    setRound(next);
    if (next.phase === 'settled') finishRound(next, storeRoundId);
    else unlockAfter(action === 'split' ? 520 : 310, storeRoundId);
  }, [debit, finishRound, unlockAfter]);

  const changeBet = useCallback(() => {
    if (interactionLockRef.current) return;
    roundRef.current = null;
    setRound(null);
  }, []);

  const onCardDeal = useCallback(() => haptic('light'), [haptic]);
  const settled = round?.phase === 'settled';
  const result = round && settled ? classifyRoundByNet(round) : null;
  const isWin = result === 'win';
  const isPush = result === 'push';
  const allHandsBust = round?.playerHands.every((hand) => hand.outcome === 'bust') ?? false;
  const dealerScore = round ? getVisibleDealerScore(round).total : null;
  const activeIndex = round?.activeHandIndex ?? null;
  const controlsDisabled = isBusy || !round || settled;

  const resultCopy = useMemo(() => {
    if (!round || !settled) return null;
    if (round.outcome === 'blackjack') return { title: 'Blackjack!', body: 'A natural 21 pays 3 to 2.' };
    if (round.outcome === 'mixed') return {
      title: isWin ? 'Winning round' : isPush ? 'Split push' : 'Split settled',
      body: 'Your split hands finished with mixed results.',
    };
    if (isWin) return {
      title: 'You win!',
      body: round.playerHands.length > 1 ? 'Your split hands have been settled.' : `You finish with ${round.playerHands[0]?.score.total ?? 0}.`,
    };
    if (isPush) return { title: 'Push', body: 'Your stake is back. Same table, fresh shoe.' };
    if (allHandsBust) return { title: 'Bust', body: 'Over 21 — the dealer takes this hand.' };
    return { title: 'Dealer wins', body: `Dealer closes on ${round.dealer.score.total}.` };
  }, [allHandsBust, isPush, isWin, round, settled]);

  return (
    <Screen bottomInset={28} scroll>
      <GameHeader title="Blackjack" />
      <View style={styles.content}>
        <LinearGradient
          colors={settled && isWin ? ['#DFFAF0', '#C1EDDC'] : settled && !isPush ? ['#FFE8E3', '#FFD2CC'] : ['#EAE3FF', '#D4CAF7']}
          style={styles.table}
        >
          {settled && isWin && CONFETTI.map((piece, index) => (
            <View
              key={index}
              style={[styles.confetti, { backgroundColor: piece.color, left: piece.left, top: piece.top, transform: [{ rotate: piece.rotate }] }]}
            />
          ))}

          {!round ? <EmptyTable /> : (
            <View style={styles.tableContent}>
              <View style={styles.dealerArea}>
                <ScorePill label="Dealer" score={String(dealerScore)} />
                <CardFan
                  cards={round.dealer.cards}
                  dealer
                  hideHole={!settled}
                  onDeal={onCardDeal}
                  reducedMotion={state.settings.reducedMotion}
                  small={round.dealer.cards.length > 3}
                />
              </View>

              {settled && resultCopy && (
                <View
                  accessibilityLiveRegion="polite"
                  style={[styles.resultBadge, isWin && styles.resultWin, isPush && styles.resultPush, !isWin && !isPush && styles.resultLoss]}
                >
                  <View style={[styles.resultIcon, isWin && styles.resultIconWin, isPush && styles.resultIconPush]}>
                    <Ionicons
                      color={isWin ? colors.success : isPush ? colors.primaryDark : colors.danger}
                      name={isWin ? 'sparkles' : isPush ? 'swap-horizontal' : 'close'}
                      size={18}
                    />
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultTitle, isWin && styles.resultTitleWin, !isWin && !isPush && styles.resultTitleLoss]}>{resultCopy.title}</Text>
                    <Text style={styles.resultBody} numberOfLines={1}>{resultCopy.body}</Text>
                  </View>
                  <Text style={[styles.resultAmount, isWin && styles.resultAmountWin, !isWin && !isPush && styles.resultAmountLoss]}>{formatSigned(round.net)}</Text>
                </View>
              )}

              <ScrollView
                contentContainerStyle={styles.handsContent}
                horizontal={round.playerHands.length > 1}
                showsHorizontalScrollIndicator={false}
                style={styles.handsScroll}
              >
                {round.playerHands.map((hand, index) => (
                  <HandView
                    key={hand.id}
                    active={activeIndex === index}
                    hand={hand}
                    handCount={round.playerHands.length}
                    handIndex={index}
                    onDeal={onCardDeal}
                    reducedMotion={state.settings.reducedMotion}
                    settled={settled}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.deckOrigin}>
            <View style={styles.deckOriginLine} />
            <Text style={styles.deckOriginText}>SHOE</Text>
          </View>
        </LinearGradient>

        <View style={styles.controlPanel}>
          {!settled ? (
            <>
              <BetControl disabled={Boolean(round) || isBusy} max={5_000} onChange={setBet} step={10} value={bet} />
              <View style={styles.chips}>
                {CHIP_VALUES.map((value, index) => {
                  const selected = bet === value;
                  const palette = CHIP_COLORS[index]!;
                  return (
                    <Pressable
                      accessibilityLabel={`Bet ${value} coins`}
                      accessibilityRole="button"
                      disabled={Boolean(round) || isBusy}
                      key={value}
                      onPress={() => {
                        haptic('selection');
                        setBet(value);
                      }}
                      style={({ pressed }) => [styles.chipPressable, pressed && styles.chipPressed]}
                    >
                      <LinearGradient
                        colors={palette.fill}
                        style={[
                          styles.chip,
                          { shadowColor: palette.shadow },
                          selected && styles.selectedChip,
                          Boolean(round) && !selected && styles.inactiveChip,
                        ]}
                      >
                        <View style={[styles.chipRing, { borderColor: palette.ink }]} />
                        <Text style={[styles.chipText, { color: palette.ink }]}>{value}</Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>

              {!round ? (
                <ClayButton
                  disabled={isBusy}
                  icon={<Ionicons color={colors.surface} name="layers" size={19} />}
                  label="Deal Hand"
                  onPress={dealRound}
                />
              ) : (
                <>
                  <View style={styles.primaryActions}>
                    <ClayButton
                      colors={gradients.mint}
                      disabled={controlsDisabled || !round.availableActions.hit}
                      edgeColor={colors.mintEdge}
                      label="Hit"
                      onPress={() => takeAction('hit')}
                      style={styles.flexButton}
                    />
                    <ClayButton
                      colors={gradients.coral}
                      disabled={controlsDisabled || !round.availableActions.stand}
                      edgeColor={colors.coralEdge}
                      label="Stand"
                      onPress={() => takeAction('stand')}
                      style={styles.flexButton}
                    />
                  </View>
                  <View style={styles.secondaryActions}>
                    <ClayButton
                      colors={gradients.surface}
                      compact
                      disabled={controlsDisabled || !round.availableActions.double}
                      edgeColor={colors.insetDeep}
                      label={`Double${round.availableActions.double ? ` · ${formatCoins(getActionCost(round, 'double'))}` : ''}`}
                      onPress={() => takeAction('double')}
                      style={styles.flexButton}
                      textColor={colors.inkPurple}
                    />
                    <ClayButton
                      colors={gradients.surface}
                      compact
                      disabled={controlsDisabled || !round.availableActions.split}
                      edgeColor={colors.insetDeep}
                      label={`Split${round.availableActions.split ? ` · ${formatCoins(getActionCost(round, 'split'))}` : ''}`}
                      onPress={() => takeAction('split')}
                      style={styles.flexButton}
                      textColor={colors.inkPurple}
                    />
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.settlementStats}>
                <View>
                  <Text style={styles.settlementLabel}>Total bet</Text>
                  <Text style={styles.settlementValue}>{formatCoins(round.totalBet)}</Text>
                </View>
                <View style={styles.settlementRight}>
                  <Text style={styles.settlementLabel}>Payout</Text>
                  <Text style={[styles.settlementValue, { color: isWin ? colors.success : isPush ? colors.primaryDark : colors.danger }]}>{formatCoins(round.payout)}</Text>
                </View>
              </View>
              <ClayButton
                disabled={isResolving}
                label={isResolving ? 'Settling hand…' : 'Play Again'}
                loading={isResolving}
                onPress={dealRound}
              />
              <View style={styles.secondaryActions}>
                <ClayButton
                  colors={gradients.surface}
                  compact
                  disabled={isResolving}
                  edgeColor={colors.insetDeep}
                  label="Change Bet"
                  onPress={changeBet}
                  style={styles.flexButton}
                  textColor={colors.inkPurple}
                />
                <ClayButton
                  colors={gradients.surface}
                  compact
                  disabled={isResolving}
                  edgeColor={colors.insetDeep}
                  label="Leave Table"
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

export default BlackjackGameScreen;

const styles = StyleSheet.create({
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 4 },
  table: {
    borderBottomColor: 'rgba(255,255,255,.72)',
    borderBottomWidth: 2,
    borderRadius: 34,
    height: 438,
    overflow: 'hidden',
    ...clayShadow('rgba(84,64,170,.25)', 8),
  },
  tableContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 14 },
  dealerArea: { alignItems: 'center', height: 164, zIndex: 2 },
  cardFan: { flexGrow: 0, maxWidth: '100%', overflow: 'visible' },
  cardFanContent: { alignItems: 'center', minWidth: '100%', paddingHorizontal: 22, paddingVertical: 7 },
  dealtCard: { ...clayShadow('rgba(80,50,160,.12)', 3) },
  overlapCard: { marginLeft: -20 },
  scorePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  scorePillRaised: { ...clayShadow('rgba(120,90,240,.32)', 4) },
  scoreLabel: { color: '#5B5580', fontFamily: typography.uiExtra, fontSize: 12 },
  scoreLabelActive: { color: 'rgba(255,255,255,.88)' },
  scoreValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 13 },
  scoreValueActive: { color: colors.surface },
  handsScroll: { flex: 1, marginTop: 2 },
  handsContent: { alignItems: 'center', flexGrow: 1, gap: 8, justifyContent: 'center', paddingHorizontal: 4 },
  hand: { alignItems: 'center', justifyContent: 'center', minWidth: 220, padding: 5 },
  splitHand: { borderColor: 'transparent', borderRadius: radius.control, borderWidth: 2, minWidth: 196 },
  activeHand: { backgroundColor: 'rgba(255,255,255,.24)', borderColor: 'rgba(130,100,242,.38)' },
  handNumber: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  handNumberActive: { color: colors.primaryDark },
  resultBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,.88)',
    borderColor: 'rgba(255,255,255,.7)',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    maxWidth: '96%',
    minHeight: 55,
    paddingHorizontal: 10,
    paddingVertical: 7,
    ...clayShadow('rgba(160,55,65,.14)', 4),
    zIndex: 3,
  },
  resultWin: { backgroundColor: 'rgba(255,255,255,.91)', shadowColor: 'rgba(20,130,105,.22)' },
  resultPush: { shadowColor: 'rgba(120,90,240,.2)' },
  resultLoss: { backgroundColor: 'rgba(255,252,252,.9)' },
  resultIcon: { alignItems: 'center', backgroundColor: '#FFE3E6', borderRadius: 13, height: 36, justifyContent: 'center', width: 36 },
  resultIconWin: { backgroundColor: '#D9F7EC' },
  resultIconPush: { backgroundColor: colors.inset },
  resultCopy: { flex: 1 },
  resultTitle: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 14 },
  resultTitleWin: { color: '#167B60' },
  resultTitleLoss: { color: '#B73348' },
  resultBody: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 10.5, marginTop: 1 },
  resultAmount: { color: colors.text, fontFamily: typography.display, fontSize: 19 },
  resultAmountWin: { color: colors.success },
  resultAmountLoss: { color: colors.danger },
  emptyTable: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 20 },
  deckStack: { height: 132, marginBottom: 22, width: 142 },
  deckCard: { borderRadius: 18, height: 112, position: 'absolute', width: 80, ...clayShadow('rgba(70,45,140,.35)', 7) },
  deckBack: { left: 18, top: 12, transform: [{ rotate: '-10deg' }] },
  deckFront: { alignItems: 'stretch', justifyContent: 'space-between', padding: 11, right: 16, top: 3, transform: [{ rotate: '9deg' }] },
  deckMark: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.3)', borderRadius: 20, flex: 1, marginVertical: 12, width: '58%' },
  deckAce: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 21 },
  deckSuit: { alignSelf: 'flex-end', color: colors.text, fontFamily: typography.uiBlack, fontSize: 27 },
  emptyTitle: { color: colors.text, fontFamily: typography.display, fontSize: 23 },
  emptyCopy: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12.5, marginTop: 3 },
  deckOrigin: { alignItems: 'center', opacity: 0.32, position: 'absolute', right: 13, top: 12 },
  deckOriginLine: { backgroundColor: colors.primaryDark, borderRadius: 3, height: 3, width: 24 },
  deckOriginText: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 7, letterSpacing: 0.7, marginTop: 2 },
  confetti: { borderRadius: 4, height: 14, opacity: 0.9, position: 'absolute', width: 8 },
  controlPanel: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.insetDeep,
    borderBottomWidth: 3,
    borderRadius: radius.panel,
    gap: 12,
    padding: 18,
    ...clayShadow('rgba(84,64,170,.19)', 8),
  },
  chips: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  chipPressable: { flex: 1 },
  chip: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    maxHeight: 52,
    paddingBottom: 3,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 4,
  },
  chipRing: { borderRadius: radius.pill, borderStyle: 'dashed', borderWidth: 1.5, height: '78%', opacity: 0.25, position: 'absolute', width: '78%' },
  chipText: { fontFamily: typography.uiBlack, fontSize: 13.5 },
  selectedChip: { borderColor: colors.primaryDark, borderWidth: 3, transform: [{ translateY: -2 }, { scale: 1.04 }] },
  inactiveChip: { opacity: 0.55 },
  chipPressed: { opacity: 0.78, transform: [{ scale: 0.94 }] },
  primaryActions: { flexDirection: 'row', gap: 12 },
  secondaryActions: { flexDirection: 'row', gap: 12 },
  flexButton: { flex: 1 },
  settlementStats: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  settlementRight: { alignItems: 'flex-end' },
  settlementLabel: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  settlementValue: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 20, marginTop: 2 },
});
