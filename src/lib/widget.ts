import { Platform } from 'react-native';

import { MomentWidget } from '../widgets/moment-widget';

/**
 * Ask Android to re-render the home screen widget with the latest moment.
 * No-op on other platforms, and silently no-op if the widget library isn't
 * installed (e.g. a web-only checkout).
 */
export async function refreshMomentWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    await requestWidgetUpdate({
      widgetName: 'Moment',
      renderWidget: () => <MomentWidget />,
    });
  } catch {
    // Widget unavailable; the widget's own 30-minute period will catch up later.
  }
}
