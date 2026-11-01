import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MomentVideo } from '../../components/MomentVideo';
import { Body, Glass, Row } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { deleteMomentFiles } from '../../lib/moments';
import { isVideo, useStore } from '../../lib/store';
import { makeStyles, radius, space, useTheme } from '../../theme';

/**
 * A view-once moment. Your partner's opens once: it's marked opened straight
 * away (so they see it was), and its files leave this phone when you close it.
 * Your own you can look at any time.
 */
export default function ViewOnce() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, update } = useStore();
  const names = useNames();
  // Kept as it was when opened, since marking it opened clears it from the list.
  const [moment] = useState(() => state.moments.find((m) => m.id === id));
  const fromPartner = moment?.from === 'partner';
  const canOpen = !!moment && (!fromPartner || !moment.openedAt) && !!moment.uri;

  useEffect(() => {
    if (!moment || !fromPartner || !canOpen) return;
    const openedAt = new Date().toISOString();
    update((s) => ({ ...s, moments: s.moments.map((m) => (m.id === moment.id ? { ...m, openedAt } : m)) }));
    return () => {
      deleteMomentFiles(moment);
      update((s) => ({
        ...s,
        moments: s.moments.map((m) => (m.id === moment.id ? { ...m, uri: '', videoUri: undefined } : m)),
      }));
    };
    // Runs once, for the moment this screen opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/moments'));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Row style={styles.top}>
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={close} style={styles.iconButton}>
          <Glass radius={20} />
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.label}>View once</Text>
        <View style={styles.iconButton} />
      </Row>

      <View style={{ flex: 1, paddingHorizontal: space(4), justifyContent: 'center' }}>
        {!canOpen || !moment ? (
          <View style={{ alignItems: 'center', gap: space(2) }}>
            <Ionicons name="eye-off-outline" size={48} color={colors.muted} />
            <Body muted style={{ textAlign: 'center' }}>This one has already been opened.</Body>
          </View>
        ) : isVideo(moment) ? (
          <MomentVideo moment={moment} playing style={styles.photo} />
        ) : (
          <Image source={{ uri: moment.uri }} style={styles.photo} contentFit="contain" transition={150} />
        )}
      </View>

      {moment ? (
        <View style={styles.footer}>
          <Text style={styles.who}>
            {fromPartner ? names.partner : names.me} · {relativeTime(moment.createdAt)}
          </Text>
          {moment.caption && canOpen ? <Text style={styles.caption}>{moment.caption}</Text> : null}
          <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
            {fromPartner
              ? "It disappears once you close it, and can't be saved."
              : moment.openedAt
                ? `${names.partner} opened it ${relativeTime(moment.openedAt)}.`
                : `${names.partner} hasn't opened it yet. It never shows on their widget.`}
          </Body>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { justifyContent: 'space-between', paddingHorizontal: space(4), paddingVertical: space(2) },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { ...fonts.bodyMedium, fontSize: 14, color: colors.inkSoft },
  photo: { width: '100%', height: '100%', borderRadius: radius.lg },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(4), gap: space(2) },
  who: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  caption: { ...fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
}));
