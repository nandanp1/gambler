import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts as useBalooFonts, Baloo2_600SemiBold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  useFonts as useNunitoFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

import { AppToast } from '@/components/AppToast';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { state, forfeitPendingRound } = useAppStore();
  const pathname = usePathname();
  const segments = useSegments();
  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    if (state.hydrated && state.pendingRound && pathname !== `/game/${state.pendingRound.game}`) {
      forfeitPendingRound(state.pendingRound.id);
    }
  }, [forfeitPendingRound, pathname, state.hydrated, state.pendingRound]);

  if (!state.hydrated) {
    return (
      <View accessibilityLabel="Loading your saved arcade" accessibilityRole="progressbar" style={styles.loading}>
        <ActivityIndicator color={colors.primaryDark} size="large" />
      </View>
    );
  }
  if (!state.hasCompletedOnboarding && !inOnboarding) return <Redirect href="/onboarding" />;
  if (state.hasCompletedOnboarding && inOnboarding) return <Redirect href="/(tabs)/home" />;

  return (
    <>
      <Stack
        screenOptions={{
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.canvas },
          gestureEnabled: false,
          headerShown: false,
        }}
      />
      <AppToast />
    </>
  );
}

export default function RootLayout() {
  const [balooLoaded] = useBalooFonts({ Baloo2_600SemiBold, Baloo2_800ExtraBold });
  const [nunitoLoaded] = useNunitoFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const fontsLoaded = balooLoaded && nunitoLoaded;

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStoreProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AppStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.canvas, flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center' },
});
