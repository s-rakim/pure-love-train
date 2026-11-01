import { addDays, diffDays, type DateKey } from './dates.ts';

export type Period = {
  start: DateKey;
  end: DateKey;
  /** Set once the last day has been confirmed, so the length is known rather than guessed. */
  ended?: boolean;
};

export type CycleSettings = {
  /** Used until there are at least two logged periods. */
  cycleLength: number;
  periodLength: number;
};

export type Phase = 'period' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';

export type DayKind = 'period' | 'predicted' | 'fertile' | 'ovulation';

export type Prediction = {
  periodStart: DateKey;
  periodEnd: DateKey;
  /** The period's last day was confirmed (or logged day by day); otherwise it's the usual length. */
  periodEndConfirmed: boolean;
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  /** Shortest and longest of the recent cycles (both the average until there are two). */
  shortestCycle: number;
  longestCycle: number;
  /** Recent cycles differ by more than a week, so dates are given as a window. */
  irregular: boolean;
  nextPeriod: DateKey;
  /** The window the next period is likely to start in, from the shortest and longest recent cycles. */
  nextEarliest: DateKey;
  nextLatest: DateKey;
  /** Negative when the period is late. */
  daysUntilNext: number;
  ovulation: DateKey;
  fertileStart: DateKey;
  fertileEnd: DateKey;
  phase: Phase;
};

/** Ovulation comes about two weeks before the next period, however long the cycle. */
const LUTEAL_DAYS = 14;
const MIN_GAP = 15;
// Irregular cycles can run long, so only a gap past three months is taken as a missed log.
const MAX_GAP = 90;
/** After this many days a period still waiting for its last day is no longer asked about. */
const OPEN_DAYS = 14;

const inside = (key: DateKey, p: Period) => key >= p.start && key <= p.end;

