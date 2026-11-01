import { useEffect, useMemo } from 'react';

import { calendarMap, predict } from './cycle';
import { diffDays, todayKey } from './dates';
import { activeDays, dayProgress, restorableDay, restoresLeft, streakLength, weekStrip } from './streak';
import { useStore } from './store';
import { pairsOut } from './thisOrThat';

export function useToday() {
  return todayKey();
}

export function useCycle() {
  const { state } = useStore();
  const today = useToday();
  const { periods, settings } = state.cycle;
  return useMemo(
    () => ({
      prediction: predict(periods, settings, today),
      map: calendarMap(periods, settings, today),
      today,
    }),
    [periods, settings, today],
  );
}

export function useDaysTogether(): number | null {
  const { state } = useStore();
  const today = useToday();
  if (!state.togetherSince) return null;
  return Math.max(0, diffDays(state.togetherSince, today));
}

export function useNames() {
  const { state } = useStore();
  return {
    me: state.names.me || 'You',
    partner: state.names.partner || 'Your person',
  };
}

export function useStreak() {
  const { state } = useStore();
  const today = useToday();
  const { answers, moments, moods, moodDays, restores } = state;
  return useMemo(() => {
    const days = activeDays({ answers, moments, moods, moodDays, restores });
    const progress = dayProgress({ answers, moments, moods, moodDays }, today);
    const restorable = restorableDay(days, restores, today);
    const all = (p: (typeof progress)['me']) => p.answer && p.moment && p.mood;
    return {
      count: streakLength(days, today),
      week: weekStrip(days, today),
      doneToday: days.has(today),
      meDone: all(progress.me),
      partnerDone: all(progress.partner),
      /** A missed yesterday that a restore can bring back, and how many are left. */
      restorable,
      restoresLeft: restorable ? restoresLeft(restores, restorable) : 0,
    };
  }, [answers, moments, moods, moodDays, restores, today]);
}

/**
 * This or that counts, worked out from the picks alone so the home screen stays quick.
 * The first time it's used it marks today as the day This or that began.
 */
export function usePickCounts() {
  const { state, ready, update } = useStore();
  const today = useToday();
  const start = state.picksStart;
  useEffect(() => {
    if (ready && !start) update((s) => (s.picksStart ? s : { ...s, picksStart: today }));
  }, [ready, start, today, update]);
  const picks = state.picks;
  return useMemo(() => {
    const out = pairsOut(start, today);
    let mine = 0;
    let waiting = 0;
    let compared = 0;
    let matches = 0;
    for (const p of Object.values(picks ?? {})) {
      if (p.me) mine++;
      if (p.partner && !p.me) waiting++;
      if (p.me && p.partner) {
        compared++;
        if (p.me === p.partner) matches++;
      }
    }
    return { out, mine, toPick: Math.max(0, out - mine), waiting, compared, matches };
  }, [picks, start, today]);
}
