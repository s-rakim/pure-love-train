import 'expo-router/entry';

import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/taskHandler';

// Lets the home screen widget run the app's code (to draw itself) without opening the app.
if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
