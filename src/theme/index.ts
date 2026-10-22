// Shared design tokens: fonts, radius, spacing. Colours live in ./theme and
// switch between the dark and light palettes through ThemeProvider (theme.tsx).

export const fonts = {
  display: 'DMSans_700Bold',
  displayItalic: 'DMSans_500Medium',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const space = (n: number) => n * 4;

/** Room left under scrolling content for the floating tab bar. */
export const TAB_BAR_SPACE = 120;
