import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useStore, type Moment, type SyncState } from '../lib/store';
import { remoteVideo } from '../lib/sync';

/** The copy on this phone, or straight from your server while that's still downloading. */
function sourceFor(moment: Moment, sync: SyncState | undefined): VideoSource {
  if (moment.videoUri) return moment.videoUri;
  if (moment.videoId && sync) return remoteVideo(sync, moment.videoId);
  return null;
}

/** Plays a video moment on a loop with the phone's own controls, paused unless `playing`. */
export function MomentVideo({
  moment,
  playing,
  style,
}: {
  moment: Moment;
  playing: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { state } = useStore();
  // Picked once, so a download finishing mid-watch doesn't restart the clip.
  const [source] = useState(() => sourceFor(moment, state.sync));
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return <VideoView player={player} style={style} contentFit="contain" nativeControls />;
}

/** A round play button drawn over a video's still frame. */
export function PlayBadge({ size = 44 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name="play" size={size * 0.45} color="#FFFFFF" style={{ marginLeft: size * 0.06 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
