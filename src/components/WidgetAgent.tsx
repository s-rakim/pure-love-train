import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { useStore } from '../lib/store';
import { WIDGET_NAME } from '../widget/MomentWidget';
import { momentWidget } from '../widget/render';

/** Redraws the home screen widget whenever the partner's newest moment (or the look) changes. */
export function WidgetAgent() {
  const { state } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const latest = state.moments.find((m) => m.from === 'partner');
  const key = JSON.stringify([latest?.id, latest?.uri, latest?.caption, state.names.partner, state.appearance]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const redraw = () =>
      requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: (info) => momentWidget(stateRef.current, info),
      }).catch((err) => console.warn('Could not update the widget', err));
    redraw();
    // Leaving the app refreshes the "2h ago" on the widget too.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') redraw();
    });
    return () => sub.remove();
  }, [key]);

  return null;
}
