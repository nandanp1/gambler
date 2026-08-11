import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'warning';

export const playHaptic = async (kind: HapticKind, enabled = true): Promise<void> => {
  if (!enabled) return;
  try {
    if (kind === 'selection') await Haptics.selectionAsync();
    else if (kind === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else await Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics can be unavailable on emulators and older devices.
  }
};
