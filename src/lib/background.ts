import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { WIDGET_NAME } from '../widget/MomentWidget';
import { momentWidget } from '../widget/render';
import { todayKey } from './dates';
import { newsFrom } from './news';
import { announce, scheduleReminder } from './notify';
import { loadSavedState, saveState, type State } from './store';
import { dayProgress } from './streak';
import { pull } from './sync';

const TASK = 'you-and-i-check-in';

/** Whether you've ticked all three today, for the evening reminder. */
export function myThreeDone(s: State): boolean {
  const me = dayProgress(s, todayKey()).me;
  return me.answer && me.moment && me.mood;
}

/**
 * With the app closed: pulls anything new from your server, saves it, and
 * posts a notification for each new moment, note or letter from your partner.
 * Returns the saved state before and after, or null if there was nothing to do.
 */
export async function checkIn(): Promise<{ before: State; after: State } | null> {
  const before = await loadSavedState().catch(() => null);
  if (!before?.sync) return null;
  let after = before;
  await pull(before.sync, (fn) => {
    after = fn(after);
  });
  if (after !== before) await saveState(after);
  if (after.notifications !== false) {
    await announce(newsFrom(before, after));
    await scheduleReminder(myThreeDone(after));
  }
  return { before, after };
}

// Android wakes the app for this about every 15 to 30 minutes, widget or not.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK, async () => {
    try {
      const result = await checkIn();
      if (result && result.after !== result.before && Platform.OS === 'android') {
        await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: (info) => momentWidget(result.after, info) }).catch(() => {});
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerCheckIn() {
  if (Platform.OS === 'web') return;
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 }).catch(() => {});
}
