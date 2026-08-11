import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BalancePill } from '@/components/BalancePill';
import { colors, typography } from '@/theme';

export function PageHeader({ title, accessory = <BalancePill /> }: { title: string; accessory?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 58 },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 30, letterSpacing: -0.3 },
});
