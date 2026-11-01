import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerCheckIn } from '../lib/background';
import { useStreak } from '../lib/hooks';
import { cancelAll, scheduleReminder, setUpNotifications } from '../lib/notify';
import { useStore } from '../lib/store';

/**
 * Asks for notification permission once, keeps the background check-in
 * registered, and moves the evening reminder to tomorrow once your three are done.
 */
export function NotifyAgent() {
  const { state } = useStore();
  const { meDone } = useStreak();
  const on = state.onboarded && state.notifications !== false;

  useEffect(() => {
    if (Platform.OS === 'web' || !state.onboarded) return;
    if (!on) {
      cancelAll();
      return;
    }
    setUpNotifications().then((granted) => {
      if (granted) registerCheckIn();
    });
  }, [on, state.onboarded]);

  useEffect(() => {
    if (on) scheduleReminder(meDone);
  }, [on, meDone]);

  return null;
}
