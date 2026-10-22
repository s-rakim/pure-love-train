// Calendar dates are stored as local 'YYYY-MM-DD' keys so they never shift with time zones.
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function diffDays(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isValidKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toKey(fromKey(key)) === key;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

export function shortDate(key: DateKey): string {
  const d = fromKey(key);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** 6x7 grid of keys (or null for padding) for a month, weeks starting on Sunday. */
export function monthGrid(year: number, month: number): (DateKey | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return shortDate(toKey(new Date(iso)));
}
