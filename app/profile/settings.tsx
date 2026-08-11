import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ClayButton } from '@/components/ClayButton';
import { ClayCard } from '@/components/ClayCard';
import { ClayToggle } from '@/components/ClayToggle';
import { GameHeader } from '@/components/GameHeader';
import { MenuRow } from '@/components/MenuRow';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/store/AppStore';
import { colors, gradients, radius, typography } from '@/theme';

export default function SettingsScreen() {
  const { state, updateSettings, resetData } = useAppStore();
  const confirmReset = () => Alert.alert(
    'Reset all data?',
    'This clears your fictional coins, rewards, achievements, settings and game history. It cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void resetData() },
    ],
  );

  return (
    <Screen bottomInset={36} scroll>
      <GameHeader title="Settings" />
      <View style={styles.content}>
        <Text style={styles.section}>Sound & haptics</Text>
        <View style={styles.group}>
          <MenuRow icon="volume-high" iconBackground="#E4F2FF" iconColor={colors.blueDark} right={<ClayToggle label="Sound" onValueChange={(sound) => updateSettings({ sound })} value={state.settings.sound} />} title="Sound" />
          <MenuRow icon="phone-portrait" iconBackground="#DFF7EF" iconColor={colors.mintDark} right={<ClayToggle label="Haptics" onValueChange={(haptics) => updateSettings({ haptics })} value={state.settings.haptics} />} title="Haptics" />
          <MenuRow icon="accessibility" iconBackground="#EDE7FF" iconColor={colors.primaryDark} right={<ClayToggle label="Reduced motion" onValueChange={(reducedMotion) => updateSettings({ reducedMotion })} value={state.settings.reducedMotion} />} subtitle="Shortens celebrations and game movement" title="Reduced Motion" />
        </View>

        <Text style={styles.section}>Appearance</Text>
        <ClayCard>
          <Text style={styles.themeTitle}>Clay palette</Text>
          <View style={styles.themeOptions}>
            {(['light', 'lavender'] as const).map((theme) => {
              const selected = state.settings.theme === theme;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={theme} onPress={() => updateSettings({ theme })} style={[styles.themeOption, selected && styles.themeSelected]}>
                  <View style={[styles.swatch, { backgroundColor: theme === 'light' ? colors.surface : colors.canvas }]} />
                  <Text style={[styles.themeText, selected && styles.themeTextSelected]}>{theme === 'light' ? 'Light Clay' : 'Lavender Clay'}</Text>
                  {selected && <Ionicons color={colors.primaryDark} name="checkmark-circle" size={19} />}
                </Pressable>
              );
            })}
          </View>
        </ClayCard>

        <Text style={styles.section}>Data</Text>
        <ClayButton colors={['#FF9E8E', '#F4695A']} edgeColor={colors.coralEdge} label="Reset Data" onPress={confirmReset} />
        <Text style={styles.disclaimer}>Nandan's Gambler uses fictional coins only. There are no deposits, withdrawals, purchases, or cash prizes.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 7 },
  section: { color: colors.textMuted, fontFamily: typography.uiExtra, fontSize: 12, letterSpacing: 0.7, marginBottom: 8, marginTop: 14, textTransform: 'uppercase' },
  group: { gap: 7 },
  themeTitle: { color: colors.text, fontFamily: typography.uiBlack, fontSize: 16, marginBottom: 12 },
  themeOptions: { gap: 8 },
  themeOption: { alignItems: 'center', backgroundColor: colors.inset, borderColor: 'transparent', borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: 10, minHeight: 48, paddingHorizontal: 11 },
  themeSelected: { borderColor: colors.primaryDark },
  swatch: { borderColor: '#D9D2F0', borderRadius: 10, borderWidth: 2, height: 28, width: 36 },
  themeText: { color: colors.textMuted, flex: 1, fontFamily: typography.uiExtra, fontSize: 13.5 },
  themeTextSelected: { color: colors.text },
  disclaimer: { color: colors.textMuted, fontFamily: typography.uiBold, fontSize: 12, lineHeight: 18, marginTop: 16, paddingHorizontal: 8, textAlign: 'center' },
});
