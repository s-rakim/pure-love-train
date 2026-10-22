import { predict } from './cycle.ts';
import { todayKey, type DateKey } from './dates.ts';
import type { Moment, Note, PartnerCycle, Ping, State } from './store';

/** A record as the sync server stores it. */
export type SyncRecord = {
  kind: string;
  id: string;
  data?: unknown;
  deleted?: boolean;
};

export type PulledRecord = SyncRecord & { author: string; seq: number };

/** Kinds either partner may edit; everything else belongs to its author. */
const SHARED = new Set(['dateIdea', 'couple']);

export const recordKey = (r: { kind: string; id: string }) => `${r.kind}:${r.id}`;
export const fingerprint = (data: unknown) => JSON.stringify(data ?? null);

/** Everything this phone publishes, derived from local state. */
export function outgoingRecords(s: State, today: DateKey = todayKey()): Map<string, SyncRecord> {
  const me = s.sync?.memberId;
  const out = new Map<string, SyncRecord>();
  if (!me) return out;
  const add = (kind: string, id: string, data: unknown) => out.set(recordKey({ kind, id }), { kind, id, data });

  if (s.names.me) add('profile', me, { name: s.names.me });
  if (s.moods.me) add('mood', me, s.moods.me);
  for (const [date, answer] of Object.entries(s.answers)) {
    if (answer.me) add('answer', `${me}:${date}`, { date, text: answer.me });
  }
  for (const n of s.notes) {
    if (n.from === 'me') add('note', n.id, { text: n.text, createdAt: n.createdAt });
  }
  for (const m of s.moments) {
    if (m.from === 'me' && m.photoId) add('moment', m.id, { photoId: m.photoId, caption: m.caption, createdAt: m.createdAt });
  }
  for (const p of s.pings) {
    if (p.from === 'me') add('ping', p.id, { createdAt: p.createdAt });
  }

  const { tracking, shareWithPartner, periods, settings } = s.cycle;
  const prediction = tracking && shareWithPartner ? predict(periods, settings, today) : null;
  if (prediction) {
    const shared: PartnerCycle = {
      periodStart: prediction.periodStart,
      periodEnd: prediction.periodEnd,
      nextPeriod: prediction.nextPeriod,
      ovulation: prediction.ovulation,
    };
    add('cycle', me, shared);
  }

  add('couple', 'settings', { togetherSince: s.togetherSince ?? null });
  for (const d of s.dateIdeas) add('dateIdea', d.id, { text: d.text, done: d.done });
  return out;
}

/** Records that changed since they were last pushed, including deletions. */
export function pendingChanges(s: State, today?: DateKey): SyncRecord[] {
  const pushed = s.sync?.pushed ?? {};
  const current = outgoingRecords(s, today);
  const changes: SyncRecord[] = [];
  for (const [key, record] of current) {
    if (pushed[key] !== fingerprint(record.data)) changes.push(record);
  }
  for (const key of Object.keys(pushed)) {
    if (!current.has(key)) {
      const [kind, ...rest] = key.split(':');
      changes.push({ kind, id: rest.join(':'), deleted: true });
    }
  }
  return changes;
}

/**
 * Folds the partner's records into local state. Moment records need a local
 * photo, so the caller passes the uri it downloaded for each one.
 */
export function applyRecords(s: State, records: PulledRecord[], photoUris: Record<string, string> = {}): State {
  if (!s.sync) return s;
  const me = s.sync.memberId;
  let next: State = { ...s, sync: { ...s.sync, pushed: { ...s.sync.pushed } } };
  const pushed = next.sync!.pushed;

  for (const r of records) {
    if (r.author === me) continue;
    const data = (r.deleted ? null : r.data) as any;
    const key = recordKey(r);
    if (SHARED.has(r.kind)) {
      // Remember the partner's version as already in sync so it isn't echoed back.
      if (data) pushed[key] = fingerprint(data);
      else delete pushed[key];
    }

    switch (r.kind) {
      case 'profile':
        if (data?.name) next = { ...next, names: { ...next.names, partner: data.name } };
        break;
      case 'mood': {
        const moods = { ...next.moods };
        if (data) moods.partner = data;
        else delete moods.partner;
        next = { ...next, moods };
        break;
      }
      case 'answer': {
        const date = (data?.date ?? r.id.split(':').pop()) as DateKey;
        const day = { ...next.answers[date] };
        if (data) day.partner = data.text;
        else delete day.partner;
        next = { ...next, answers: { ...next.answers, [date]: day } };
        break;
      }
      case 'note': {
        const notes = next.notes.filter((n) => n.id !== r.id);
        if (data) notes.push({ id: r.id, text: data.text, from: 'partner', createdAt: data.createdAt } satisfies Note);
        notes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, notes };
        break;
      }
      case 'moment': {
        const moments = next.moments.filter((m) => m.id !== r.id);
        const uri = photoUris[r.id];
        if (data && uri) {
          moments.push({
            id: r.id,
            uri,
            caption: data.caption ?? '',
            from: 'partner',
            createdAt: data.createdAt,
            photoId: data.photoId,
          } satisfies Moment);
        }
        moments.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, moments };
        break;
      }
      case 'ping': {
        // "Thinking of you" signals. Kept newest-first and capped so the list stays small.
        let pings = next.pings.filter((p) => p.id !== r.id);
        if (data) pings.push({ id: r.id, from: 'partner', createdAt: data.createdAt } satisfies Ping);
        pings = pings.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 20);
        next = { ...next, pings };
        break;
      }
      case 'cycle':
        next = { ...next, partnerCycle: data ?? undefined };
        break;
      case 'couple':
        // An empty date from the partner never wipes one set on this phone; ours gets pushed instead.
        if (data?.togetherSince) next = { ...next, togetherSince: data.togetherSince };
        else if (next.togetherSince) delete pushed[key];
        break;
      case 'dateIdea': {
        const exists = next.dateIdeas.some((d) => d.id === r.id);
        const dateIdeas = !data
          ? next.dateIdeas.filter((d) => d.id !== r.id)
          : exists
            ? next.dateIdeas.map((d) => (d.id === r.id ? { id: r.id, text: data.text, done: !!data.done } : d))
            : [{ id: r.id, text: data.text, done: !!data.done }, ...next.dateIdeas];
        next = { ...next, dateIdeas };
        break;
      }
    }
  }
  return next;
}
