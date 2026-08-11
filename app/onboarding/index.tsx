import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';

import { ClayButton } from '@/components/ClayButton';
import { OnboardingArtwork } from '@/components/OnboardingArtwork';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, typography } from '@/theme';

const PAGES = [
  { title: 'Pick your game.', body: 'Twenty-two original games, from blackjack to plinko, all in one tidy arcade.' },
  { title: 'Play your way.', body: 'Set your stake, choose your risk level, and change your mind whenever you like.' },
  { title: 'Collect rewards.', body: 'Daily bonuses, streaks and achievements use fictional coins only—there are no purchases, withdrawals or cash prizes.' },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useAppStore();
  const listRef = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const finishingRef = useRef(false);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    completeOnboarding();
  }, [completeOnboarding]);

  const next = () => {
    if (page === PAGES.length - 1) finish();
    else listRef.current?.scrollToIndex({ index: page + 1, animated: true });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (typeof viewableItems[0]?.index === 'number') setPage(viewableItems[0].index);
  }).current;

  return (
    <Screen bottomInset={18}>
      <View style={styles.topRow}>
        <View />
        {page < 2 && <Pressable accessibilityRole="button" accessibilityState={{ disabled: finishing }} disabled={finishing} onPress={finish} hitSlop={12}><Text style={styles.skip}>Skip</Text></Pressable>}
      </View>
      <FlatList
        data={PAGES}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ index, length: width, offset: width * index })}
        horizontal
        keyExtractor={(item) => item.title}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        ref={listRef}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width }]}>
            <OnboardingArtwork page={index} />
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      />
      <View style={styles.footer}>
        <View accessibilityLabel={`Page ${page + 1} of 3`} style={styles.dots}>
          {PAGES.map((item, index) => <View key={item.title} style={[styles.dot, index === page && styles.activeDot]} />)}
        </View>
        <ClayButton label={page === 2 ? 'Get Started' : 'Next'} loading={finishing} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'center', flexDirection: 'row', height: 46, justifyContent: 'space-between', paddingHorizontal: 26 },
  list: { flex: 1 },
  skip: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 15 },
  page: { flex: 1 },
  copy: { paddingHorizontal: 34, paddingTop: 7 },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 38, letterSpacing: -0.5, lineHeight: 42 },
  body: { color: colors.textSoft, fontFamily: typography.ui, fontSize: 17, lineHeight: 25.5, marginTop: 12 },
  footer: { paddingHorizontal: 30 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 25 },
  dot: { backgroundColor: '#D8D2F0', borderRadius: radius.pill, height: 9, width: 9 },
  activeDot: { backgroundColor: colors.primaryDark, width: 30 },
});
