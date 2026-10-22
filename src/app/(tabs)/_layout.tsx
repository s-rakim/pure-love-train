import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { useStore } from '../../lib/store';
import { fonts } from '../../theme';
import { useColors } from '../../theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, activeIcon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? activeIcon : icon} size={24} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { state } = useStore();
  const colors = useColors();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.flame,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        // A rounded bar that floats above the content, like a dock.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 20,
          height: 74,
          paddingTop: 10,
          paddingBottom: 12,
          borderRadius: 34,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.line,
          borderTopColor: colors.line,
          backgroundColor: colors.surface,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'flame-outline', 'flame')} />
      <Tabs.Screen name="connect" options={tab('Connect', 'chatbubbles-outline', 'chatbubbles')} />
      <Tabs.Screen name="moments" options={tab('Moments', 'camera-outline', 'camera')} />
      <Tabs.Screen
        name="cycle"
        options={{ ...tab('Cycle', 'water-outline', 'water'), href: state.cycle.tracking ? undefined : null }}
      />
      <Tabs.Screen name="us" options={tab('Us', 'heart-outline', 'heart')} />
    </Tabs>
  );
}
