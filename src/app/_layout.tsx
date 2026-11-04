import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes/400Regular';
import { Quicksand_500Medium } from '@expo-google-fonts/quicksand/500Medium';
import { Quicksand_600SemiBold } from '@expo-google-fonts/quicksand/600SemiBold';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotifyAgent } from '../components/NotifyAgent';
import { SyncAgent } from '../components/SyncAgent';
import { ThemeProvider } from '../components/ThemeProvider';
import { WidgetAgent } from '../components/WidgetAgent';
import { StoreProvider, useStore } from '../lib/store';
import { useTheme } from '../theme';

// Opening a moment straight from the widget still leaves the tabs underneath to go back to.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    GreatVibes_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    BebasNeue_400Regular,
  });

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>{fontsLoaded ? <Navigator /> : <Blank />}</ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Blank() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

function Navigator() {
  const { scheme, colors, fonts } = useTheme();
  const { ready } = useStore();
  if (!ready) return <Blank />;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SyncAgent />
      <WidgetAgent />
      <NotifyAgent />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { ...fonts.display, fontSize: 18 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="log/[date]" options={{ presentation: 'modal', title: 'Log your day' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="coupons" options={{ title: 'Love coupons' }} />
        <Stack.Screen name="this-or-that" options={{ title: 'This or that' }} />
        <Stack.Screen name="letters" options={{ title: 'Open when…' }} />
        <Stack.Screen name="moment/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="once/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}
