import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { MomentWidget } from './moment-widget';

/** Android calls this to (re)render the widget, on our request or on its 30-minute period. */
export function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  props.renderWidget(<MomentWidget />);
}
