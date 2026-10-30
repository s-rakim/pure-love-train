import { createContext, useContext } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

export type Scheme = 'light' | 'dark';
export type AppearancePref = 'system' | Scheme;
/** Type in whatever font the phone uses, or in DM Sans, the original look. */
export type FontPref = 'phone' | 'classic';

// Candlelit at night: near-black surfaces, warm off-white text and a bright flame accent.
const dark = {
  background: '#0B0A09',
  /** Top of the screen background; it fades into `background`. */
  glow: '#0B0A09',
  surface: '#191615',
  surfaceRaised: '#231F1D',
  surfaceWarm: '#141110',
  ink: '#FFF6EE',
  inkSoft: '#CDBFB6',
  muted: '#8C807A',
  line: '#2D2826',
  flame: '#FF6B2C',
  flameDeep: '#FF9A5C',
  flameSoft: '#2E1B12',
  blush: '#4A2A22',
  ember: '#FFB938',
  emberSoft: '#2A2113',
  sage: '#1D3A29',
  sageDeep: '#6FD39A',
  fertile: '#24583B',
  plum: '#B77CF2',
  plumSoft: '#231A2D',
  sky: '#5BB8FF',
  skySoft: '#132131',
  rose: '#FF5C8A',
  roseSoft: '#2E1520',
  /** Icons sitting on a solid accent swatch. */
  onAccent: '#0B0A09',
  /** The flame mascot once the streak has gone out. */
  ash: '#4A3F3A',
  ashSoft: '#6B5E57',
  /** A faint wash to set a box apart inside a tinted card. */
  wash: 'rgba(0,0,0,0.25)',
  /** Frosted glass for things that float over the page: the tab bar and sheets. */
  glass: 'rgba(25,22,21,0.82)',
  glassRim: 'rgba(255,255,255,0.10)',
  glassSheen: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

export type Palette = { [K in keyof typeof dark]: string };

// Soft and romantic by day: a whisper of blush, white cards and a rose accent, kept light so it never gets loud.
const light: Palette = {
  background: '#FFF6F8',
  glow: '#FFE7EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FCEEF2',
  surfaceWarm: '#FFFAFB',
  ink: '#2E1A22',
  inkSoft: '#654C57',
  muted: '#A08893',
  line: '#F4E1E7',
  flame: '#E8577E',
  flameDeep: '#B93A60',
  flameSoft: '#FFE6ED',
  blush: '#FAD3DE',
  ember: '#F2A65A',
  emberSoft: '#FFF1E2',
  sage: '#E6F4EC',
  sageDeep: '#3A9B6B',
  fertile: '#C9EAD6',
  plum: '#9A66D9',
  plumSoft: '#F4ECFD',
  sky: '#5B8FE0',
  skySoft: '#EAF1FD',
  rose: '#DD4B6B',
  roseSoft: '#FDE7EC',
  onAccent: '#FFFFFF',
  ash: '#E8D3DA',
  ashSoft: '#F3E4E9',
  wash: 'rgba(232,87,126,0.07)',
  glass: 'rgba(255,255,255,0.76)',
  glassRim: 'rgba(232,87,126,0.16)',
  glassSheen: 'rgba(255,255,255,0.6)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

export const palettes: Record<Scheme, Palette> = { dark, light };

type FontStyle = Pick<TextStyle, 'fontFamily' | 'fontWeight'>;
export type Fonts = Record<'display' | 'body' | 'bodyMedium' | 'bodyBold', FontStyle>;

/*
 * Styles spread one of these (`...fonts.bodyBold`) rather than naming a font file,
 * so the same screens work in either set.
 */
export const fontSets: Record<FontPref, Fonts> = {
  // No family at all, so Android draws the text in the phone's own font, the same as its home screen.
  phone: {
    display: { fontWeight: '700' },
    body: { fontWeight: '400' },
    bodyMedium: { fontWeight: '500' },
    bodyBold: { fontWeight: '700' },
  },
  classic: {
    display: { fontFamily: 'DMSans_700Bold' },
    body: { fontFamily: 'DMSans_400Regular' },
    bodyMedium: { fontFamily: 'DMSans_500Medium' },
    bodyBold: { fontFamily: 'DMSans_700Bold' },
  },
};

export type Theme = { scheme: Scheme; colors: Palette; fonts: Fonts };

export const ThemeContext = createContext<Theme>({ scheme: 'dark', colors: dark, fonts: fontSets.phone });

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a hook that returns a stylesheet for the current palette and fonts. Each
 * combination is built once, so switching back and forth is free.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(build: (colors: Palette, fonts: Fonts) => T) {
  const cache = new Map<Palette, Map<Fonts, T>>();
  return function useStyles(): T {
    const { colors, fonts } = useTheme();
    let sheets = cache.get(colors);
    if (!sheets) cache.set(colors, (sheets = new Map()));
    let sheet = sheets.get(fonts);
    if (!sheet) {
      sheet = StyleSheet.create(build(colors, fonts));
      sheets.set(fonts, sheet);
    }
    return sheet;
  };
}

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const space = (n: number) => n * 4;

// Shadows barely read on black, so cards lean on a hairline border instead.
export const shadow = (colors: Palette) => ({ borderWidth: 1, borderColor: colors.line }) as const;

export const TAB_BAR_HEIGHT = 74;

/** How far the floating tab bar sits above the bottom edge, clear of the phone's own navigation buttons. */
export const tabBarBottom = (bottomInset: number) => Math.max(20, bottomInset + 10);

/** Room left under scrolling content so the last card clears the floating tab bar. */
export const tabBarSpace = (bottomInset: number) => tabBarBottom(bottomInset) + TAB_BAR_HEIGHT + 26;
