import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { colors, typography } from '@/theme';
import type { GameArt } from '@/types';

const MiniCard = ({ rank, red, rotate }: { rank: string; red?: boolean; rotate: string }) => (
  <View style={[styles.card, { transform: [{ rotate }] }]}>
    <Text style={[styles.cardRank, red && styles.red]}>{rank}</Text>
    <Text style={[styles.cardSuit, red && styles.red]}>{red ? '♥' : '♠'}</Text>
  </View>
);

const Die = ({ rotate = '0deg', one = false }: { rotate?: string; one?: boolean }) => (
  <View style={[styles.die, { transform: [{ rotate }] }]}>
    <View style={[styles.dot, styles.dotA]} />
    {!one && <View style={[styles.dot, styles.dotB]} />}
    {!one && <View style={[styles.dot, styles.dotC]} />}
    {!one && <View style={[styles.dot, styles.dotD]} />}
    {!one && <View style={[styles.dot, styles.dotE]} />}
  </View>
);

const CardsArt = ({ poker = false }: { poker?: boolean }) => (
  <View style={styles.artCenter}>
    <MiniCard rank={poker ? 'Q' : 'A'} rotate="-15deg" />
    <MiniCard rank={poker ? 'K' : 'J'} red rotate="10deg" />
    {poker && <View style={styles.thirdCard}><Text style={styles.cardRank}>A</Text></View>}
  </View>
);

const DiceArt = () => (
  <View style={styles.artCenter}>
    <Die rotate="-12deg" />
    <View style={styles.dieOffset}><Die rotate="14deg" one /></View>
  </View>
);

const MinesArt = () => (
  <View style={styles.minesWrap}>
    <View style={styles.miniGrid}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={[styles.miniTile, index === 4 && styles.revealedTile]} />)}</View>
    <Ionicons name="diamond" color="#D7FFF4" size={48} style={styles.largeGem} />
    <View style={styles.mineBall}><View style={styles.mineFuse} /></View>
  </View>
);

const PlinkoArt = () => (
  <View style={styles.plinkoWrap}>
    <View style={styles.plinkoBall} />
    {[3, 4, 5].map((count, row) => (
      <View key={count} style={[styles.pegRow, { top: 39 + row * 25 }]}>
        {Array.from({ length: count }, (_, index) => <View key={index} style={[styles.peg, { backgroundColor: [colors.pink, colors.yellow, colors.mint][index % 3] }]} />)}
      </View>
    ))}
    <View style={styles.bucketRow}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={[styles.bucket, index === 2 && styles.goldBucket]} />)}</View>
  </View>
);

const SlotsArt = () => (
  <View style={styles.slotMachine}>
    <View style={styles.reel}><Text style={[styles.reelText, { color: colors.primaryDark }]}>7</Text></View>
    <View style={styles.reel}><Ionicons name="heart" color={colors.pinkDark} size={21} /></View>
    <View style={styles.reel}><Ionicons name="diamond" color={colors.blueDark} size={21} /></View>
    <View style={styles.slotHandle} />
    <View style={styles.slotKnob} />
  </View>
);

const WheelArt = ({ roulette = false }: { roulette?: boolean }) => (
  <View style={styles.wheelShadow}>
    <Svg height="112" viewBox="0 0 112 112" width="112">
      <Circle cx="56" cy="56" fill="#F3EEFF" r="54" />
      <G origin="56,56">
        {Array.from({ length: roulette ? 12 : 8 }, (_, index) => {
          const count = roulette ? 12 : 8;
          const angle = (Math.PI * 2 * index) / count;
          const next = (Math.PI * 2 * (index + 1)) / count;
          const x1 = 56 + 43 * Math.cos(angle);
          const y1 = 56 + 43 * Math.sin(angle);
          const x2 = 56 + 43 * Math.cos(next);
          const y2 = 56 + 43 * Math.sin(next);
          const fill = roulette
            ? (index % 2 ? colors.rouletteBlack : colors.red)
            : [colors.pink, colors.yellow, colors.mint, colors.blue][index % 4]!;
          return <Path d={`M56 56 L${x1} ${y1} A43 43 0 0 1 ${x2} ${y2} Z`} fill={fill} key={index} />;
        })}
      </G>
      <Circle cx="56" cy="56" fill={roulette ? colors.yellowDark : colors.surface} r="17" />
      <Circle cx="56" cy="56" fill="none" r="51" stroke="rgba(255,255,255,.7)" strokeWidth="4" />
    </Svg>
  </View>
);

const RocketArt = () => (
  <View style={styles.rocketWrap}>
    <Svg height="120" viewBox="0 0 160 120" width="160">
      <Path d="M10 108 C52 102 75 72 92 42" fill="none" stroke="rgba(255,255,255,.55)" strokeDasharray="2 11" strokeLinecap="round" strokeWidth="6" />
    </Svg>
    <View style={styles.rocket}><View style={styles.rocketWindow} /></View>
    <View style={styles.rocketFlame} />
  </View>
);

