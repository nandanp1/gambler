import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, typography } from '@/theme';

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={21} color={colors.textFaint} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value.length > 0 && (
        <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={8} onPress={() => onChangeText('')} style={styles.clear}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: colors.inset,
    borderBottomColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 2,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    paddingHorizontal: 17,
  },
  input: { color: colors.text, flex: 1, fontFamily: typography.ui, fontSize: 16, paddingVertical: 0 },
  clear: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
});