/** Sorts periods and merges any that overlap or touch. */
export function normalize(periods: Period[]): Period[] {
  const sorted = [...periods].sort((a, b) => (a.start < b.start ? -1 : 1));
  const out: Period[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, p.start) <= 1) {
      if (p.end > last.end) last.end = p.end;
      if (p.ended) last.ended = true;
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

/**
 * Starts a period on `start` (today or a day before). Every day from then until today
 * counts as a period day, and it stays open until its last day is confirmed.
 */
export function startPeriod(periods: Period[], start: DateKey, today: DateKey): Period[] {
  return normalize([...periods, { start, end: start < today ? today : start }]);
}

/** Confirms the last day of the period under way on `end`, filling in every day before it. */
export function endPeriod(periods: Period[], end: DateKey): Period[] {
  const sorted = normalize(periods);
  const current = sorted.filter((p) => p.start <= end).pop();
  if (!current) return sorted;
  return normalize(sorted.map((p) => (p === current ? { start: p.start, end, ended: true } : p)));
}

/**
 * Swaps a logged period for corrected dates, adds one (no `original`), or removes one
 * (no `next`). Dates entered here are confirmed, so the period counts as over.
 */
export function editPeriod(periods: Period[], original: Period | null, next: Period | null): Period[] {
  const rest = normalize(periods).filter((p) => p.start !== original?.start);
  return normalize(next ? [...rest, { start: next.start, end: next.end, ended: true }] : rest);
}

/** Whether `next` would run into another logged period (the one being edited aside). */
export function overlapsAnother(periods: Period[], next: Period, editing?: Period): boolean {
  return normalize(periods).some(
    (p) => p.start !== editing?.start && diffDays(p.end, next.start) <= 1 && diffDays(next.end, p.start) <= 1,
  );
}

/** The period under way that's still waiting for its last day to be confirmed, if any. */
export function openPeriod(periods: Period[], today: DateKey): Period | null {
  const latest = normalize(periods)
    .filter((p) => p.start <= today)
    .pop();
  if (!latest || latest.ended) return null;
  return diffDays(latest.start, today) < OPEN_DAYS ? latest : null;
}

/** Marks one day as a period day, extending a neighbouring period when there is one. */
export function addPeriodDay(periods: Period[], key: DateKey): Period[] {
  if (periods.some((p) => inside(key, p))) return periods;
  return normalize([...periods, { start: key, end: key }]);
}

/** Unmarks one day, shrinking or splitting the period that contains it. */
export function removePeriodDay(periods: Period[], key: DateKey): Period[] {
  const out: Period[] = [];
  for (const p of periods) {
    if (!inside(key, p)) {
      out.push(p);
      continue;
    }
    if (p.start < key) out.push({ start: p.start, end: addDays(key, -1) });
    if (p.end > key) out.push({ start: addDays(key, 1), end: p.end });
  }
  return normalize(out);
}

export function isPeriodDay(periods: Period[], key: DateKey): boolean {
  return periods.some((p) => inside(key, p));
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Length in days of each recent cycle (start to next start), oldest first, skipping implausible gaps. */
export function cycleLengths(periods: Period[]): number[] {
  const sorted = normalize(periods);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = diffDays(sorted[i - 1].start, sorted[i].start);
    if (gap >= MIN_GAP && gap <= MAX_GAP) gaps.push(gap);
  }
  return gaps.slice(-6);
}

export function averageCycleLength(periods: Period[], fallback: number): number {
  const recent = cycleLengths(periods);
  return recent.length ? Math.round(average(recent)) : fallback;
}

/**
 * Whether a period's length is known: its last day was confirmed, or it was logged day by
 * day and is clearly over. A start with nothing after it doesn't say how long it lasted.
 */
export function lengthKnown(p: Period, periods: Period[], today: DateKey): boolean {
  if (p.ended) return true;
  if (p.end === p.start) return false;
  return openPeriod(periods, today)?.start !== p.start;
}

/** Average length of the recent periods whose length is known. */
export function averagePeriodLength(periods: Period[], fallback: number, today: DateKey): number {
  const sorted = normalize(periods);
  const lengths = sorted
    .filter((p) => p.start <= today && lengthKnown(p, sorted, today))
    .map((p) => diffDays(p.start, p.end) + 1)
    .slice(-6);
  return lengths.length ? Math.round(average(lengths)) : fallback;
}

type Window = { periodEnd: DateKey; fertileStart: DateKey; ovulation: DateKey; fertileEnd: DateKey };

function phaseFor(key: DateKey, w: Window): Phase {
  if (key <= w.periodEnd) return 'period';
  if (key === w.ovulation) return 'ovulation';
  if (key >= w.fertileStart && key <= w.fertileEnd) return 'fertile';
  return key < w.fertileStart ? 'follicular' : 'luteal';
}

/** The summary a partner sees; enough to work out the day and phase on any later date. */
export type SharedCycle = {
  periodStart: DateKey;
  periodEnd: DateKey;
  nextPeriod: DateKey;
  ovulation: DateKey;
  /** Added in 1.5; older summaries go without and get the usual week around ovulation. */
  fertileStart?: DateKey;
  fertileEnd?: DateKey;
  nextLatest?: DateKey;
  /**
   * Added in 1.6.1: the logged period dates (no notes or symptoms) and the usual lengths, so
   * the partner's calendar is worked out exactly as it is on the sharer's own phone.
   */
  periods?: Period[];
  settings?: CycleSettings;
};

export function sharedCycleOn(c: SharedCycle, today: DateKey) {
  const fertileStart = c.fertileStart ?? addDays(c.ovulation, -5);
  const fertileEnd = c.fertileEnd ?? addDays(c.ovulation, 1);
  return {
    cycleDay: diffDays(c.periodStart, today) + 1,
    phase: phaseFor(today, { periodEnd: c.periodEnd, fertileStart, ovulation: c.ovulation, fertileEnd }),
    daysUntilNext: diffDays(today, c.nextPeriod),
  };
}

/** Everything the partner's view draws: the day and phase, this cycle's dates and the calendar. */
export type PartnerView = {
  cycleDay: number;
  cycleLength: number;
  phase: Phase;
  daysUntilNext: number;
  periodStart: DateKey;
  periodEnd: DateKey;
  fertileStart: DateKey;
  fertileEnd: DateKey;
  ovulation: DateKey;
  nextPeriod: DateKey;
  nextLatest: DateKey;
  map: Record<DateKey, DayKind>;
};

/**
 * Your partner's cycle as you see it. When they share their logged periods it's worked out
 * the same way as on their phone, so the calendar matches theirs day for day; older
 * versions only send the summary, which still gives this cycle and the next few.
 */
export function partnerView(c: SharedCycle, today: DateKey): PartnerView {
  if (c.periods?.length && c.settings) {
    const p = predict(c.periods, c.settings, today);
    if (p) return { ...p, map: calendarMap(c.periods, c.settings, today) };
  }
  const fertileStart = c.fertileStart ?? addDays(c.ovulation, -5);
  const fertileEnd = c.fertileEnd ?? addDays(c.ovulation, 1);
  const cycleLength = Math.max(diffDays(c.periodStart, c.nextPeriod), 1);
  const periodLength = diffDays(c.periodStart, c.periodEnd) + 1;
  const map: Record<DateKey, DayKind> = {};
  for (let i = 0; i <= 3; i++) {
    const shift = cycleLength * i;
    const ovulation = addDays(c.ovulation, shift);
    const from = i === 0 ? fertileStart : addDays(ovulation, -5);
    const to = i === 0 ? fertileEnd : addDays(ovulation, 1);
    for (let key = from; key <= to; key = addDays(key, 1)) map[key] = key === ovulation ? 'ovulation' : 'fertile';
    for (let d = 0; d < periodLength; d++) {
      const key = addDays(c.periodStart, shift + d);
      map[key] = key > today ? 'predicted' : 'period';
    }
  }
  return {
    ...sharedCycleOn(c, today),
    cycleLength,
    periodStart: c.periodStart,
    periodEnd: c.periodEnd,
    fertileStart,
    fertileEnd,
    ovulation: c.ovulation,
    nextPeriod: c.nextPeriod,
    nextLatest: c.nextLatest ?? c.nextPeriod,
    map,
  };
}

export function predict(
  periods: Period[],
  settings: CycleSettings,
  today: DateKey,
): Prediction | null {
  const past = normalize(periods).filter((p) => p.start <= today);
  const current = past[past.length - 1];
  if (!current) return null;

  const cycleLength = averageCycleLength(past, settings.cycleLength);
  const periodLength = averagePeriodLength(past, settings.periodLength, today);
  const recent = cycleLengths(past);
  const shortestCycle = recent.length >= 2 ? Math.min(...recent) : cycleLength;
  const longestCycle = recent.length >= 2 ? Math.max(...recent) : cycleLength;
  const nextPeriod = addDays(current.start, cycleLength);
  const ovulation = addDays(nextPeriod, -LUTEAL_DAYS);

  // A confirmed last day is used as it is; otherwise assume the usual length.
  const periodEndConfirmed = lengthKnown(current, past, today);
  const typicalEnd = addDays(current.start, periodLength - 1);
  const periodEnd = periodEndConfirmed || current.end > typicalEnd ? current.end : typicalEnd;

  // The fertile window runs from five days before the earliest likely ovulation (shortest
  // cycle) to the day after the latest (longest), so it widens when cycles vary.
  const earliestOvulation = addDays(current.start, shortestCycle - LUTEAL_DAYS);
  const latestOvulation = addDays(current.start, longestCycle - LUTEAL_DAYS);
  const fertileStart = maxKey(addDays(earliestOvulation, -5), addDays(periodEnd, 1));
  const fertileEnd = addDays(latestOvulation, 1);

  return {
    periodStart: current.start,
    periodEnd,
    periodEndConfirmed,
    cycleDay: diffDays(current.start, today) + 1,
    cycleLength,
    periodLength,
    shortestCycle,
    longestCycle,
    irregular: longestCycle - shortestCycle > 7,
    nextPeriod,
    nextEarliest: addDays(current.start, shortestCycle),
    nextLatest: addDays(current.start, longestCycle),
    daysUntilNext: diffDays(today, nextPeriod),
    ovulation,
    fertileStart,
    fertileEnd,
    phase: phaseFor(today, { periodEnd, fertileStart, ovulation, fertileEnd }),
  };
}

const maxKey = (a: DateKey, b: DateKey) => (a > b ? a : b);

export type Stage = {
  phase: Exclude<Phase, 'fertile'>;
  start: DateKey;
  end: DateKey;
  days: number;
  /** Worked out from cycle lengths rather than logged. */
  estimated: boolean;
};

/**
 * The current cycle laid out as its four phases (period, follicular, ovulation, luteal),
 * each with its dates and length. Only the period is logged; the rest is counted back from
 * the next expected period. The fertile window spans the days around ovulation.
 */
export function stagesOf(p: Prediction, today: DateKey): Stage[] {
  const stage = (phase: Stage['phase'], start: DateKey, end: DateKey, estimated: boolean): Stage[] =>
    end < start ? [] : [{ phase, start, end, days: diffDays(start, end) + 1, estimated }];
  // While a period is late, the luteal phase simply runs on until it comes.
  const lutealEnd = maxKey(addDays(p.nextPeriod, -1), today);
  if (p.ovulation <= p.periodEnd) {
    return [...stage('period', p.periodStart, p.periodEnd, !p.periodEndConfirmed), ...stage('luteal', addDays(p.periodEnd, 1), lutealEnd, true)];
  }
  return [
    ...stage('period', p.periodStart, p.periodEnd, !p.periodEndConfirmed),
    ...stage('follicular', addDays(p.periodEnd, 1), addDays(p.ovulation, -1), true),
    ...stage('ovulation', p.ovulation, p.ovulation, true),
    ...stage('luteal', addDays(p.ovulation, 1), lutealEnd, true),
  ];
}

/** One past cycle for the history list: when it started, how long the period and the cycle ran. */
export type CycleEntry = { period: Period; periodDays: number | null; cycleDays: number | null };

export function cycleHistory(periods: Period[], today: DateKey): CycleEntry[] {
  const sorted = normalize(periods).filter((p) => p.start <= today);
  return sorted
    .map((period, i) => {
      const next = sorted[i + 1];
      return {
        period,
        periodDays: lengthKnown(period, sorted, today) ? diffDays(period.start, period.end) + 1 : null,
        cycleDays: next ? diffDays(period.start, next.start) : null,
      };
    })
    .reverse();
}

/**
 * What to draw on each calendar day: logged periods, plus predicted periods,
 * fertile windows and ovulation for the current and next few cycles.
 */
export function calendarMap(
  periods: Period[],
  settings: CycleSettings,
  today: DateKey,
  cycles = 3,
): Record<DateKey, DayKind> {
  const map: Record<DateKey, DayKind> = {};
  const sorted = normalize(periods);
  const prediction = predict(sorted, settings, today);

  if (prediction) {
    const { cycleLength, periodLength } = prediction;
    const lastStart = prediction.periodStart;
    for (let i = 0; i <= cycles; i++) {
      const start = addDays(lastStart, cycleLength * i);
      const ovulation = addDays(start, cycleLength - LUTEAL_DAYS);
      // This cycle's window reflects how much your cycles vary; later ones use the average.
      const from = i === 0 ? prediction.fertileStart : addDays(ovulation, -5);
      const to = i === 0 ? prediction.fertileEnd : addDays(ovulation, 1);
      for (let key = from; key <= to; key = addDays(key, 1)) {
        if (key > lastStart) map[key] = key === ovulation ? 'ovulation' : 'fertile';
      }
      for (let d = 0; d < periodLength; d++) {
        const key = addDays(start, d);
        if (key > today) map[key] = 'predicted';
      }
    }
  }

  for (const p of sorted) {
    for (let key = p.start; key <= p.end; key = addDays(key, 1)) map[key] = 'period';
  }
  return map;
}

export const phaseCopy: Record<Phase, { title: string; body: string }> = {
  period: {
    title: 'Period',
    body: 'Energy can dip. Warmth, rest and a little extra care go a long way.',
  },
  follicular: {
    title: 'Follicular phase',
    body: 'Energy usually climbs. A good stretch for plans and new things together.',
  },
  fertile: {
    title: 'Fertile window',
    body: 'The most fertile days of the cycle.',
  },
  ovulation: {
    title: 'Ovulation day',
    body: 'Predicted ovulation. Confidence often peaks around now.',
  },
  luteal: {
    title: 'Luteal phase',
    body: 'Moods and cravings can shift. Patience and snacks are appreciated.',
  },
};