const TowerArt = ({ dragon = false }: { dragon?: boolean }) => (
  <View style={styles.towerWrap}>
    {[0, 1, 2, 3].map((row) => (
      <View key={row} style={[styles.towerRow, { width: 68 + row * 22 }]}>
        {Array.from({ length: 3 }, (_, index) => <View key={index} style={[styles.towerTile, index === (row + 1) % 3 && styles.towerSafe]} />)}
      </View>
    ))}
    {dragon && <Ionicons name="flame" color={colors.yellow} size={30} style={styles.dragonFlame} />}
  </View>
);

const KenoArt = () => (
  <View style={styles.ballCloud}>
    {[7, 12, 23, 31, 40].map((number, index) => <View key={number} style={[styles.numberBall, { left: 12 + (index % 3) * 40, top: 8 + Math.floor(index / 3) * 46 }]}><Text style={styles.numberText}>{number}</Text></View>)}
  </View>
);

const CoinArt = () => (
  <View style={styles.coinArt}><Text style={styles.coinLetter}>C</Text><View style={styles.coinGleam} /></View>
);

const GenericIconArt = ({ name, secondary }: { name: React.ComponentProps<typeof Ionicons>['name']; secondary?: React.ComponentProps<typeof Ionicons>['name'] }) => (
  <View style={styles.genericWrap}>
    <View style={styles.iconClay}><Ionicons color={colors.inkPurple} name={name} size={44} /></View>
    {secondary && <View style={styles.secondaryIcon}><Ionicons color={colors.surface} name={secondary} size={25} /></View>}
  </View>
);

export function GameArtwork({ art }: { art: GameArt }) {
  switch (art) {
    case 'cards': return <CardsArt />;
    case 'poker': return <CardsArt poker />;
    case 'baccarat': return <View style={styles.baccarat}><MiniCard rank="8" rotate="-12deg" /><MiniCard rank="9" red rotate="12deg" /></View>;
    case 'dice': return <DiceArt />;
    case 'mines': return <MinesArt />;
    case 'plinko': return <PlinkoArt />;
    case 'slots': return <SlotsArt />;
    case 'roulette': return <WheelArt roulette />;
    case 'wheel': return <WheelArt />;
    case 'rocket': return <RocketArt />;
    case 'tower': return <TowerArt />;
    case 'dragon': return <TowerArt dragon />;
    case 'keno': return <KenoArt />;
    case 'coin': return <CoinArt />;
    case 'diamond': return <GenericIconArt name="diamond" secondary="sparkles" />;
    case 'hands': return <GenericIconArt name="hand-left" secondary="cut" />;
    case 'scratch': return <GenericIconArt name="ticket" secondary="sparkles" />;
    case 'cups': return <GenericIconArt name="beaker" secondary="ellipse" />;
    case 'red-dog': return <GenericIconArt name="paw" secondary="albums" />;
    case 'number': return <View style={styles.multiplier}><Text style={styles.multiplierText}>2.00×</Text></View>;
    case 'hilo': return <View style={styles.hiloWrap}><MiniCard rank="8" rotate="-8deg" /><Ionicons color={colors.surface} name="swap-vertical" size={34} /></View>;
    default: return <GenericIconArt name="game-controller" />;
  }
}

