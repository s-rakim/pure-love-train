import { predict } from './cycle.ts';
import { todayKey, type DateKey } from './dates.ts';
import type { Coupon, Letter, Moment, Note, PartnerCycle, Person, State } from './store';

/** A record as the sync server stores it. */
export type SyncRecord = {
  kind: string;
  id: string;
  data?: unknown;
  deleted?: boolean;
};

export type PulledRecord = SyncRecord & { author: string; seq: number };

/** Kinds either partner may edit; everything else belongs to its author. */
const SHARED = new Set(['dateIdea', 'couple', 'coupon', 'letter']);

export const recordKey = (r: { kind: string; id: string }) => `${r.kind}:${r.id}`;
export const fingerprint = (data: unknown) => JSON.stringify(data ?? null);

/** Everything this phone publishes, derived from local state. */
export function outgoingRecords(s: State, today: DateKey = todayKey()): Map<string, SyncRecord> {
  const me = s.sync?.memberId;
  const out = new Map<string, SyncRecord>();
  if (!me) return out;
  const add = (kind: string, id: string, data: unknown) => out.set(recordKey({ kind, id }), { kind, id, data });

  if (s.names.me) add('profile', me, { name: s.names.me });
  // The days carry the mood history the streak needs; the latest 60 are plenty.
  if (s.moods.me) add('mood', me, { ...s.moods.me, days: (s.moodDays?.me ?? []).slice(-60) });
  for (const [date, answer] of Object.entries(s.answers)) {
    if (answer.me) add('answer', `${me}:${date}`, { date, text: answer.me });
  }
  for (const n of s.notes) {
    if (n.from === 'me') add('note', n.id, { text: n.text, createdAt: n.createdAt });
  }
  for (const [pair, pick] of Object.entries(s.picks ?? {})) {
    if (pick.me) add('pick', `${me}:${pair}`, { pair, choice: pick.me });
  }
  for (const m of s.moments) {
    if (m.from !== 'me' || !m.photoId) continue;
    const base = { photoId: m.photoId, caption: m.caption, createdAt: m.createdAt };
    if (!m.videoUri && !m.videoId) add('moment', m.id, base);
    // A video goes out once both its still frame and the video itself are on the server.
    else if (m.videoId) add('moment', m.id, { ...base, videoId: m.videoId, videoExt: m.videoExt ?? 'mp4' });
  }

  const { tracking, shareWithPartner, periods, settings } = s.cycle;
  const prediction = tracking && shareWithPartner ? predict(periods, settings, today) : null;
  if (prediction) {
    const shared: PartnerCycle = {
      periodStart: prediction.periodStart,
      periodEnd: prediction.periodEnd,
      nextPeriod: prediction.nextPeriod,
      ovulation: prediction.ovulation,
      fertileStart: prediction.fertileStart,
      fertileEnd: prediction.fertileEnd,
      nextLatest: prediction.nextLatest,
    };
    add('cycle', me, shared);
  }

  add('couple', 'settings', { togetherSince: s.togetherSince ?? null });
  if (s.nextDate) add('couple', 'next', { date: s.nextDate.date, label: s.nextDate.label });
  for (const d of s.dateIdeas) add('dateIdea', d.id, { text: d.text, done: d.done });
  for (const c of s.coupons ?? []) {
    // Either of you may update a coupon (the giver writes it, the other redeems it), so the
    // giver travels inside the data. Field order matters: it must match what was pulled.
    const giver = c.from === 'me' ? me : c.giver;
    if (giver) add('coupon', c.id, { emoji: c.emoji, text: c.text, giver, createdAt: c.createdAt, redeemedAt: c.redeemedAt ?? null });
  }
  for (const l of s.letters ?? []) {
    // Like coupons: the writer seals it and the reader marks it opened.
    const writer = l.from === 'me' ? me : l.writer;
    if (writer) add('letter', l.id, { when: l.when, text: l.text, writer, createdAt: l.createdAt, openedAt: l.openedAt ?? null });
  }
  return out;
}

/**
 * What only this phone knows (names, the anniversary, cycle logs, the chosen look),
 * saved privately on the server under your account so a new phone can get it back.
 * Everything else comes back from the shared records.
 */
export type Backup = Pick<State, 'names' | 'cycle'> & { togetherSince: DateKey | null; appearance: string; font?: string };

