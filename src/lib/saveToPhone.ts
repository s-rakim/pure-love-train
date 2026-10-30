import { Asset, requestPermissionsAsync } from 'expo-media-library';

/** Copies a moment's photo or video into the phone's gallery. */
export async function saveToPhone(uri: string, _name: string): Promise<void> {
  // Only the right to add files is asked for, which covers videos as well as photos.
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Allow You&I to save to your gallery in your settings, then try again.');
  await Asset.create(uri);
}
