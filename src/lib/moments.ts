import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { Platform } from 'react-native';

import type { Moment } from './store';

/** What's about to be sent: a photo, or a short video with a still frame taken from it. */
export type Draft = { uri: string; video?: { uri: string; ext: string; seconds: number } };

export const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_MB = 100;

const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/webm': 'webm',
};

const extensionOf = (uri: string) => uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';

/**
 * Opens the camera for a photo or a short video, or the library for either, and
 * returns what to send, or null if cancelled.
 */
export async function pickMoment(source: 'photo' | 'video' | 'library'): Promise<Draft | null> {
  if (source !== 'library') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera access is needed to snap a moment.');
  }
  const result =
    source === 'photo'
      ? await ImagePicker.launchCameraAsync(PHOTO_OPTIONS)
      : source === 'video'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: MAX_VIDEO_SECONDS })
        : await ImagePicker.launchImageLibraryAsync({
            ...PHOTO_OPTIONS,
            // Still frames can't be made in a browser, so the web preview sticks to photos.
            mediaTypes: Platform.OS === 'web' ? ['images'] : ['images', 'videos'],
          });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  if (asset.type !== 'video') return { uri: asset.uri };

  const seconds = Math.round((asset.duration ?? 0) / 1000);
  if (seconds > MAX_VIDEO_SECONDS + 1) {
    throw new Error(`Pick a video up to ${MAX_VIDEO_SECONDS} seconds long. This one is ${seconds} seconds.`);
  }
  if (asset.fileSize && asset.fileSize > MAX_VIDEO_MB * 1_000_000) {
    throw new Error(`That video is ${Math.round(asset.fileSize / 1_000_000)} MB. Keep it under ${MAX_VIDEO_MB} MB.`);
  }
  const ext = (asset.mimeType && VIDEO_TYPES[asset.mimeType]) || extensionOf(asset.uri) || 'mp4';
  // A frame a little way in, since the very first one is often black.
  const still = await getThumbnailAsync(asset.uri, { time: Math.min(500, (asset.duration ?? 0) / 2), quality: 0.8 });
  return { uri: still.uri, video: { uri: asset.uri, ext, seconds } };
}

/**
 * Picker results live in a cache folder the OS may clear, so copy each file
 * into the app's documents folder before saving its uri.
 */
async function keep(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'moments');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, name);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Stores a draft's files for good, returning the parts of the moment that point at them. */
export async function persistDraft(draft: Draft, id: string): Promise<Pick<Moment, 'uri' | 'videoUri' | 'videoExt'>> {
  const uri = await keep(draft.uri, `${id}.${extensionOf(draft.uri) || 'jpg'}`);
  if (!draft.video) return { uri };
  const videoUri = await keep(draft.video.uri, `${id}.${draft.video.ext}`);
  return { uri, videoUri, videoExt: draft.video.ext };
}

export function deleteFile(uri: string | undefined) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn('Could not delete file', err);
  }
}

/** Removes a moment's photo and video from this phone. */
export function deleteMomentFiles(m: Pick<Moment, 'uri' | 'videoUri'>) {
  deleteFile(m.uri);
  deleteFile(m.videoUri);
}

/** "0:07" for a seven-second clip. */
export const clipLength = (seconds: number) => `0:${String(Math.min(59, seconds)).padStart(2, '0')}`;
