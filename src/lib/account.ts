import type { AppearancePref, FontPref } from '../theme';
import { googleIdToken } from './google';
import { initialState, type State, type SyncState } from './store';
import { request } from './sync';
import type { Backup } from './syncCore';

type Restored = {
  token: string;
  memberId: string;
  name: string;
  pairCode: string | null;
  partner: { id: string; name: string } | null;
  email: string;
  backup: Backup | null;
};

/** Asks the server which Google client it trusts, then signs in with it. */
async function signInWithGoogle(serverUrl: string): Promise<string | null> {
  const config = await request<{ googleClientId: string | null }>({ serverUrl }, '/api/config');
  if (!config.googleClientId) {
    throw new Error("Google sign-in isn't switched on for your sync server yet. Add GOOGLE_CLIENT_ID to its settings.");
  }
  return googleIdToken(config.googleClientId);
}

/** Ties this phone's place in your space to a Google account. Returns the email, or null if cancelled. */
export async function linkGoogle(sync: SyncState): Promise<string | null> {
  const idToken = await signInWithGoogle(sync.serverUrl);
  if (!idToken) return null;
  const { email } = await request<{ email: string }>(sync, '/api/account/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  return email;
}

/** Signs out and deletes the private backup from the server. */
export async function unlinkGoogle(sync: SyncState): Promise<void> {
  await request(sync, '/api/account/google/unlink', { method: 'POST', body: '{}' });
}

/**
 * On a new phone: signs in with Google and gets back your place in the space plus
 * your private backup. Shared things (moments, notes, answers) follow on the first sync.
 */
export async function restoreWithGoogle(serverUrl: string): Promise<State | null> {
  const idToken = await signInWithGoogle(serverUrl);
  if (!idToken) return null;
  const session = await request<Restored>({ serverUrl }, '/api/account/google/restore', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  return restoredState(serverUrl, session);
}

export function restoredState(serverUrl: string, session: Restored): State {
  const base = initialState();
  const backup = session.backup;
  return {
    ...base,
    onboarded: true,
    names: backup?.names ?? { me: session.name, partner: session.partner?.name ?? '' },
    togetherSince: backup?.togetherSince ?? undefined,
    cycle: backup?.cycle ? { ...base.cycle, ...backup.cycle } : base.cycle,
    appearance: (backup?.appearance as AppearancePref | undefined) ?? undefined,
    font: (backup?.font as FontPref | undefined) ?? undefined,
    // Date ideas and coupons are shared, so they come back with everything else.
    dateIdeas: [],
    account: { email: session.email },
    sync: {
      serverUrl,
      token: session.token,
      memberId: session.memberId,
      pairCode: session.pairCode,
      partnerId: session.partner?.id,
      cursor: 0,
      pushed: {},
      restore: true,
    },
  };
}
