import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AppearancePref, FontPref } from '../theme';
import type { CycleSettings, Period, SharedCycle } from './cycle';
import type { DateKey } from './dates';
import { DATE_IDEAS } from './questions';

export type Person = 'me' | 'partner';

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';

export type DayLog = {
  flow?: Flow;
  symptoms: string[];
  mood?: string;
  note?: string;
};

export type Moment = {
  id: string;
  /** The photo, or for a video a still frame from it. */
  uri: string;
  caption: string;
  from: Person;
  createdAt: string;
  /** Set once the photo (or still frame) is stored on the sync server. */
  photoId?: string;
  /** For a video: the file on this phone. A partner's video may still be on its way down. */
  videoUri?: string;
  /** For a video: set once it's stored on the sync server. */
  videoId?: string;
  /** For a video: its file extension (mp4, mov…), so a downloaded copy plays and saves properly. */
  videoExt?: string;
};

export const isVideo = (m: Pick<Moment, 'videoUri' | 'videoId'>) => !!(m.videoUri || m.videoId);

export type Note = { id: string; text: string; from: Person; createdAt: string };

export type Mood = { emoji: string; label: string; at: string };

export type ListItem = { id: string; text: string; done: boolean };

/** A little promise one of you gives the other, redeemable whenever they like. */
export type Coupon = {
  id: string;
  emoji: string;
  text: string;
  from: Person;
  /** Member id of whoever gave it, kept so the shared record round-trips unchanged. */
  giver?: string;
  createdAt: string;
  redeemedAt?: string;
};

/** A letter for the right moment ("Open when you miss me"), kept sealed until the reader opens it. */
export type Letter = {
  id: string;
  /** The moment it's for, like "Open when you can't sleep". */
  when: string;
  text: string;
  from: Person;
  /** Member id of whoever wrote it, kept so the shared record round-trips unchanged. */
  writer?: string;
  createdAt: string;
  openedAt?: string;
};

/** Which side of a "this or that" pair someone chose. */
export type Side = 'a' | 'b';

/** The next date you've planned, counted down for you both. */
export type NextDate = { date: DateKey; label: string };

/** What a partner shares about their cycle; raw logs and symptoms never leave the phone. */
export type PartnerCycle = SharedCycle;

export type SyncState = {
  serverUrl: string;
  token: string;
  memberId: string;
  /** Shown until the partner joins, then cleared by the server. */
  pairCode: string | null;
  partnerId?: string;
  /** Highest server sequence number already pulled. */
  cursor: number;
  /** Fingerprint of each record last sent, keyed by kind:id, so only changes are pushed. */
  pushed: Record<string, string>;
  lastSyncAt?: string;
  error?: string;
  /** Set on a phone restored from a backup until it has pulled back its own records too. */
  restore?: boolean;
};

/** The Google account this phone is signed in with, for moving to a new phone. */
export type Account = {
  email: string;
  /** Fingerprint of the backup last uploaded, so unchanged data isn't sent again. */
  backupPrint?: string;
  backedUpAt?: string;
};

export type State = {
  onboarded: boolean;
  names: Record<Person, string>;
  togetherSince?: DateKey;
  cycle: {
    tracking: boolean;
    shareWithPartner: boolean;
    settings: CycleSettings;
    periods: Period[];
    logs: Record<DateKey, DayLog>;
  };
  moments: Moment[];
  answers: Record<DateKey, Partial<Record<Person, string>>>;
  notes: Note[];
  moods: Partial<Record<Person, Mood>>;
  /** Days each of you shared a mood, newest last, for the streak. */
  moodDays?: Partial<Record<Person, DateKey[]>>;
  dateIdeas: ListItem[];
  coupons: Coupon[];
  /** This or that: the side each of you chose, keyed by the pair's id. */
  picks: Record<string, Partial<Record<Person, Side>>>;
  letters: Letter[];
  nextDate?: NextDate;
  partnerCycle?: PartnerCycle;
  sync?: SyncState;
  /** Light, dark or follow the phone. Stays on this phone and never syncs. */
  appearance?: AppearancePref;
  /** The phone's own font (the default) or DM Sans. Stays on this phone too. */
  font?: FontPref;
  /** Hide the photo on the home screen widget and just say a moment arrived. Stays on this phone. */
  widgetPrivate?: boolean;
  account?: Account;
};

const STORAGE_KEY = 'pure-love/state/v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function initialState(): State {
  return {
    onboarded: false,
    names: { me: '', partner: '' },
    cycle: {
      tracking: true,
      shareWithPartner: true,
      settings: { cycleLength: 28, periodLength: 5 },
      periods: [],
      logs: {},
    },
    moments: [],
    answers: {},
    notes: [],
    moods: {},
    dateIdeas: DATE_IDEAS.map((text) => ({ id: newId(), text, done: false })),
    coupons: [],
    picks: {},
    letters: [],
  };
}

const TOKEN_KEY = 'pure-love.sync-token';
// The sign-in token lives in the phone's keystore rather than with everything else.
// The web preview has no keystore, so there it stays in the saved state.
const secureToken = Platform.OS !== 'web';

/** Reads what was last saved on this phone, filling in anything newer versions added. */
export async function loadSavedState(): Promise<State | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const saved = JSON.parse(raw) as Partial<State>;
  const base = initialState();
  const state = { ...base, ...saved, cycle: { ...base.cycle, ...saved.cycle } };
  if (secureToken && state.sync) {
    // Older versions saved the token with the rest; it moves on the next save.
    const token = state.sync.token || (await SecureStore.getItemAsync(TOKEN_KEY)) || '';
    state.sync = { ...state.sync, token };
  }
  return state;
}

export async function saveState(state: State): Promise<void> {
  if (!secureToken) return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (state.sync?.token) await SecureStore.setItemAsync(TOKEN_KEY, state.sync.token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
  const toSave = state.sync ? { ...state, sync: { ...state.sync, token: '' } } : state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

type Store = {
  state: State;
  ready: boolean;
  update: (fn: (s: State) => State) => void;
  reset: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSavedState()
      .then((saved) => {
        if (saved) setState(saved);
      })
      .catch((err) => console.warn('Could not load saved data', err))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(state).catch((err) => console.warn('Could not save data', err));
    }, 250);
  }, [state, ready]);

  const update = useCallback((fn: (s: State) => State) => setState(fn), []);
  // Erasing data keeps the chosen look; it isn't part of what you two shared.
  const reset = useCallback(() => setState((s) => ({ ...initialState(), appearance: s.appearance, font: s.font })), []);

  const value = useMemo(() => ({ state, ready, update, reset }), [state, ready, update, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
