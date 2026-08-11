import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BalancePill } from '@/components/BalancePill';
import { ClayIconButton } from '@/components/ClayIconButton';
import { colors, typography } from '@/theme';
import { useGameExitGuard } from '@/utils/useGameExitGuard';

export function GameHeader({ title }: { title: string }) {
  const requestExit = useGameExitGuard();
  return (
    <View style={styles.header}>
      <ClayIconButton name="chevron-back" accessibilityLabel="Go back" onPress={requestExit} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <BalancePill compact />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.uiBlack,
    fontSize: 18,
    marginHorizontal: 8,
    textAlign: 'center',
  },
});
