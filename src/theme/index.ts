// Candlelit at night: near-black surfaces, warm off-white text and a bright flame accent.
export const colors = {
  background: '#0B0A09',
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
  white: '#FFFFFF',
  black: '#0B0A09',
} as const;

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

// Shadows barely read on black, so cards lean on a hairline border instead.
export const shadow = {
  borderWidth: 1,
  borderColor: '#2D2826',
} as const;

/** Room left under scrolling content for the floating tab bar. */
export const TAB_BAR_SPACE = 120;
