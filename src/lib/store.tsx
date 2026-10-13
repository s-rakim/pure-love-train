import AsyncStorage from '@react-native-async-storage/async-storage';
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
  uri: string;
  caption: string;
  from: Person;
  createdAt: string;
  /** Set once the photo is stored on the sync server. */
  photoId?: string;
};

export type Note = { id: string; text: string; from: Person; createdAt: string };

export type Mood = { emoji: string; label: string; at: string };

export type ListItem = { id: string; text: string; done: boolean };

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
  dateIdeas: ListItem[];
  partnerCycle?: PartnerCycle;
  sync?: SyncState;
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
  };
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<State>;
        const base = initialState();
        setState({ ...base, ...saved, cycle: { ...base.cycle, ...saved.cycle } });
      })
      .catch((err) => console.warn('Could not load saved data', err))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((err) =>
        console.warn('Could not save data', err),
      );
    }, 250);
  }, [state, ready]);

  const update = useCallback((fn: (s: State) => State) => setState(fn), []);
  const reset = useCallback(() => setState(initialState()), []);

  const value = useMemo(() => ({ state, ready, update, reset }), [state, ready, update, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
