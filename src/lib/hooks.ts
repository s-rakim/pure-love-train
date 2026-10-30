import { useMemo } from 'react';

import { calendarMap, predict } from './cycle';
import { diffDays, todayKey } from './dates';
import { activeDays, dayProgress, streakLength, weekStrip } from './streak';
import { useStore } from './store';

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
  const { answers, moments, moods, moodDays } = state;
  return useMemo(() => {
    const days = activeDays({ answers, moments, moods, moodDays });
    const progress = dayProgress({ answers, moments, moods, moodDays }, today);
    const all = (p: (typeof progress)['me']) => p.answer && p.moment && p.mood;
    return {
      count: streakLength(days, today),
      week: weekStrip(days, today),
      doneToday: days.has(today),
      meDone: all(progress.me),
      partnerDone: all(progress.partner),
    };
  }, [answers, moments, moods, moodDays, today]);
}
