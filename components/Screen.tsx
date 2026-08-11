import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { useAppStore } from '@/store/AppStore';

interface ScreenProps extends React.PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = false, padded = false, bottomInset = 24, style, contentStyle }: ScreenProps) {
  const { state } = useAppStore();
  const insets = useSafeAreaInsets();
  const backgroundColor = state.settings.theme === 'light' ? '#FCFBFF' : colors.canvas;
  const content = [styles.content, padded && styles.padded, { paddingBottom: bottomInset + insets.bottom }, contentStyle];
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor }, style]}>
      {scroll ? (
        <ScrollView
          bounces
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  content: { flexGrow: 1 },
  padded: { paddingHorizontal: 20 },
});
