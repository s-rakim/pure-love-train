import { addDays, diffDays, type DateKey } from './dates.ts';

export type Period = { start: DateKey; end: DateKey };

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
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  nextPeriod: DateKey;
  /** Negative when the period is late. */
  daysUntilNext: number;
  ovulation: DateKey;
  fertileStart: DateKey;
  fertileEnd: DateKey;
  phase: Phase;
};

const LUTEAL_DAYS = 14;
const MIN_GAP = 15;
const MAX_GAP = 60;

const inside = (key: DateKey, p: Period) => key >= p.start && key <= p.end;

/** Sorts periods and merges any that overlap or touch. */
export function normalize(periods: Period[]): Period[] {
  const sorted = [...periods].sort((a, b) => (a.start < b.start ? -1 : 1));
  const out: Period[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, p.start) <= 1) {
      if (p.end > last.end) last.end = p.end;
    } else {
      out.push({ ...p });
    }
  }
  return out;
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

/** Average gap between the last few period starts, ignoring implausible gaps. */
export function averageCycleLength(periods: Period[], fallback: number): number {
  const sorted = normalize(periods);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = diffDays(sorted[i - 1].start, sorted[i].start);
    if (gap >= MIN_GAP && gap <= MAX_GAP) gaps.push(gap);
  }
  const recent = gaps.slice(-6);
  return recent.length ? Math.round(average(recent)) : fallback;
}

/** Average length of completed periods (the latest one may still be going). */
export function averagePeriodLength(periods: Period[], fallback: number, today: DateKey): number {
  const lengths = normalize(periods)
    .filter((p) => p.end < today)
    .map((p) => diffDays(p.start, p.end) + 1)
    .slice(-6);
  return lengths.length ? Math.round(average(lengths)) : fallback;
}

function phaseFor(key: DateKey, periodEnd: DateKey, ovulation: DateKey): Phase {
  if (key <= periodEnd) return 'period';
  const toOvulation = diffDays(key, ovulation);
  if (toOvulation === 0) return 'ovulation';
  if (toOvulation > 0 && toOvulation <= 5) return 'fertile';
  if (toOvulation === -1) return 'fertile';
  return toOvulation > 0 ? 'follicular' : 'luteal';
}

/** The summary a partner sees; enough to work out the day and phase on any later date. */
export type SharedCycle = {
  periodStart: DateKey;
  periodEnd: DateKey;
  nextPeriod: DateKey;
  ovulation: DateKey;
};

export function sharedCycleOn(c: SharedCycle, today: DateKey) {
  return {
    cycleDay: diffDays(c.periodStart, today) + 1,
    phase: phaseFor(today, c.periodEnd, c.ovulation),
    daysUntilNext: diffDays(today, c.nextPeriod),
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
  const nextPeriod = addDays(current.start, cycleLength);
  const ovulation = addDays(nextPeriod, -LUTEAL_DAYS);

  const typicalEnd = addDays(current.start, periodLength - 1);
  const periodEnd = current.end > typicalEnd ? current.end : typicalEnd;

  return {
    periodStart: current.start,
    periodEnd,
    cycleDay: diffDays(current.start, today) + 1,
    cycleLength,
    periodLength,
    nextPeriod,
    daysUntilNext: diffDays(today, nextPeriod),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    phase: phaseFor(today, periodEnd, ovulation),
  };
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
    const lastStart = sorted.filter((p) => p.start <= today).pop()!.start;
    for (let i = 0; i <= cycles; i++) {
      const start = addDays(lastStart, cycleLength * i);
      const ovulation = addDays(start, cycleLength - LUTEAL_DAYS);
      for (let d = -5; d <= 1; d++) {
        const key = addDays(ovulation, d);
        if (key > lastStart) map[key] = d === 0 ? 'ovulation' : 'fertile';
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
