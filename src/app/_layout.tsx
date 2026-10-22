import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PingBanner } from '../components/PingBanner';
import { SyncAgent } from '../components/SyncAgent';
import { StoreProvider, useStore } from '../lib/store';
import { fonts } from '../theme';
import { ThemeProvider, useColors, useTheme } from '../theme/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { mode } = useTheme();
  const colors = useColors();
  const splash = { flex: 1, backgroundColor: colors.background };

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {fontsLoaded ? <Navigator /> : <View style={splash} />}
      <PingBanner />
    </>
  );
}

function Navigator() {
  const { ready } = useStore();
  const colors = useColors();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return (
    <>
      <SyncAgent />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="log/[date]" options={{ presentation: 'modal', title: 'Log your day' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
