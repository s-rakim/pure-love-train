import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { useStore } from '../lib/store';
import { fontSets, palettes, ThemeContext, type Scheme } from '../theme';

/** Picks light or dark (and the font) from the saved choices, falling back to the phone's own settings. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const system = useColorScheme();
  const choice = state.appearance ?? 'system';
  // Dark is the original look, so it wins when the phone doesn't say.
  const scheme: Scheme = choice === 'system' ? (system === 'light' ? 'light' : 'dark') : choice;
  const font = state.font ?? 'phone';
  const theme = useMemo(() => ({ scheme, colors: palettes[scheme], fonts: fontSets[font] }), [scheme, font]);

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