const styles = StyleSheet.create({
  artCenter: { alignItems: 'center', flexDirection: 'row', height: '100%', justifyContent: 'center' },
  card: { backgroundColor: '#F7F3FF', borderRadius: 11, height: 78, justifyContent: 'space-between', marginHorizontal: -8, padding: 8, shadowColor: '#3A2040', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 7, width: 55 },
  thirdCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, height: 69, justifyContent: 'center', marginLeft: -15, transform: [{ rotate: '16deg' }], width: 48 },
  cardRank: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 15 },
  cardSuit: { alignSelf: 'flex-end', color: colors.text, fontFamily: typography.uiBlack, fontSize: 19 },
  red: { color: colors.red },
  die: { backgroundColor: '#F3EEFF', borderRadius: 18, height: 66, shadowColor: '#244975', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.3, shadowRadius: 7, width: 66 },
  dieOffset: { bottom: 18, position: 'absolute', right: 28 },
  dot: { backgroundColor: '#3A2E6B', borderRadius: 6, height: 11, position: 'absolute', width: 11 },
  dotA: { left: 12, top: 12 }, dotB: { right: 12, top: 12 }, dotC: { left: 27, top: 27 }, dotD: { bottom: 12, left: 12 }, dotE: { bottom: 12, right: 12 },
  minesWrap: { flex: 1 },
  miniGrid: { bottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 5, left: 15, position: 'absolute', width: 92 },
  miniTile: { backgroundColor: 'rgba(255,255,255,.28)', borderRadius: 7, height: 26, width: 26 },
  revealedTile: { backgroundColor: 'rgba(24,143,112,.55)' },
  largeGem: { left: 47, position: 'absolute', top: 15 },
  mineBall: { backgroundColor: colors.rouletteBlack, borderRadius: 18, bottom: 31, height: 34, position: 'absolute', right: 18, width: 34 },
  mineFuse: { backgroundColor: colors.yellow, borderRadius: 3, height: 14, left: 23, position: 'absolute', top: -10, transform: [{ rotate: '24deg' }], width: 5 },
  plinkoWrap: { flex: 1 },
  plinkoBall: { alignSelf: 'center', backgroundColor: '#F5F0FF', borderRadius: 13, height: 26, position: 'absolute', top: 12, width: 26 },
  pegRow: { alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', width: '78%' },
  peg: { borderRadius: 6, height: 11, width: 11 },
  bucketRow: { bottom: 12, flexDirection: 'row', gap: 5, left: 12, position: 'absolute', right: 12 },
  bucket: { backgroundColor: 'rgba(255,255,255,.32)', borderRadius: 7, flex: 1, height: 22 },
  goldBucket: { backgroundColor: colors.yellow },
  slotMachine: { alignItems: 'center', backgroundColor: '#F3EDFB', borderRadius: 20, flexDirection: 'row', gap: 5, height: 88, left: 20, paddingHorizontal: 9, position: 'absolute', top: 25, width: 120 },
  reel: { alignItems: 'center', backgroundColor: '#E7E0F7', borderRadius: 8, height: 50, justifyContent: 'center', width: 27 },
  reelText: { fontFamily: typography.display, fontSize: 23 },
  slotHandle: { backgroundColor: colors.yellowDark, borderRadius: 6, height: 35, position: 'absolute', right: -14, top: 21, width: 11 },
  slotKnob: { backgroundColor: colors.coralDark, borderRadius: 10, height: 20, position: 'absolute', right: -18, top: 10, width: 20 },
  wheelShadow: { alignSelf: 'center', marginTop: 9, shadowColor: '#244975', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 9 },
  rocketWrap: { flex: 1 },
  rocket: { backgroundColor: '#F3EEFF', borderRadius: 22, height: 70, position: 'absolute', right: 40, top: 18, transform: [{ rotate: '34deg' }], width: 40 },
  rocketWindow: { alignSelf: 'center', backgroundColor: colors.blue, borderRadius: 9, height: 18, marginTop: 15, width: 18 },
  rocketFlame: { backgroundColor: colors.coralDark, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, height: 26, position: 'absolute', right: 28, top: 73, transform: [{ rotate: '34deg' }], width: 20 },
  towerWrap: { alignItems: 'center', flex: 1, flexDirection: 'column-reverse', justifyContent: 'center', paddingTop: 10 },
  towerRow: { flexDirection: 'row', gap: 5, marginTop: 4 },
  towerTile: { backgroundColor: 'rgba(255,255,255,.32)', borderRadius: 7, flex: 1, height: 22 },
  towerSafe: { backgroundColor: 'rgba(255,255,255,.8)' },
  dragonFlame: { position: 'absolute', right: 23, top: 20 },
  ballCloud: { flex: 1, position: 'relative' },
  numberBall: { alignItems: 'center', backgroundColor: '#F6F1FF', borderRadius: 21, height: 42, justifyContent: 'center', position: 'absolute', shadowColor: '#742B59', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 5, width: 42 },
  numberText: { color: colors.primaryDark, fontFamily: typography.uiBlack, fontSize: 13 },
  coinArt: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.yellowDark, borderColor: '#FFECA9', borderRadius: 55, borderWidth: 8, height: 110, justifyContent: 'center', marginTop: 13, shadowColor: '#8B5900', shadowOffset: { width: 0, height: 11 }, shadowOpacity: 0.32, shadowRadius: 8, width: 110 },
  coinLetter: { color: '#B8791A', fontFamily: typography.display, fontSize: 48 },
  coinGleam: { backgroundColor: 'rgba(255,255,255,.55)', borderRadius: 3, height: 6, position: 'absolute', right: 22, top: 18, transform: [{ rotate: '-25deg' }], width: 24 },
  genericWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  iconClay: { alignItems: 'center', backgroundColor: '#F4EEFF', borderRadius: 26, height: 92, justifyContent: 'center', shadowColor: '#3D2B66', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 8, transform: [{ rotate: '-8deg' }], width: 92 },
  secondaryIcon: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 22, bottom: 21, height: 44, justifyContent: 'center', position: 'absolute', right: 25, width: 44 },
  multiplier: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  multiplierText: { color: colors.surface, fontFamily: typography.display, fontSize: 40, textShadowColor: 'rgba(50,25,120,.35)', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 7 },
  hiloWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 24, justifyContent: 'center' },
  baccarat: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center' },
});
