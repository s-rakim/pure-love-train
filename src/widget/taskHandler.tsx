import { AppState } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { checkIn } from '../lib/background';
import { initialState, loadSavedState, type State } from '../lib/store';
import { momentWidget } from './render';

const latestId = (s: State) => s.moments.find((m) => m.from === 'partner' && !m.viewOnce)?.id;

/**
 * Runs when Android asks for the widget: when it's added, resized, or on its
 * half-hourly refresh. It draws from what's saved, and on the refresh it also
 * checks the server, so a new photo shows up even if the app stays closed,
 * and posts notifications for anything new.
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;

  const saved = (await loadSavedState().catch(() => null)) ?? initialState();
  renderWidget(momentWidget(saved, widgetInfo));

  // When the app is open it keeps the widget up to date itself.
  if (widgetAction !== 'WIDGET_UPDATE' || !saved.sync || AppState.currentState === 'active') return;
  try {
    const result = await checkIn();
    if (result && latestId(result.after) !== latestId(saved)) renderWidget(momentWidget(result.after, widgetInfo));
  } catch {
    // Offline or the server is away; try again on the next refresh.
  }
}
