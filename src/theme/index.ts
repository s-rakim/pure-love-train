// Warm, candlelit palette: cream paper, soft blush, and a flame accent.
export const colors = {
  background: '#FBF3EA',
  surface: '#FFFFFF',
  surfaceWarm: '#FFF8F1',
  ink: '#2A1D1A',
  inkSoft: '#5C4842',
  muted: '#9A8680',
  line: '#EEDFD3',
  flame: '#F2643D',
  flameDeep: '#D9482A',
  flameSoft: '#FDE3D8',
  blush: '#F6C9C2',
  ember: '#F5B94A',
  emberSoft: '#FCEBC8',
  sage: '#CFE3D4',
  sageDeep: '#5E8D6C',
  plum: '#6B3A5B',
  plumSoft: '#EBDDE6',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const space = (n: number) => n * 4;

export const shadow = {
  shadowColor: '#7A3A22',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;
