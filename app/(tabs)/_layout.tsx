import React from 'react';
import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="games" options={{ title: 'Games' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

