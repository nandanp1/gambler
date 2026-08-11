import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/AppStore';
import { colors } from '@/theme';

export default function IndexScreen() {
  const { state } = useAppStore();
  if (!state.hydrated) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primaryDark} size="large" /></View>;
  }
  return <Redirect href={state.hasCompletedOnboarding ? '/(tabs)/home' : '/onboarding'} />;
}

const styles = StyleSheet.create({ loading: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center' } });

