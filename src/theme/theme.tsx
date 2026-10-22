import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';

/** Every colour the app uses, keyed by role so screens don't care which theme is on. */
export type Colors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceWarm: string;
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  flame: string;
  flameDeep: string;
  flameSoft: string;
  blush: string;
  ember: string;
  emberSoft: string;
  sage: string;
  sageDeep: string;
  fertile: string;
  plum: string;
  plumSoft: string;
  sky: string;
  skySoft: string;
  rose: string;
  roseSoft: string;
  white: string;
  black: string;
};

/** Candlelit at night: near-black surfaces, warm off-white text and a bright flame accent. */
export const darkColors: Colors = {
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
};

/** Morning light: warm paper surfaces, deep coffee ink, and deeper accents for contrast. */
export const lightColors: Colors = {
  background: '#FAF3EB',
  surface: '#FFFFFF',
  surfaceRaised: '#F4EAE0',
  surfaceWarm: '#F7EFE6',
  ink: '#26201C',
  inkSoft: '#5E534B',
  muted: '#9A8C82',
  line: '#E9DDCF',
  flame: '#E8500C',
  flameDeep: '#B03E07',
  flameSoft: '#FFE7D6',
  blush: '#FFDCCF',
  ember: '#A96F08',
  emberSoft: '#FFF1D2',
  sage: '#D8F0E3',
  sageDeep: '#1F7A4A',
  fertile: '#C7E9D4',
  plum: '#8A3BD1',
  plumSoft: '#F1E5FB',
  sky: '#1D7AD1',
  skySoft: '#DEEDFB',
  rose: '#D6336C',
  roseSoft: '#FBDDE9',
  white: '#FFFFFF',
  black: '#0B0A09',
};

const STORAGE_KEY = 'pure-love/theme';

type Theme = {
  mode: ThemeMode;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const value = useMemo<Theme>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

/** The active palette. Call this at the top of any component that renders colours. */
export function useColors(): Colors {
  return useTheme().colors;
}
