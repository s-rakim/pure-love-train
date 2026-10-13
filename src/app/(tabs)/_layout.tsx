import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { useStore } from '../../lib/store';
import { colors, fonts } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, activeIcon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? activeIcon : icon} size={24} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.flame,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surfaceWarm,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={tab('Us', 'heart-outline', 'heart')} />
      <Tabs.Screen name="moments" options={tab('Moments', 'camera-outline', 'camera')} />
      <Tabs.Screen
        name="cycle"
        options={{ ...tab('Cycle', 'water-outline', 'water'), href: state.cycle.tracking ? undefined : null }}
      />
      <Tabs.Screen name="together" options={tab('Together', 'sparkles-outline', 'sparkles')} />
    </Tabs>
  );
}
