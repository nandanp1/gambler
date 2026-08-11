import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router, usePathname } from 'expo-router';

import { useAppStore } from '@/store/AppStore';

export function useGameExitGuard() {
  const pathname = usePathname();
  const { state, forfeitPendingRound } = useAppStore();
  const promptOpen = useRef(false);
  const pendingRoundId = pathname.startsWith('/game/') ? state.pendingRound?.id ?? null : null;
  const hasPendingGame = pendingRoundId !== null;

  const leaveRoute = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/games');
  }, []);

  const requestExit = useCallback(() => {
    if (!pendingRoundId) {
      leaveRoute();
      return;
    }
    if (promptOpen.current) return;
    promptOpen.current = true;
    Alert.alert(
      'Forfeit this round?',
      'Leaving now settles the active wager as a loss. You can stay and finish the round instead.',
      [
        { text: 'Stay', style: 'cancel', onPress: () => { promptOpen.current = false; } },
        {
          text: 'Forfeit & Leave',
          style: 'destructive',
          onPress: () => {
            const forfeited = forfeitPendingRound(pendingRoundId);
            promptOpen.current = false;
            if (forfeited) {
              leaveRoute();
              return;
            }
            Alert.alert(
              'Round changed',
              'That wager finished while the confirmation was open. Press Back again to leave safely.',
            );
          },
        },
      ],
      { cancelable: true, onDismiss: () => { promptOpen.current = false; } },
    );
  }, [forfeitPendingRound, leaveRoute, pendingRoundId]);

  useEffect(() => {
    if (!hasPendingGame) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => subscription.remove();
  }, [hasPendingGame, requestExit]);

  return requestExit;
}
