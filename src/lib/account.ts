import type { AppearancePref, FontPref } from '../theme';
import { emailIdToken } from './firebase';
import { googleIdToken } from './google';
import { initialState, type Account, type State, type SyncState } from './store';
import { request } from './sync';
import type { Backup } from './syncCore';

type Restored = {
  token: string;
  memberId: string;
  name: string;
  pairCode: string | null;
  partner: { id: string; name: string } | null;
  email: string | null;
  provider?: Account['provider'] | null;
  backup: Backup | null;
};

type Config = { googleClientId: string | null; emailSignIn?: boolean };

/** Asks the server which Google client it trusts, then signs in with it. */
async function signInWithGoogle(serverUrl: string): Promise<string | null> {
  const config = await request<Config>({ serverUrl }, '/api/config');
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

/** Proves an email and password, after checking the server accepts email sign-in. */
async function signInWithEmail(serverUrl: string, email: string, password: string, create: boolean): Promise<string> {
  const config = await request<Config>({ serverUrl }, '/api/config');
  if (!config.emailSignIn) {
    throw new Error("Email sign-in isn't switched on for your sync server yet. Update it with docker compose up -d --build.");
  }
  return emailIdToken(email, password, create);
}

/** Ties this phone's place in your space to an email and password (making the account if needed). */
export async function linkEmail(sync: SyncState, email: string, password: string): Promise<string> {
  const idToken = await signInWithEmail(sync.serverUrl, email, password, true);
  const linked = await request<{ email: string }>(sync, '/api/account/email', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  return linked.email;
}

/** Stops the account restoring you. Your backup stays so your partner can still help you back in. */
export async function unlinkAccount(sync: SyncState): Promise<void> {
  await request(sync, '/api/account/unlink', { method: 'POST', body: '{}' });
}

/** On a new phone: signs in with your email and password and gets back your place and backup. */
export async function restoreWithEmail(serverUrl: string, email: string, password: string): Promise<State> {
  const idToken = await signInWithEmail(serverUrl, email, password, false);
  const session = await request<Restored>({ serverUrl }, '/api/account/email/restore', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  return restoredState(serverUrl, session);
}

/** On a new phone: uses the one-time code your partner made on their phone. */
export async function restoreWithCode(serverUrl: string, code: string): Promise<State> {
  const session = await request<Restored>({ serverUrl }, '/api/restore/code', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return restoredState(serverUrl, session);
}

/** Makes a code that signs your partner back in on a new phone. It works once, for 30 minutes. */
export async function partnerRestoreCode(sync: SyncState) {
  return request<{ code: string; expiresAt: string; partner: string }>(sync, '/api/partner/restore-code', {
    method: 'POST',
    body: '{}',
  });
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
    account: session.email ? { email: session.email, provider: session.provider ?? 'google' } : undefined,
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
