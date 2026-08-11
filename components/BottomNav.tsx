import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/AppStore';
import { clayShadow, colors, gradients, radius, typography } from '@/theme';

interface TabRoute {
  key: string;
  name: string;
}

interface BottomNavProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: unknown;
  navigation: {
    emit: (...args: any[]) => any;
    navigate: (...args: any[]) => void;
  };
}

const META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  home: { label: 'Home', icon: 'home-outline' },
  games: { label: 'Games', icon: 'grid-outline' },
  rewards: { label: 'Rewards', icon: 'gift-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

function NavItem({ route, focused, onPress, onLongPress }: { route: TabRoute; focused: boolean; onPress: () => void; onLongPress: () => void }) {
  const progress = useSharedValue(focused ? 1 : 0);
  const meta = META[route.name] ?? { label: route.name, icon: 'ellipse-outline' as const };

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 250, mass: 0.7 });
  }, [focused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + progress.value * 0.06 }, { translateY: -progress.value * 1 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      onLongPress={onLongPress}
      onPress={onPress}
      style={styles.itemPressable}
    >
      <Animated.View style={[styles.item, animatedStyle]}>
        {focused ? (
          <LinearGradient colors={gradients.primary} style={styles.selected}>
            <Ionicons color={colors.surface} name={meta.icon.replace('-outline', '') as React.ComponentProps<typeof Ionicons>['name']} size={21} />
            <Text style={[styles.label, styles.selectedLabel]}>{meta.label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.inactive}>
            <Ionicons color="#6F6A8C" name={meta.icon} size={21} />
            <Text style={styles.label}>{meta.label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function BottomNav({ state, descriptors: _descriptors, navigation }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const { haptic } = useAppStore();
  return (
    <View pointerEvents="box-none" style={[styles.host, { height: 96 + insets.bottom }]}>
      <View style={[styles.outer, { bottom: Math.max(10, insets.bottom + 6) }]}>
        <LinearGradient colors={gradients.surface} style={styles.bar}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <NavItem
                focused={focused}
                key={route.key}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    haptic('selection');
                    navigation.navigate(route.name);
                  }
                }}
                route={route}
              />
            );
          })}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  outer: { borderRadius: 30, left: 16, position: 'absolute', right: 16, ...clayShadow('rgba(84,64,170,0.3)', 10) },
  bar: { alignItems: 'center', borderRadius: 30, borderTopColor: colors.surface, borderTopWidth: 2, flexDirection: 'row', gap: 5, height: 72, paddingHorizontal: 9 },
  itemPressable: { flex: 1 },
  item: { height: 56 },
  selected: { alignItems: 'center', borderRadius: radius.control + 2, borderTopColor: 'rgba(255,255,255,.45)', borderTopWidth: 2, flex: 1, justifyContent: 'center', paddingTop: 2 },
  inactive: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingTop: 2 },
  label: { color: '#6F6A8C', fontFamily: typography.uiExtra, fontSize: 10.5, marginTop: 1 },
  selectedLabel: { color: colors.surface },
});
