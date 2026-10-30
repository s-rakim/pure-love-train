import { Directory, File, Paths, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Moment, State, SyncState } from './store';
import { applyRecords, backupOf, fingerprint, pendingChanges, recordKey, type PulledRecord } from './syncCore';

type Update = (fn: (s: State) => State) => void;

type Session = {
  token: string;
  memberId: string;
  pairCode: string | null;
  partner: { id: string; name: string } | null;
};

export function normalizeServerUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (url && !/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

export async function request<T>(sync: Pick<SyncState, 'serverUrl'> & { token?: string }, path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (sync.token) headers.authorization = `Bearer ${sync.token}`;
  if (init.body && typeof init.body === 'string') headers['content-type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${sync.serverUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Can't reach ${sync.serverUrl}. Check the address and that Tailscale is on.`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}`);
  return body as T;
}

function linkedState(serverUrl: string, session: Session): SyncState {
  return {
    serverUrl,
    token: session.token,
    memberId: session.memberId,
    pairCode: session.pairCode,
    partnerId: session.partner?.id,
    cursor: 0,
    pushed: {},
  };
}

/** Signs this phone out on the server, so its token stops working. */
export async function signOut(sync: SyncState) {
  await request(sync, '/api/logout', { method: 'POST', body: '{}' });
}

/** Signs out every other phone that's signed in as you, such as a lost one. Returns how many. */
export async function signOutOthers(sync: SyncState): Promise<number> {
  const { signedOut } = await request<{ signedOut: number }>(sync, '/api/logout/others', { method: 'POST', body: '{}' });
  return signedOut;
}

/** Deletes everything you put on the server (records, photos, videos, backup) and leaves the space. */
export async function leaveSpace(sync: SyncState) {
  await request(sync, '/api/leave', { method: 'POST', body: '{}' });
}

/** Starts a new shared space; the returned code is what the partner types in. */
export async function createSpace(serverUrl: string, name: string, update: Update) {
  const session = await request<Session>({ serverUrl }, '/api/couples', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  update((s) => ({ ...s, sync: linkedState(serverUrl, session) }));
}

export async function joinSpace(serverUrl: string, code: string, name: string, update: Update) {
  const session = await request<Session>({ serverUrl }, '/api/couples/join', {
    method: 'POST',
    body: JSON.stringify({ name, code }),
  });
  update((s) => ({
    ...s,
    names: { ...s.names, partner: session.partner?.name ?? s.names.partner },
    // The space's shared date ideas come from whoever created it.
    dateIdeas: [],
    sync: linkedState(serverUrl, session),
  }));
}

const photoDir = () => {
  const dir = new Directory(Paths.document, 'moments');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  webm: 'video/webm',
};

/** Sends a photo or video to the server and returns its id there. */
/** When each video that failed to upload may be tried again. */
const videoRetryAt = new Map<string, number>();
const VIDEO_RETRY_MS = 10 * 60_000;

async function uploadMedia(sync: SyncState, uri: string): Promise<string> {
  const url = `${sync.serverUrl}/api/photos`;
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const mime = MEDIA_TYPES[ext] ?? 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const body = await request<{ photoId: string }>(sync, '/api/photos', {
      method: 'POST',
      headers: { 'content-type': blob.type || mime },
      body: blob,
    });
    return body.photoId;
  }
  const result = await new File(uri).upload(url, {
    uploadType: UploadType.BINARY_CONTENT,
    headers: { authorization: `Bearer ${sync.token}`, 'content-type': mime },
  });
  if (result.status === 415 && mime.startsWith('video/')) {
    throw new Error('your sync server needs updating before it can take videos');
  }
  if (result.status !== 201) {
    const reason = (() => {
      try {
        return JSON.parse(result.body).error as string | undefined;
      } catch {
        return undefined;
      }
    })();
    throw new Error(reason ?? `Upload failed (${result.status})`);
  }
  return JSON.parse(result.body).photoId;
}

async function downloadPhoto(sync: SyncState, photoId: string, momentId: string): Promise<string> {
  const url = `${sync.serverUrl}/api/photos/${photoId}`;
  const headers = { authorization: `Bearer ${sync.token}` };
  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Photo download failed (${res.status})`);
    // A blob: URL would die on reload, so keep the photo inline in saved state.
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  const file = await File.downloadFileAsync(url, new File(photoDir(), `${momentId}.jpg`), { headers, idempotent: true });
  return file.uri;
}

/** Where a video can be played from before (or instead of) downloading it. */
export function remoteVideo(sync: Pick<SyncState, 'serverUrl' | 'token'>, videoId: string) {
  return { uri: `${sync.serverUrl}/api/photos/${videoId}`, headers: { authorization: `Bearer ${sync.token}` } };
}

/**
 * Downloads a moment's video onto this phone and records where it went. Phones
 * only; the web preview plays videos straight from the server.
 */
export async function downloadVideo(sync: SyncState, moment: Moment, update: Update): Promise<string> {
  if (!moment.videoId) throw new Error('This moment has no video');
  const { uri, headers } = remoteVideo(sync, moment.videoId);
  const name = `${moment.id}.${moment.videoExt ?? 'mp4'}`;
  const file = await File.downloadFileAsync(uri, new File(photoDir(), name), { headers, idempotent: true });
  update((s) => ({
    ...s,
    moments: s.moments.map((m) => (m.id === moment.id && m.videoId === moment.videoId ? { ...m, videoUri: file.uri } : m)),
  }));
  return file.uri;
}

/*
 * One round trip: pull the partner's changes first (so shared records merge
 * before ours go out), then upload new photos and push local changes.
 */
let inFlight: Promise<void> | null = null;

export function syncOnce(getState: () => State, update: Update): Promise<void> {
  // One round at a time; a second caller just waits for the round in progress.
  if (!inFlight) inFlight = runSync(getState, update).finally(() => (inFlight = null));
  return inFlight;
}

/**
 * Pulls everything new from the server into local state. While a phone is
 * being restored it also takes back its own records (and their photos).
 */
export async function pull(start: SyncState, update: Update) {
  const restoring = !!start.restore;
  let cursor = start.cursor;
  for (;;) {
    const page = await request<Session & { records: PulledRecord[]; cursor: number; more: boolean }>(
      start,
      `/api/sync?since=${cursor}`,
    );
    const photoUris: Record<string, string> = {};
    for (const r of page.records) {
      const data = r.data as { photoId?: string } | null;
      const wanted = restoring || r.author !== start.memberId;
      if (r.kind === 'moment' && wanted && !r.deleted && data?.photoId) {
        photoUris[r.id] = await downloadPhoto(start, data.photoId, r.id);
      }
    }
    cursor = page.cursor;
    update((s) => {
      if (!s.sync || s.sync.token !== start.token) return s;
      const next = applyRecords(s, page.records, photoUris, restoring);
      return {
        ...next,
        names: page.partner ? { ...next.names, partner: next.names.partner || page.partner.name } : next.names,
        sync: {
          ...next.sync!,
          cursor: page.cursor,
          pairCode: page.pairCode,
          partnerId: page.partner?.id,
          restore: page.more ? next.sync!.restore : undefined,
        },
      };
    });
    if (!page.more) break;
  }
}

async function runSync(getState: () => State, update: Update) {
  const start = getState().sync;
  if (!start) return;

  try {
    await pull(start, update);

    // Upload photos and videos for moments taken on this phone.
    // One that fails stays on this phone and is retried next round; it
    // shouldn't hold back everything else. A video waits a while first, so a
    // big file isn't sent again every few seconds.
    const uploaded: Record<string, Pick<Moment, 'photoId' | 'videoId'>> = {};
    let mediaError: string | undefined;
    for (const m of getState().moments) {
      if (m.from !== 'me') continue;
      try {
        if (!m.photoId) uploaded[m.id] = { photoId: await uploadMedia(start, m.uri) };
        if (m.videoUri && !m.videoId && (videoRetryAt.get(m.id) ?? 0) <= Date.now()) {
          try {
            uploaded[m.id] = { ...uploaded[m.id], videoId: await uploadMedia(start, m.videoUri) };
          } catch (err) {
            videoRetryAt.set(m.id, Date.now() + VIDEO_RETRY_MS);
            throw err;
          }
        }
      } catch (err) {
        mediaError = `A moment didn't upload: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    const withMedia = (s: State): State =>
      Object.keys(uploaded).length
        ? { ...s, moments: s.moments.map((m) => (uploaded[m.id] ? { ...m, ...uploaded[m.id] } : m)) }
        : s;
    update(withMedia);

    // Push (state updates land asynchronously, so apply the new ids here too)
    const changes = pendingChanges(withMedia(getState()));
    if (changes.length) {
      const { results } = await request<{ results: { kind: string; id: string; ok: boolean; error?: string }[] }>(
        start,
        '/api/sync',
        { method: 'POST', body: JSON.stringify({ records: changes }) },
      );
      update((s) => {
        if (!s.sync) return s;
        const pushed = { ...s.sync.pushed };
        changes.forEach((c, i) => {
          const key = recordKey(c);
          // A server that doesn't know this kind yet hasn't been updated; send it again once it is.
          if (results?.[i]?.error === 'Unknown record') return;
          // Other rejections are marked as sent too, so one bad record isn't retried forever.
          if (c.deleted) delete pushed[key];
          else pushed[key] = fingerprint(c.data);
        });
        return { ...s, sync: { ...s.sync, pushed } };
      });
    }

    // Videos are big, so they come down last and a slow one never holds up the rest.
    if (Platform.OS !== 'web') {
      for (const m of getState().moments) {
        if (!m.videoId || m.videoUri) continue;
        try {
          await downloadVideo(start, m, update);
        } catch (err) {
          mediaError ??= `A video didn't download: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }

    // Keep the private backup current, for moving to a new phone.
    const latest = getState();
    if (latest.account) {
      const backup = backupOf(latest);
      const print = fingerprint(backup);
      if (print !== latest.account.backupPrint) {
        await request(start, '/api/backup', { method: 'POST', body: JSON.stringify({ data: backup }) });
        update((s) =>
          s.account ? { ...s, account: { ...s.account, backupPrint: print, backedUpAt: new Date().toISOString() } } : s,
        );
      }
    }

    update((s) => (s.sync ? { ...s, sync: { ...s.sync, lastSyncAt: new Date().toISOString(), error: mediaError } } : s));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    update((s) => (s.sync ? { ...s, sync: { ...s.sync, error: message } } : s));
  }
}
