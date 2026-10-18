import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { KENO_MAX_PICKS, KENO_NUMBER_COUNT, playKeno, type KenoResult } from '@/games/quick/keno';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

export function KenoGameScreen() {
  const { state, debit, completeGame, showToast, haptic } = useAppStore();
  const [bet, setBet] = useState(50);
  const [selected, setSelected] = useState<number[]>([4, 11, 19, 27, 36]);
  const [result, setResult] = useState<KenoResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);
  const settledRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  useEffect(() => () => {
    activeRoundRef.current = null;
    clearTimer();
  }, []);

  const visibleDrawn = useMemo(() => new Set(result?.drawn.slice(0, revealed) ?? []), [result, revealed]);
  const matched = useMemo(() => new Set(result?.matched ?? []), [result]);

  const toggle = (number: number) => {
    if (busy) return;
    setResult(null);
    setRevealed(0);
    setSelected((previous) => {
      if (previous.includes(number)) return previous.filter((item) => item !== number);
      if (previous.length < KENO_MAX_PICKS) return [...previous, number].sort((a, b) => a - b);
      showToast(`Pick up to ${KENO_MAX_PICKS} numbers`);
      return previous;
    });
    haptic('selection');
  };

  const settle = (next: KenoResult, roundId: string) => {
    if (activeRoundRef.current !== roundId || settledRef.current) return;
    settledRef.current = true;
    activeRoundRef.current = null;
    startingRef.current = false;
    setBusy(false);
    completeGame({ roundId, game: 'keno', bet: next.bet, payout: next.payout, result: next.payout > next.bet ? 'win' : next.payout === next.bet ? 'push' : 'loss', detail: `${next.matches}-matches` });
  };

  const draw = () => {
    if (!selected.length) { showToast('Pick at least one number'); return; }
    if (startingRef.current || busy) return;
    startingRef.current = true;
    const roundId = debit(bet, 'keno');
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    activeRoundRef.current = roundId;
    settledRef.current = false;
    const next = playKeno(bet, selected);
    setResult(next);
    setRevealed(0);
    setBusy(true);
    let count = 0;
    const delay = state.settings.reducedMotion ? 45 : 135;
    const handle = setInterval(() => {
      if (activeRoundRef.current !== roundId) {
        clearInterval(handle);
        return;
      }
      count += 1;
      setRevealed(count);
      haptic('selection');
      if (count >= next.drawn.length) {
        clearInterval(handle);
        if (timerRef.current === handle) timerRef.current = null;
        settle(next, roundId);
      }
    }, delay);
    timerRef.current = handle;
  };

  const board = (
    <View accessibilityLiveRegion={result && !busy ? 'polite' : 'none'} style={styles.board}>
      <View style={styles.drawnRow}>
        {Array.from({ length: 10 }, (_, index) => {
          const number = result?.drawn[index];
          const visible = index < revealed && number !== undefined;
          return <View key={index} style={[styles.drawBall, visible && styles.drawBallVisible, visible && matched.has(number!) && styles.matchBall]}><Text style={[styles.drawBallText, visible && styles.drawBallTextVisible]}>{visible ? number : '•'}</Text></View>;
        })}
      </View>
      <View style={styles.numberGrid}>
        {Array.from({ length: KENO_NUMBER_COUNT }, (_, index) => index + 1).map((number) => {
          const chosen = selected.includes(number);
          const drawn = visibleDrawn.has(number);
          const hit = drawn && chosen;
          return (
            <Pressable
              accessibilityLabel={`Keno number ${number}${chosen ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, selected: chosen }}
              disabled={busy}
              hitSlop={1}
              key={number}
              onPress={() => toggle(number)}
              style={({ pressed }) => [styles.number, chosen && styles.selected, drawn && styles.drawn, hit && styles.hit, pressed && styles.pressed]}
            >
              <Text style={[styles.numberText, (chosen || drawn) && styles.numberTextActive, hit && styles.hitText]}>{number}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const resultCopy = result && !busy
    ? `${result.matches} match${result.matches === 1 ? '' : 'es'} · ${result.multiplier ? `${result.multiplier}× · Return ${formatCoins(result.payout)}` : 'No prize this draw'}`
    : `${selected.length} selected · choose up to ${KENO_MAX_PICKS}`;

  return (
    <QuickGameFrame board={board} boardStyle={styles.frameBoard} result={resultCopy} slug="keno">
      <BetControl disabled={busy} onChange={setBet} step={10} value={bet} />
      <View style={styles.quickActions}>
        <Pressable accessibilityLabel="Clear selected Keno numbers" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} hitSlop={8} onPress={() => { setSelected([]); setResult(null); }}><Text style={styles.action}>Clear</Text></Pressable>
        <Text style={styles.picks}>{selected.length} / {KENO_MAX_PICKS} picks</Text>
        <Pressable accessibilityLabel="Quick pick five Keno numbers" accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} hitSlop={8} onPress={() => setSelected([4, 8, 12, 16, 20])}><Text style={styles.action}>Quick Pick</Text></Pressable>
      </View>
      <ClayButton disabled={busy || !selected.length} label={busy ? 'Drawing…' : 'Draw Balls'} loading={busy} onPress={draw} />
    </QuickGameFrame>
  );
}

export default KenoGameScreen;

const styles = StyleSheet.create({
  frameBoard: { height: 374, paddingHorizontal: 12 },
  board: { alignItems: 'center', height: 338, width: '100%' },
  drawnRow: { flexDirection: 'row', gap: 4, height: 45, justifyContent: 'center', marginBottom: 9 },
  drawBall: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.24)', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  drawBallVisible: { backgroundColor: colors.surface },
  matchBall: { backgroundColor: colors.yellow },
  drawBallText: { color: 'rgba(255,255,255,.55)', fontFamily: typography.uiBlack, fontSize: 11 },
  drawBallTextVisible: { color: colors.primaryDark },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', width: 325 },
  number: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.29)', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  selected: { backgroundColor: colors.primaryDark },
  drawn: { borderColor: colors.surface, borderWidth: 2 },
  hit: { backgroundColor: colors.yellow, borderColor: '#FFEBA3' },
  hitText: { color: colors.text },
  numberText: { color: 'rgba(23,23,39,.62)', fontFamily: typography.uiBlack, fontSize: 11.5 },
  numberTextActive: { color: colors.surface },
  pressed: { opacity: 0.7, transform: [{ scale: 0.92 }] },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { color: colors.primaryDark, fontFamily: typography.uiExtra, fontSize: 13 },
  picks: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 13 },
});
