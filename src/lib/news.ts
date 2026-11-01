import { todayKey, type DateKey } from './dates.ts';
import type { State } from './store';

/** Something new from your partner, worth a notification. The id keeps repeats from stacking up. */
export type News = { id: string; title: string; body: string };

/** What arrived from the partner between two saved states: moments, notes, letters, moods and answers. */
export function newsFrom(before: State, after: State, today: DateKey = todayKey()): News[] {
  const partner = after.names.partner || 'Your person';
  const out: News[] = [];
  const hadMoment = new Set(before.moments.map((m) => m.id));
  for (const m of after.moments) {
    if (m.from !== 'partner' || hadMoment.has(m.id) || m.openedAt) continue;
    out.push({
      id: `moment:${m.id}`,
      title: m.viewOnce ? `${partner} sent a view-once moment` : `${partner} sent a moment`,
      body: m.viewOnce ? 'Open it in Moments. It can only be seen once.' : m.caption || 'Tap to see it.',
    });
  }
  const hadNote = new Set(before.notes.map((n) => n.id));
  for (const n of after.notes) {
    if (n.from === 'partner' && !hadNote.has(n.id)) out.push({ id: `note:${n.id}`, title: partner, body: n.text });
  }
  const hadLetter = new Set((before.letters ?? []).map((l) => l.id));
  for (const l of after.letters ?? []) {
    if (l.from === 'partner' && !hadLetter.has(l.id)) {
      out.push({ id: `letter:${l.id}`, title: `${partner} wrote you a letter`, body: l.when });
    }
  }
  // Today's mood only, and a newer one replaces the last notification.
  const mood = after.moods?.partner;
  if (mood && mood.at !== before.moods?.partner?.at && todayKey(new Date(mood.at)) === today) {
    out.push({ id: 'mood', title: `${partner} shared how they feel`, body: `${mood.emoji} ${mood.label}` });
  }
  // Today's answer. What they wrote stays hidden until you've answered too.
  const answer = after.answers?.[today];
  if (answer?.partner && !before.answers?.[today]?.partner) {
    out.push({
      id: `answer:${today}`,
      title: `${partner} answered today's question`,
      body: answer.me ? 'Tap to see what they said.' : 'Answer yours to unlock theirs.',
    });
  }
  return out;
}
