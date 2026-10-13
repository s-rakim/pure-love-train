import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

/** Opens the camera (or the library) and returns a photo uri, or null if cancelled. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera access is needed to snap a moment.');
  }
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
    : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/**
 * Picker results live in a cache folder the OS may clear, so copy each photo
 * into the app's documents folder before saving its uri.
 */
export async function persistPhoto(uri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'moments');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(dir, `${id}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string) {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn('Could not delete photo', err);
  }
}
