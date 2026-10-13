import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useStore, type State } from '../lib/store';
import { syncOnce } from '../lib/sync';
import { pendingChanges } from '../lib/syncCore';

const POLL_MS = 15_000;
const PUSH_DELAY_MS = 1_500;

/** Keeps this phone in step with the sync server while the app is open. */
export function SyncAgent() {
  const { state, update } = useStore();
  const stateRef = useRef<State>(state);
  stateRef.current = state;
  const running = useRef(false);
  const again = useRef(false);

  const linked = !!state.sync;

  const run = useRef(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        await syncOnce(() => stateRef.current, update);
      } while (again.current);
    } finally {
      running.current = false;
    }
  }).current;

  // Poll while open, and right away when the app comes back to the foreground.
  useEffect(() => {
    if (!linked) return;
    run();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') run();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [linked, run]);

  // Push local edits shortly after they happen. Keyed on the pending changes
  // themselves, so failed attempts fall back to the poll instead of looping.
  const pending = linked
    ? JSON.stringify([pendingChanges(state), state.moments.filter((m) => m.from === 'me' && !m.photoId).map((m) => m.id)])
    : '';
  useEffect(() => {
    if (!pending || pending === '[[],[]]') return;
    const timer = setTimeout(run, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending, run]);

  return null;
}
