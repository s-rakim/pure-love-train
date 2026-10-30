import { Asset, requestPermissionsAsync } from 'expo-media-library';

/** Copies a moment's photo into the phone's gallery (the Pictures folder on Android). */
export async function savePhoto(uri: string, _name: string): Promise<void> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Allow Pure Love to save photos in your settings, then try again.');
  await Asset.create(uri);
}
