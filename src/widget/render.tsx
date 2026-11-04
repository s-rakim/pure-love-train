import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';

import type { State } from '../lib/store';
import { themes, type Palette } from '../theme';
import { MomentWidget } from './MomentWidget';

/** The widget for this phone: the partner's newest moment, in light and dark (or the look chosen in Settings). */
export function momentWidget(state: State, info: Pick<WidgetInfo, 'width' | 'height'>): WidgetRepresentation {
  const moment = state.moments.find((m) => m.from === 'partner' && !m.viewOnce);
  const make = (colors: Palette) => (
    <MomentWidget
      moment={moment}
      partnerName={state.names.partner}
      colors={colors}
      font={state.font ?? 'phone'}
      private={!!state.widgetPrivate}
      width={info.width}
      height={info.height}
    />
  );
  const palettes = themes[state.theme ?? 'candle'] ?? themes.candle;
  const choice = state.appearance ?? 'system';
  if (choice === 'system') return { light: make(palettes.light), dark: make(palettes.dark) };
  const only = make(palettes[choice]);
  return { light: only, dark: only };
}
