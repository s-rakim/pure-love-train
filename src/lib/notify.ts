import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { News } from './news';

const CHANNEL = 'partner';
const REMINDER_ID = 'daily-reminder';
/** The evening nudge goes out at 8pm if your three aren't ticked yet. */
const REMINDER_HOUR = 20;

// Shows alerts even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let ready: Promise<boolean> | null = null;

/** Asks once for permission (Android 13+ needs it) and sets up the channel. */
export function setUpNotifications(ask = true): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  ready ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'From your partner',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !ask) return current.granted;
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => false);
  return ready;
}

/** Posts a local notification for each new thing from your partner. */
export async function announce(news: News[]) {
  if (!news.length || !(await setUpNotifications(false))) return;
  for (const n of news.slice(0, 5)) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    }).catch(() => {});
  }
}

/**
 * Keeps one evening reminder queued: today at 8pm while your three aren't done,
 * otherwise tomorrow's. Called whenever the app opens or checks in the background.
 */
export async function scheduleReminder(doneToday: boolean, on = true) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (!on || !(await setUpNotifications(false))) return;
  const at = new Date();
  at.setHours(REMINDER_HOUR, 0, 0, 0);
  if (doneToday || at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: 'Keep your flame going 🔥', body: "Answer today's question, send a moment and share your mood." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) },
  }).catch(() => {});
}

/** Stops all of them, for when you turn notifications off. */
export async function cancelAll() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
