import { diffDays, type DateKey } from './dates.ts';
import type { Person, State } from './store';

export type Celebration = { emoji: string; title: string; body: string };

/** Month and day match, so it comes round every year. */
const sameDay = (a: DateKey, b: DateKey) => a.slice(5) === b.slice(5);

/**
 * What's worth celebrating today: your anniversary, a birthday, or a round
 * number of days together (every 100, so 100, 200, 500, 1,000…).
 */
export function celebrationsFor(
  s: Pick<State, 'togetherSince' | 'birthdays'>,
  names: Record<Person, string>,
  today: DateKey,
): Celebration[] {
  const out: Celebration[] = [];
  const since = s.togetherSince;
  if (since && since < today) {
    const years = Number(today.slice(0, 4)) - Number(since.slice(0, 4));
    const days = diffDays(since, today);
    if (sameDay(since, today) && years > 0) {
      out.push({ emoji: '💞', title: `Happy ${years} year${years === 1 ? '' : 's'}!`, body: `${years === 1 ? 'One whole year' : `${years} years`} of you two. Do something special today.` });
    } else if (days % 100 === 0) {
      out.push({ emoji: '🎉', title: `${days.toLocaleString()} days together`, body: 'A big round number. Celebrate it, even in a small way.' });
    }
  }
  for (const who of ['me', 'partner'] as const) {
    const birthday = s.birthdays?.[who];
    if (birthday && sameDay(birthday, today)) {
      out.push(
        who === 'me'
          ? { emoji: '🎂', title: `Happy birthday, ${names.me}!`, body: 'Hope today is all about you.' }
          : { emoji: '🎂', title: `It's ${names.partner}'s birthday`, body: 'Make them feel extra loved today.' },
      );
    }
  }
  return out;
}
