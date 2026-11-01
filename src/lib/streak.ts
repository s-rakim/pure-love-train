import { addDays, fromKey, toKey, type DateKey } from './dates.ts';
import type { Person, State } from './store';

export type StreakInput = Pick<State, 'answers' | 'moments' | 'moods' | 'moodDays' | 'restores'>;

/** Free streak restores each calendar month. */
export const RESTORES_PER_MONTH = 2;

/** What each of you has ticked off on a day: the question, a moment and a mood. */
export function dayProgress(s: StreakInput, day: DateKey): Record<Person, { answer: boolean; moment: boolean; mood: boolean }> {
  const side = (p: Person) => ({
    answer: !!s.answers[day]?.[p],
    moment: s.moments.some((m) => m.from === p && toKey(new Date(m.createdAt)) === day),
    mood: !!s.moodDays?.[p]?.includes(day) || (!!s.moods[p] && toKey(new Date(s.moods[p]!.at)) === day),
  });
  return { me: side('me'), partner: side('partner') };
}

/**
 * Days where both of you did all three: answered the question, sent a moment and
 * shared a mood. Days brought back with a restore count too.
 */
export function activeDays(s: StreakInput): Set<DateKey> {
  const days = new Set<DateKey>(s.restores ?? []);
  for (const [key, a] of Object.entries(s.answers)) {
    if (!a.me || !a.partner) continue;
    const { me, partner } = dayProgress(s, key);
    if (me.moment && me.mood && partner.moment && partner.mood) days.add(key);
  }
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

/** Restores still free in the month of `day`. */
export function restoresLeft(restores: DateKey[] | undefined, day: DateKey): number {
  const month = day.slice(0, 7);
  return Math.max(0, RESTORES_PER_MONTH - (restores ?? []).filter((d) => d.startsWith(month)).length);
}

/**
 * The day a restore would bring back: yesterday, when missing it broke a streak
 * that was still going the day before, and that month still has a restore left.
 */
export function restorableDay(days: Set<DateKey>, restores: DateKey[] | undefined, today: DateKey): DateKey | null {
  const yesterday = addDays(today, -1);
  if (days.has(yesterday) || !days.has(addDays(today, -2))) return null;
  return restoresLeft(restores, yesterday) > 0 ? yesterday : null;
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
