import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { relativeTime } from '../lib/dates';
import type { Moment } from '../lib/store';
import { colors, fonts, radius } from '../theme';

/**
 * The square photo tile that mirrors the home screen widget: the newest
 * moment from your partner, with who sent it and when.
 */
export function PhotoWidget({
  moment,
  senderName,
  size = 168,
}: {
  moment?: Moment;
  senderName: string;
  size?: number;
}) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {moment ? (
        <>
          <Image source={{ uri: moment.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={[StyleSheet.absoluteFill, { top: '45%' }]}
          />
          {moment.caption ? (
            <View style={styles.captionPill}>
              <Text numberOfLines={1} style={styles.caption}>{moment.caption}</Text>
            </View>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {senderName} · {relativeTime(moment.createdAt)}
          </Text>
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="flame" size={size * 0.2} color={colors.flame} />
          <Text style={styles.emptyText}>Waiting for a moment from {senderName}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.flameSoft,
    borderWidth: 3,
    borderColor: colors.surfaceRaised,
  },
  captionPill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 30,
    maxWidth: '86%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.black },
  meta: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 9,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.white,
    textAlign: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.flameDeep, textAlign: 'center' },
});
