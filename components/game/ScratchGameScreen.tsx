import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BetControl } from '@/components/BetControl';
import { ClayButton } from '@/components/ClayButton';
import { QuickGameFrame } from '@/components/game/QuickGameFrame';
import { createScratchTicket, revealAllScratchCells, revealScratchCell, type ScratchSymbol, type ScratchTicket } from '@/games/quick/scratch';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, typography } from '@/theme';
import { formatCoins } from '@/utils/format';

const ICONS: Record<ScratchSymbol, React.ComponentProps<typeof Ionicons>['name']> = {
  cherry: 'nutrition',
  star: 'star',
  moon: 'moon',
  crown: 'trophy',
  diamond: 'diamond',
  seven: 'sparkles',
};

export function ScratchGameScreen() {
  const { debit, completeGame, haptic } = useAppStore();
  const [bet, setBet] = useState(50);
  const [ticket, setTicket] = useState<ScratchTicket | null>(null);
  const ticketRef = useRef<ScratchTicket | null>(null);
  const recorded = useRef(false);
  const startingRef = useRef(false);
  const activeRoundRef = useRef<string | null>(null);

  const updateTicket = (next: ScratchTicket | null) => {
    ticketRef.current = next;
    setTicket(next);
  };

  const settle = (next: ScratchTicket, roundId: string) => {
    if (next.status === 'active' || activeRoundRef.current !== roundId || recorded.current) return;
    recorded.current = true;
    activeRoundRef.current = null;
    startingRef.current = false;
    completeGame({ roundId, game: 'scratch', bet: next.bet, payout: next.payout, result: next.payout > next.bet ? 'win' : next.payout === next.bet ? 'push' : 'loss', detail: next.winningSymbol ? `${next.winningSymbol}-${next.multiplier}x` : 'no-match' });
  };

  const start = () => {
    if (startingRef.current) return;
    startingRef.current = true;
    const roundId = debit(bet, 'scratch');
    if (!roundId) {
      startingRef.current = false;
      return;
    }
    recorded.current = false;
    activeRoundRef.current = roundId;
    updateTicket(createScratchTicket(bet));
  };

  const reveal = (index: number) => {
    const current = ticketRef.current;
    const roundId = activeRoundRef.current;
    if (!current || current.status !== 'active' || !roundId) return;
    const next = revealScratchCell(current, index);
    updateTicket(next);
    haptic(next.status === 'won' ? 'success' : 'selection');
    settle(next, roundId);
  };

  const revealAll = () => {
    const current = ticketRef.current;
    const roundId = activeRoundRef.current;
    if (!current || !roundId) return;
    const next = revealAllScratchCells(current);
    updateTicket(next);
    settle(next, roundId);
  };

  const cells = ticket?.cells ?? Array.from({ length: 9 }, (_, index) => ({ index, symbol: 'star' as ScratchSymbol, revealed: false }));
  const board = (
    <View style={styles.board}>
      <View style={styles.ticketHeader}><Text style={styles.ticketTitle}>MATCH THREE</Text><Text style={styles.ticketPrize}>{ticket ? `${ticket.multiplier || '?'}× prize` : 'Scratch to reveal'}</Text></View>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <Pressable
            accessibilityLabel={`Scratch panel ${cell.index + 1}${cell.revealed ? `, ${cell.symbol}` : ', hidden'}`}
            accessibilityHint={!cell.revealed && ticket?.status === 'active' ? 'Reveal this scratch panel' : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ticket || ticket.status !== 'active' || cell.revealed, selected: cell.revealed }}
            disabled={!ticket || ticket.status !== 'active' || cell.revealed}
            key={cell.index}
            onPress={() => reveal(cell.index)}
            style={({ pressed }) => [styles.cell, cell.revealed && styles.revealed, pressed && styles.pressed]}
          >
            {cell.revealed ? <><Ionicons color={colors.primaryDark} name={ICONS[cell.symbol]} size={28} />{cell.symbol === 'seven' && <Text style={styles.seven}>7</Text>}</> : <View style={styles.scratchCoat}><Ionicons color="rgba(255,255,255,.6)" name="help" size={23} /></View>}
          </Pressable>
        ))}
      </View>
      {ticket && ticket.status !== 'active' && <View accessibilityLiveRegion="polite" style={[styles.banner, ticket.status === 'won' ? styles.winBanner : styles.lossBanner]}><Text style={[styles.bannerText, ticket.status === 'won' && styles.winBannerText]}>{ticket.status === 'won' ? `Winner · +${formatCoins(ticket.payout - ticket.bet)} profit` : 'No match this time'}</Text></View>}
    </View>
  );

  const result = !ticket ? 'Buy a ticket, then reveal nine tactile panels' : ticket.status === 'active' ? `${ticket.cells.filter((cell) => cell.revealed).length} of 9 revealed` : ticket.status === 'won' ? `${ticket.winningSymbol} matched three · ${ticket.multiplier}×` : 'Every ticket is generated before the first reveal';

  return (
    <QuickGameFrame board={board} result={result} slug="scratch">
      {!ticket && <BetControl onChange={setBet} step={10} value={bet} />}
      {!ticket ? <ClayButton label="Buy Scratch Card" onPress={start} /> : ticket.status === 'active' ? <ClayButton colors={gradients.mint} edgeColor={colors.mintEdge} label="Reveal All" onPress={revealAll} /> : <ClayButton label="New Ticket" onPress={() => updateTicket(null)} />}
    </QuickGameFrame>
  );
}

export default ScratchGameScreen;

const styles = StyleSheet.create({
  board: { alignItems: 'center', height: 300, justifyContent: 'center', width: '100%' },
  ticketHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11, width: 268 },
  ticketTitle: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 13, letterSpacing: 1.3 },
  ticketPrize: { color: 'rgba(255,255,255,.72)', fontFamily: typography.uiBold, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, width: 267 },
  cell: { alignItems: 'center', backgroundColor: '#EFE8FB', borderRadius: 15, height: 82, justifyContent: 'center', overflow: 'hidden', width: 83 },
  revealed: { backgroundColor: colors.surface, borderBottomColor: '#D4CDEC', borderBottomWidth: 4 },
  scratchCoat: { alignItems: 'center', backgroundColor: 'rgba(143,124,247,.72)', borderRadius: 12, height: 66, justifyContent: 'center', width: 67 },
  seven: { color: colors.coralDark, fontFamily: typography.display, fontSize: 24, position: 'absolute' },
  pressed: { transform: [{ scale: 0.94 }] },
  banner: { borderRadius: 999, bottom: -12, paddingHorizontal: 18, paddingVertical: 8, position: 'absolute' },
  winBanner: { backgroundColor: colors.mintDark },
  winBannerText: { color: colors.text },
  lossBanner: { backgroundColor: colors.inkPurple },
  bannerText: { color: colors.surface, fontFamily: typography.uiBlack, fontSize: 13 },
});
