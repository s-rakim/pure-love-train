import { createContext, useContext } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

export type Scheme = 'light' | 'dark';
export type AppearancePref = 'system' | Scheme;
/**
 * Type in whatever font the phone uses, in DM Sans (the original look), in Quicksand, or the
 * phone's font with titles in Great Vibes or Bebas Neue.
 */
export type FontPref = 'phone' | 'classic' | 'script' | 'rounded' | 'bebas';
/** The colours: Candle (the original) or one of the lilac looks. Each comes in light and dark. */
export type ThemeName = 'candle' | 'lilac' | 'lavender' | 'misty';

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

// Lilac: lilac mist with white cards and the orange flame kept, as in the lilac mockup.
const lilacLight: Palette = {
  background: '#EFE8F8',
  glow: '#E4D7F7',
  surface: '#FFFFFF',
  surfaceRaised: '#F6F1FC',
  surfaceWarm: '#FBF8FE',
  ink: '#2A2140',
  inkSoft: '#5B5070',
  muted: '#968CAB',
  line: '#E4DAF2',
  flame: '#E8622C',
  flameDeep: '#C24A17',
  flameSoft: '#FCE6DA',
  blush: '#F3D9E8',
  ember: '#F5A54A',
  emberSoft: '#FDF0E1',
  sage: '#E5F3EC',
  sageDeep: '#3A9B6B',
  fertile: '#C9EAD6',
  plum: '#8B6BD6',
  plumSoft: '#EEE6FB',
  sky: '#7C8EE0',
  skySoft: '#E8EBFB',
  rose: '#E0708E',
  roseSoft: '#FCE5EA',
  onAccent: '#FFFFFF',
  ash: '#DCD3EA',
  ashSoft: '#EBE5F4',
  wash: 'rgba(139,107,214,0.07)',
  glass: 'rgba(255,255,255,0.72)',
  glassRim: 'rgba(139,107,214,0.18)',
  glassSheen: 'rgba(255,255,255,0.65)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

const lilacDark: Palette = {
  background: '#14101C',
  glow: '#221A33',
  surface: '#1E1829',
  surfaceRaised: '#282036',
  surfaceWarm: '#18131F',
  ink: '#F6F0FF',
  inkSoft: '#CBC0DD',
  muted: '#8E84A3',
  line: '#2F2740',
  flame: '#FF7A3D',
  flameDeep: '#FFA066',
  flameSoft: '#33201A',
  blush: '#3D2A3E',
  ember: '#FFB65A',
  emberSoft: '#2D2318',
  sage: '#1C3529',
  sageDeep: '#6FD39A',
  fertile: '#24583B',
  plum: '#C3A6FF',
  plumSoft: '#2A2140',
  sky: '#9DAEFF',
  skySoft: '#1B2140',
  rose: '#FF8FB0',
  roseSoft: '#33192A',
  onAccent: '#14101C',
  ash: '#3E354D',
  ashSoft: '#5A5068',
  wash: 'rgba(0,0,0,0.25)',
  glass: 'rgba(30,24,41,0.82)',
  glassRim: 'rgba(195,166,255,0.14)',
  glassSheen: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

// Lavender: the "Lilac Dreamer" pastels, with periwinkle in place of the flame orange.
const lavenderLight: Palette = {
  background: '#F7F1FB',
  glow: '#F3E2F6',
  surface: '#FFFFFF',
  surfaceRaised: '#F3EDFB',
  surfaceWarm: '#FCF9FE',
  ink: '#2C2547',
  inkSoft: '#5D5680',
  muted: '#9A93B8',
  line: '#E8E1F5',
  flame: '#7470D4',
  flameDeep: '#5450B0',
  flameSoft: '#ECEBFC',
  blush: '#FCDCE1',
  ember: '#E890B8',
  emberSoft: '#FBE8F1',
  sage: '#E6F3EE',
  sageDeep: '#3C9A75',
  fertile: '#CDEBDD',
  plum: '#B07FD6',
  plumSoft: '#F3E8FA',
  sky: '#7F9FE0',
  skySoft: '#E9EEFB',
  rose: '#E07A97',
  roseSoft: '#FCE6EB',
  onAccent: '#FFFFFF',
  ash: '#DDD8EE',
  ashSoft: '#ECE8F6',
  wash: 'rgba(116,112,212,0.07)',
  glass: 'rgba(255,255,255,0.74)',
  glassRim: 'rgba(116,112,212,0.18)',
  glassSheen: 'rgba(255,255,255,0.6)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

const lavenderDark: Palette = {
  background: '#12121F',
  glow: '#1E1D36',
  surface: '#1C1B2E',
  surfaceRaised: '#25243B',
  surfaceWarm: '#161527',
  ink: '#F3F2FF',
  inkSoft: '#C5C3E3',
  muted: '#8886AB',
  line: '#2C2B45',
  flame: '#A9ACF2',
  flameDeep: '#C8CBFF',
  flameSoft: '#24244A',
  blush: '#3A2740',
  ember: '#F2A7CB',
  emberSoft: '#2E1F2B',
  sage: '#1B3430',
  sageDeep: '#72D1A8',
  fertile: '#22574A',
  plum: '#D3B3F0',
  plumSoft: '#2A2140',
  sky: '#A9C0FF',
  skySoft: '#1A2342',
  rose: '#FF97B4',
  roseSoft: '#341C2A',
  onAccent: '#12121F',
  ash: '#3A3953',
  ashSoft: '#55536F',
  wash: 'rgba(0,0,0,0.25)',
  glass: 'rgba(28,27,46,0.82)',
  glassRim: 'rgba(169,172,242,0.14)',
  glassSheen: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

// Misty: dusty blue, sky and mauve, soft and a little cooler.
const mistyLight: Palette = {
  background: '#EEF2F8',
  glow: '#E1E8F3',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F4F9',
  surfaceWarm: '#F8FAFC',
  ink: '#272A3D',
  inkSoft: '#55596F',
  muted: '#9294B4',
  line: '#DDE3EE',
  flame: '#8F6DB8',
  flameDeep: '#6E4F96',
  flameSoft: '#EFE7F7',
  blush: '#E9DDF2',
  ember: '#7FA6D3',
  emberSoft: '#E6EFF8',
  sage: '#E4F1EC',
  sageDeep: '#3F927A',
  fertile: '#CBE6DA',
  plum: '#9A7DC4',
  plumSoft: '#F0EAF8',
  sky: '#6F9CCB',
  skySoft: '#E5EEF8',
  rose: '#C97A9F',
  roseSoft: '#F7E7EF',
  onAccent: '#FFFFFF',
  ash: '#D5DAE6',
  ashSoft: '#E6EAF1',
  wash: 'rgba(143,109,184,0.07)',
  glass: 'rgba(255,255,255,0.74)',
  glassRim: 'rgba(146,148,180,0.22)',
  glassSheen: 'rgba(255,255,255,0.6)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

const mistyDark: Palette = {
  background: '#101319',
  glow: '#1A2030',
  surface: '#1A1E28',
  surfaceRaised: '#232835',
  surfaceWarm: '#151820',
  ink: '#EEF1F8',
  inkSoft: '#BFC6D6',
  muted: '#8A8DAE',
  line: '#2A2F3D',
  flame: '#B79CCD',
  flameDeep: '#D8C2EC',
  flameSoft: '#2A2235',
  blush: '#33283E',
  ember: '#B1D0EA',
  emberSoft: '#1B2633',
  sage: '#1B322D',
  sageDeep: '#73C9A8',
  fertile: '#235246',
  plum: '#D8C2EC',
  plumSoft: '#272137',
  sky: '#B1D0EA',
  skySoft: '#18222F',
  rose: '#E7A5C4',
  roseSoft: '#31202B',
  onAccent: '#101319',
  ash: '#363B4A',
  ashSoft: '#525868',
  wash: 'rgba(0,0,0,0.25)',
  glass: 'rgba(26,30,40,0.82)',
  glassRim: 'rgba(177,208,234,0.14)',
  glassSheen: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  black: '#0B0A09',
};

/** Candle, the original look. */
export const palettes: Record<Scheme, Palette> = { dark, light };

export const themes: Record<ThemeName, Record<Scheme, Palette>> = {
  candle: palettes,
  lilac: { light: lilacLight, dark: lilacDark },
  lavender: { light: lavenderLight, dark: lavenderDark },
  misty: { light: mistyLight, dark: mistyDark },
};

type FontStyle = Pick<TextStyle, 'fontFamily' | 'fontWeight'>;
/** Big screen titles and the name on Home; a script or poster font needs its own size and spacing. */
type TitleStyle = FontStyle & Pick<TextStyle, 'fontSize' | 'letterSpacing' | 'lineHeight'>;
export type Fonts = Record<'display' | 'body' | 'bodyMedium' | 'bodyBold', FontStyle> & { title: TitleStyle };

const phone: Fonts = {
  display: { fontWeight: '700' },
  body: { fontWeight: '400' },
  bodyMedium: { fontWeight: '500' },
  bodyBold: { fontWeight: '700' },
  title: {},
};

/*
 * Styles spread one of these (`...fonts.bodyBold`) rather than naming a font file,
 * so the same screens work in every set.
 */
export const fontSets: Record<FontPref, Fonts> = {
  // No family at all, so Android draws the text in the phone's own font, the same as its home screen.
  phone,
  classic: {
    display: { fontFamily: 'DMSans_700Bold' },
    body: { fontFamily: 'DMSans_400Regular' },
    bodyMedium: { fontFamily: 'DMSans_500Medium' },
    bodyBold: { fontFamily: 'DMSans_700Bold' },
    title: {},
  },
  // The phone's font, with titles and your name written in a flowing script.
  script: {
    ...phone,
    title: { fontFamily: 'GreatVibes_400Regular', fontWeight: '400', fontSize: 44, lineHeight: 56, letterSpacing: 0 },
  },
  // Soft and rounded everywhere.
  rounded: {
    display: { fontFamily: 'Quicksand_700Bold' },
    body: { fontFamily: 'Quicksand_500Medium' },
    bodyMedium: { fontFamily: 'Quicksand_600SemiBold' },
    bodyBold: { fontFamily: 'Quicksand_700Bold' },
    title: {},
  },
  // The phone's font, with tall poster titles.
  bebas: {
    ...phone,
    title: { fontFamily: 'BebasNeue_400Regular', fontWeight: '400', fontSize: 40, lineHeight: 44, letterSpacing: 0.6 },
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
