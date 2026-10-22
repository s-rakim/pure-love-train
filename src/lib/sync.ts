import { Directory, File, Paths, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import type { State, SyncState } from './store';
import { applyRecords, fingerprint, pendingChanges, recordKey, type PulledRecord } from './syncCore';
import { refreshMomentWidget } from './widget';

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

async function request<T>(sync: Pick<SyncState, 'serverUrl'> & { token?: string }, path: string, init: RequestInit = {}) {
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

async function uploadPhoto(sync: SyncState, uri: string): Promise<string> {
  const url = `${sync.serverUrl}/api/photos`;
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
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
  if (result.status !== 201) throw new Error(`Photo upload failed (${result.status})`);
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

async function runSync(getState: () => State, update: Update) {
  const start = getState().sync;
  if (!start) return;

  try {
    // Pull
    let cursor = start.cursor;
    for (;;) {
      const page = await request<Session & { records: PulledRecord[]; cursor: number; more: boolean }>(
        start,
        `/api/sync?since=${cursor}`,
      );
      const photoUris: Record<string, string> = {};
      for (const r of page.records) {
        const data = r.data as { photoId?: string } | null;
        if (r.kind === 'moment' && r.author !== start.memberId && !r.deleted && data?.photoId) {
          photoUris[r.id] = await downloadPhoto(start, data.photoId, r.id);
        }
      }
      cursor = page.cursor;
      update((s) => {
        if (!s.sync || s.sync.token !== start.token) return s;
        const next = applyRecords(s, page.records, photoUris);
        return {
          ...next,
          names: page.partner ? { ...next.names, partner: next.names.partner || page.partner.name } : next.names,
          sync: { ...next.sync!, cursor: page.cursor, pairCode: page.pairCode, partnerId: page.partner?.id },
        };
      });
      if (!page.more) break;
    }

    // Upload photos for moments taken on this phone
    // A photo that fails stays on this phone and is retried next round; it
    // shouldn't hold back everything else.
    const uploaded: Record<string, string> = {};
    let photoError: string | undefined;
    for (const m of getState().moments) {
      if (m.from !== 'me' || m.photoId) continue;
      try {
        uploaded[m.id] = await uploadPhoto(start, m.uri);
      } catch (err) {
        photoError = `A photo didn't upload: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    const withPhotos = (s: State): State =>
      Object.keys(uploaded).length
        ? { ...s, moments: s.moments.map((m) => (uploaded[m.id] ? { ...m, photoId: uploaded[m.id] } : m)) }
        : s;
    update(withPhotos);

    // Push (state updates land asynchronously, so apply the new photo ids here too)
    const changes = pendingChanges(withPhotos(getState()));
    if (changes.length) {
      await request<{ results: { kind: string; id: string; ok: boolean }[] }>(
        start,
        '/api/sync',
        { method: 'POST', body: JSON.stringify({ records: changes }) },
      );
      update((s) => {
        if (!s.sync) return s;
        const pushed = { ...s.sync.pushed };
        changes.forEach((c, i) => {
          const key = recordKey(c);
          // Rejected records are marked as sent too, so one bad record isn't retried forever.
          if (c.deleted) delete pushed[key];
          else pushed[key] = fingerprint(c.data);
        });
        return { ...s, sync: { ...s.sync, pushed } };
      });
    }

    update((s) => (s.sync ? { ...s, sync: { ...s.sync, lastSyncAt: new Date().toISOString(), error: photoError } } : s));
    // A new moment may have arrived from either side; refresh the home screen widget.
    void refreshMomentWidget();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    update((s) => (s.sync ? { ...s, sync: { ...s.sync, error: message } } : s));
  }
}