export function backupOf(s: State): Backup {
  return {
    names: s.names,
    togetherSince: s.togetherSince ?? null,
    cycle: s.cycle,
    appearance: s.appearance ?? 'system',
    font: s.font ?? 'phone',
  };
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
 *
 * `includeMine` also applies records this member wrote, which is how a new
 * phone gets back everything the old one shared after signing in.
 */
export function applyRecords(
  s: State,
  records: PulledRecord[],
  photoUris: Record<string, string> = {},
  includeMine = false,
): State {
  if (!s.sync) return s;
  const me = s.sync.memberId;
  let next: State = { ...s, sync: { ...s.sync, pushed: { ...s.sync.pushed } } };
  const pushed = next.sync!.pushed;

  for (const r of records) {
    const mine = r.author === me;
    if (mine && !includeMine) continue;
    const side: Person = mine ? 'me' : 'partner';
    const data = (r.deleted ? null : r.data) as any;
    const key = recordKey(r);
    if (mine) {
      // Already on the server as it is, so there's nothing to send back.
      if (data) pushed[key] = fingerprint(data);
      else delete pushed[key];
    } else if (SHARED.has(r.kind)) {
      // Remember the partner's version as already in sync so it isn't echoed back.
      if (data) pushed[key] = fingerprint(data);
      else delete pushed[key];
    }

    switch (r.kind) {
      case 'profile':
        if (data?.name) next = { ...next, names: { ...next.names, [side]: data.name } };
        break;
      case 'mood': {
        const moods = { ...next.moods };
        if (data) moods[side] = { emoji: data.emoji, label: data.label, at: data.at };
        else delete moods[side];
        const days = new Set<DateKey>([...(next.moodDays?.[side] ?? []), ...(data?.days ?? [])]);
        if (data?.at) days.add(todayKey(new Date(data.at)));
        next = { ...next, moods, moodDays: { ...next.moodDays, [side]: [...days].sort().slice(-60) } };
        break;
      }
      case 'answer': {
        const date = (data?.date ?? r.id.split(':').pop()) as DateKey;
        const day = { ...next.answers[date] };
        if (data) day[side] = data.text;
        else delete day[side];
        next = { ...next, answers: { ...next.answers, [date]: day } };
        break;
      }
      case 'note': {
        const notes = next.notes.filter((n) => n.id !== r.id);
        if (data) notes.push({ id: r.id, text: data.text, from: side, createdAt: data.createdAt } satisfies Note);
        notes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, notes };
        break;
      }
      case 'moment': {
        const before = next.moments.find((m) => m.id === r.id);
        const moments = next.moments.filter((m) => m.id !== r.id);
        const uri = photoUris[r.id];
        if (data && uri) {
          const moment: Moment = {
            id: r.id,
            uri,
            caption: data.caption ?? '',
            from: side,
            createdAt: data.createdAt,
            photoId: data.photoId,
          };
          if (data.videoId) {
            // The video itself downloads separately; keep a copy that's already here.
            moment.videoId = data.videoId;
            moment.videoExt = data.videoExt ?? 'mp4';
            if (before && before.videoId === data.videoId && before.videoUri) moment.videoUri = before.videoUri;
          }
          moments.push(moment);
        }
        moments.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, moments };
        break;
      }
      case 'pick': {
        const pair = (data?.pair ?? r.id.split(':').pop()) as string;
        const picks = { ...next.picks?.[pair] };
        if (data) picks[side] = data.choice;
        else delete picks[side];
        next = { ...next, picks: { ...next.picks, [pair]: picks } };
        break;
      }
      case 'cycle':
        // Your own summary is worked out from your logs, which come back with your backup.
        if (!mine) next = { ...next, partnerCycle: data ?? undefined };
        break;
      case 'couple':
        if (r.id === 'next') {
          next = { ...next, nextDate: data ? { date: data.date, label: data.label ?? '' } : undefined };
          break;
        }
        // An empty date from the partner never wipes one set on this phone; ours gets pushed instead.
        if (data?.togetherSince) next = { ...next, togetherSince: data.togetherSince };
        else if (next.togetherSince) delete pushed[key];
        break;
      case 'coupon': {
        const coupons = (next.coupons ?? []).filter((c) => c.id !== r.id);
        if (data) {
          coupons.push({
            id: r.id,
            emoji: data.emoji,
            text: data.text,
            from: data.giver === me ? 'me' : 'partner',
            giver: data.giver,
            createdAt: data.createdAt,
            redeemedAt: data.redeemedAt ?? undefined,
          } satisfies Coupon);
        }
        coupons.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, coupons };
        break;
      }
      case 'letter': {
        const letters = (next.letters ?? []).filter((l) => l.id !== r.id);
        if (data) {
          letters.push({
            id: r.id,
            when: data.when,
            text: data.text,
            from: data.writer === me ? 'me' : 'partner',
            writer: data.writer,
            createdAt: data.createdAt,
            openedAt: data.openedAt ?? undefined,
          } satisfies Letter);
        }
        letters.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        next = { ...next, letters };
        break;
      }
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
