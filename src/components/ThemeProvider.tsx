import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { useStore } from '../lib/store';
import { fontSets, ThemeContext, themes, type Scheme } from '../theme';

/** Picks the look, light or dark, and the font from the saved choices, falling back to the phone's own settings. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const system = useColorScheme();
  const choice = state.appearance ?? 'system';
  // Dark is the original look, so it wins when the phone doesn't say.
  const scheme: Scheme = choice === 'system' ? (system === 'light' ? 'light' : 'dark') : choice;
  // Unknown names (from a newer version's backup, say) fall back to the originals.
  const font = fontSets[state.font ?? 'phone'] ? (state.font ?? 'phone') : 'phone';
  const look = themes[state.theme ?? 'candle'] ?? themes.candle;
  const theme = useMemo(() => ({ scheme, colors: look[scheme], fonts: fontSets[font] }), [scheme, look, font]);

  useEffect(() => {
    // Lets the phone's own pop-ups (alerts, the keyboard) match a look picked in Settings.
    if (Platform.OS !== 'web') Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  }, [choice]);

  useEffect(() => {
    // The window behind the app shows during transitions and the keyboard sliding in.
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
