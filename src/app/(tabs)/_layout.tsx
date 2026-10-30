import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '../../components/ui';
import { useStore } from '../../lib/store';
import { TAB_BAR_HEIGHT, tabBarBottom, useTheme } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, activeIcon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? activeIcon : icon} size={24} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { colors, fonts } = useTheme();
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.flame,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { ...fonts.bodyMedium, fontSize: 11 },
        // A rounded bar that floats above the content, like a dock, clear of the phone's own buttons.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: tabBarBottom(insets.bottom),
          height: TAB_BAR_HEIGHT,
          paddingTop: 10,
          paddingBottom: 12,
          borderRadius: 34,
          borderTopWidth: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => <Glass radius={34} />,
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
