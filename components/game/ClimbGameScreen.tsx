import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { OptionPill } from '@/components/game/OptionPill';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { cashOutDragonTower, chooseDragonEgg, startDragonTower, type DragonDifficulty, type DragonTowerState } from '@/games/quick/dragonTower';
import { cashOutTowers, chooseTowersTile, startTowers, type TowersDifficulty, type TowersState } from '@/games/quick/towers';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

type ClimbSlug = 'towers' | 'dragon-tower';
type AnyClimb = TowersState | DragonTowerState;

export function ClimbGameScreen({ slug }: { slug: ClimbSlug }) {
  const { debit, completeGame, haptic } = useAppStore();
  const [bet, setBet] = useState(50);
  const [difficulty, setDifficulty] = useState<TowersDifficulty | DragonDifficulty>(slug === 'towers' ? 'medium' : 'wyvern');
  const [round, setRound] = useState<AnyClimb | null>(null);
  const roundRef = useRef<AnyClimb | null>(null);
  const startingRef = useRef(false);
  const settledRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);

  const updateRound = (next: AnyClimb | null) => {
    roundRef.current = next;
    setRound(next);
  };

  const options = slug === 'towers'
    ? (['easy', 'medium', 'hard'] as TowersDifficulty[])
    : (['hatchling', 'wyvern', 'inferno'] as DragonDifficulty[]);

  const settle = (next: AnyClimb, roundId: string) => {
    if (next.status === 'active' || activeRoundRef.current !== roundId || settledRef.current) return;
    settledRef.current = true;
    activeRoundRef.current = null;
    startingRef.current = false;
    completeGame({
      roundId,
      game: slug,
      bet: next.bet,
      payout: next.payout,
      result: next.payout > next.bet ? 'win' : next.payout === next.bet ? 'push' : 'loss',
      detail: `${next.selections.filter((item) => item.safe).length}-safe`,
    });
  };

  const start = () => {
    if (startingRef.current || roundRef.current?.status === 'active') return;
    startingRef.current = true;
    const roundId = debit(bet, slug);
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    const next = slug === 'towers'
      ? startTowers(bet, difficulty as TowersDifficulty)
      : startDragonTower(bet, difficulty as DragonDifficulty);
    activeRoundRef.current = roundId;
    settledRef.current = false;
    updateRound(next);
  };

  const choose = (row: number, tile: number) => {
    const current = roundRef.current;
    const roundId = activeRoundRef.current;
    if (!current || current.status !== 'active' || current.currentRow !== row || !roundId) return;
    const next = slug === 'towers'
      ? chooseTowersTile(current as TowersState, tile)
      : chooseDragonEgg(current as DragonTowerState, tile);
    updateRound(next);
    haptic(next.status === 'lost' ? 'warning' : 'success');
    settle(next, roundId);
  };

  const cashOut = () => {
    const current = roundRef.current;
    const roundId = activeRoundRef.current;
    if (!current || current.status !== 'active' || !current.selections.length || !roundId) return;
    const next = slug === 'towers'
      ? cashOutTowers(current as TowersState)
      : cashOutDragonTower(current as DragonTowerState);
    updateRound(next);
    settle(next, roundId);
  };

  const rows = round ? [...round.board].reverse() : Array.from({ length: slug === 'towers' ? 8 : 7 }, (_, index) => ({ index, trapTiles: [] as readonly number[] })).reverse();
  const columns = round?.config.columns ?? 4;
  const terminal = !!round && round.status !== 'active';

  const board = (
    <View accessibilityLiveRegion={terminal ? 'polite' : 'none'} style={styles.board}>
      <View style={styles.topper}>{slug === 'dragon-tower' ? <Ionicons color={colors.yellow} name="flame" size={31} /> : <Ionicons color={colors.surface} name="flag" size={27} />}</View>
      {rows.map((row) => {
        const selection = round?.selections.find((item) => item.row === row.index);
        const current = round?.status === 'active' && round.currentRow === row.index;
        return (
          <View key={row.index} style={[styles.row, current && styles.currentRow]}>
            {Array.from({ length: columns }, (_, tile) => {
              const picked = selection?.tile === tile;
              const trap = row.trapTiles.includes(tile);
              const revealTrap = terminal && trap;
              const safePick = picked && selection?.safe;
              return (
                <Pressable
                  accessibilityLabel={`Row ${row.index + 1}, tile ${tile + 1}${safePick ? ', safe choice' : picked ? ', trap' : revealTrap ? ', trap revealed' : ''}`}
                  accessibilityHint={current ? 'Choose this tile for the current row' : undefined}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !current, selected: picked }}
                  disabled={!current}
                  hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
                  key={tile}
                  onPress={() => choose(row.index, tile)}
                  style={({ pressed }) => [styles.tile, current && styles.tileCurrent, safePick && styles.tileSafe, (picked && !selection?.safe) && styles.tileTrap, revealTrap && styles.tileTrapReveal, pressed && styles.pressed]}
                >
                  {safePick && <Ionicons color={colors.text} name={slug === 'dragon-tower' ? 'egg' : 'diamond'} size={18} />}
                  {(picked && !selection?.safe) && <Ionicons color={colors.surface} name={slug === 'dragon-tower' ? 'flame' : 'close'} size={18} />}
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <Text style={styles.multiplier}>{round ? `${round.multiplier.toFixed(2)}×` : 'Choose your path'}</Text>
    </View>
  );

  const result = !round
    ? 'One choice per row · cash out after any safe pick'
    : round.status === 'active'
      ? `Row ${round.currentRow + 1} · current cash out ${formatCoins(round.bet * round.multiplier)}`
      : round.status === 'lost'
        ? 'A trap ended the climb'
        : `${round.status === 'completed' ? 'Tower cleared' : 'Cashed out'} · +${formatCoins(round.payout)}`;

  return (
    <QuickGameFrame board={board} boardStyle={styles.frameBoard} result={result} slug={slug}>
      {!round && <>
        <BetControl onChange={setBet} step={10} value={bet} />
        <View style={styles.options}>{options.map((option) => <OptionPill key={option} label={option[0]!.toUpperCase() + option.slice(1)} onPress={() => setDifficulty(option)} selected={difficulty === option} />)}</View>
      </>}
      {round?.status === 'active' ? (
        <ClayButton colors={gradients.mint} disabled={!round.selections.length} edgeColor={colors.mintEdge} label={`Cash Out · ${formatCoins(round.bet * round.multiplier)}`} onPress={cashOut} />
      ) : (
        <ClayButton label={terminal ? 'Climb Again' : 'Start Climb'} onPress={() => { if (terminal) updateRound(null); else start(); }} />
      )}
    </QuickGameFrame>
  );
}

export default ClimbGameScreen;

const styles = StyleSheet.create({
  frameBoard: { height: 460, padding: 12 },
  board: { alignItems: 'center', height: 427, justifyContent: 'center', width: '100%' },
  topper: { alignItems: 'center', height: 36, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 6, marginTop: 5, opacity: 0.68, width: '84%' },
  currentRow: { opacity: 1, transform: [{ scale: 1.03 }] },
  tile: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.3)', borderRadius: 9, flex: 1, height: 40, justifyContent: 'center' },
  tileCurrent: { backgroundColor: 'rgba(255,255,255,.78)', borderBottomColor: 'rgba(45,30,100,.25)', borderBottomWidth: 3 },
  tileSafe: { backgroundColor: colors.mintDark },
  tileTrap: { backgroundColor: colors.coralDark },
  tileTrapReveal: { borderColor: 'rgba(255,255,255,.55)', borderWidth: 1 },
  pressed: { transform: [{ translateY: 2 }, { scale: 0.94 }] },
  multiplier: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 15, marginTop: 10 },
  options: { flexDirection: 'row', gap: 8 },
});
