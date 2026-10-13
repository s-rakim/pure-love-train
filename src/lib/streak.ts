import { addDays, fromKey, toKey, type DateKey } from './dates.ts';
import type { State } from './store';

/** Days where either of you showed up: answered the question, sent a moment or left a note. */
export function activeDays(s: Pick<State, 'answers' | 'moments' | 'notes'>): Set<DateKey> {
  const days = new Set<DateKey>();
  for (const [key, a] of Object.entries(s.answers)) if (a.me || a.partner) days.add(key);
  for (const m of s.moments) days.add(toKey(new Date(m.createdAt)));
  for (const n of s.notes) days.add(toKey(new Date(n.createdAt)));
  return days;
}

/**
 * Consecutive active days ending today. A streak stays alive through today
 * as long as yesterday counted, so it doesn't reset first thing in the morning.
 */
export function streakLength(days: Set<DateKey>, today: DateKey): number {
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** The current week, Monday first, with which days counted. */
export function weekStrip(days: Set<DateKey>, today: DateKey): { key: DateKey; active: boolean; isToday: boolean }[] {
  const weekday = (fromKey(today).getDay() + 6) % 7;
  const monday = addDays(today, -weekday);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(monday, i);
    return { key, active: days.has(key), isToday: key === today };
  });
}
