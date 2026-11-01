import type { State } from './store';
import { fingerprint } from './syncCore.ts';

/**
 * This or that picks are saved apart from everything else, in a compact form.
 * Fifty pairs a day add up to tens of thousands of picks, and saved the usual
 * way (with a sync fingerprint each) they'd soon outgrow what the phone's
 * storage allows for one entry.
 */
export const PICKS_KEY = 'pure-love/picks/v1';

type Packed = { member?: string; picks: string; pushed: string };

const SIDE = /^[ab-]{2}$/;

/** Splits the picks out of what gets saved, as "id=ab" with - for no pick yet. */
export function packPicks(state: State): { rest: State; packed: string } {
  const picks: string[] = [];
  for (const [id, p] of Object.entries(state.picks ?? {})) {
    if (p.me || p.partner) picks.push(`${id}=${p.me ?? '-'}${p.partner ?? '-'}`);
  }

  // Our picks' sync fingerprints can be rebuilt from the pick itself, so only the side is kept.
  const member = state.sync?.memberId;
  const pushed: string[] = [];
  let rest: State = { ...state, picks: {} };
  if (state.sync && member) {
    const prefix = `pick:${member}:`;
    const kept: Record<string, string> = {};
    for (const [key, print] of Object.entries(state.sync.pushed)) {
      const pair = key.startsWith(prefix) ? key.slice(prefix.length) : '';
      const choice = print === fingerprint({ pair, choice: 'a' }) ? 'a' : print === fingerprint({ pair, choice: 'b' }) ? 'b' : '';
      if (pair && choice) pushed.push(`${pair}=${choice}`);
      else kept[key] = print;
    }
    rest = { ...rest, sync: { ...state.sync, pushed: kept } };
  }
  const packed: Packed = { member, picks: picks.join(','), pushed: pushed.join(',') };
  return { rest, packed: JSON.stringify(packed) };
}

/** Puts saved picks back. Picks saved the old way, inside the state, are kept too. */
export function unpackPicks(state: State, raw: string | null | undefined): State {
  if (!raw) return state;
  let packed: Packed;
  try {
    packed = JSON.parse(raw);
  } catch {
    return state;
  }
  const picks = { ...state.picks };
  for (const entry of packed.picks ? packed.picks.split(',') : []) {
    const [id, sides] = entry.split('=');
    if (!id || !SIDE.test(sides ?? '')) continue;
    const p: State['picks'][string] = {};
    if (sides[0] !== '-') p.me = sides[0] as 'a' | 'b';
    if (sides[1] !== '-') p.partner = sides[1] as 'a' | 'b';
    picks[id] = { ...p, ...picks[id] };
  }
  let next: State = { ...state, picks };

  // Fingerprints only belong to the member they were saved for; a new space starts clean.
  const member = state.sync?.memberId;
  if (state.sync && member && packed.member === member && packed.pushed) {
    const pushed = { ...state.sync.pushed };
    for (const entry of packed.pushed.split(',')) {
      const [pair, choice] = entry.split('=');
      if (pair && (choice === 'a' || choice === 'b')) pushed[`pick:${member}:${pair}`] = fingerprint({ pair, choice });
    }
    next = { ...next, sync: { ...state.sync, pushed } };
  }
  return next;
}
