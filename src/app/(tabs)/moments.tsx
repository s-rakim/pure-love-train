import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';

import { PlayBadge } from '../../components/MomentVideo';
import { PhotoWidget } from '../../components/PhotoWidget';
import { Body, Button, Card, Eyebrow, Field, Row, Screen, Title } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { clipLength, deleteMomentFiles, MAX_VIDEO_SECONDS, persistDraft, pickMoment, type Draft } from '../../lib/moments';
import { isVideo, newId, useStore, type Moment } from '../../lib/store';
import { makeStyles, radius, space, useTheme } from '../../theme';
import { WIDGET_NAME } from '../../widget/MomentWidget';

export default function Moments() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  // For special occasions: opens once for your partner and never shows on their widget.
  const [once, setOnce] = useState(false);

  const latestFromPartner = state.moments.find((m) => m.from === 'partner' && !m.viewOnce);
  const latestFromMe = state.moments.find((m) => m.from === 'me');

  const capture = async (source: 'photo' | 'video' | 'library') => {
    try {
      const picked = await pickMoment(source);
      if (picked) setDraft(picked);
    } catch (err) {
      Alert.alert("Couldn't add that moment", err instanceof Error ? err.message : String(err));
    }
  };

  const send = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const id = newId();
      const files = await persistDraft(draft, id);
      const moment: Moment = { id, ...files, caption: caption.trim(), from: 'me', createdAt: new Date().toISOString() };
      if (once) moment.viewOnce = true;
      update((s) => ({ ...s, moments: [moment, ...s.moments] }));
      setDraft(null);
      setCaption('');
      setOnce(false);
    } catch (err) {
      Alert.alert("Couldn't save that moment", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const addWidget = async () => {
    const pinned = await requestPinWidget({ widgetName: WIDGET_NAME }).catch(() => false);
    if (!pinned) {
      Alert.alert(
        'Add it from your home screen',
        "Press and hold an empty spot on your home screen, tap Widgets, then find You&I💞.",
      );
    }
  };

  const remove = (moment: Moment) => {
    const doRemove = () => {
      deleteMomentFiles(moment);
      update((s) => ({ ...s, moments: s.moments.filter((m) => m.id !== moment.id) }));
    };
    if (Platform.OS === 'web') return doRemove();
    Alert.alert('Delete this moment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <Title>Moments</Title>
        <Body muted>Little photos and videos for each other's home screen.</Body>
      </View>

      <Card tone="blush" style={{ alignItems: 'center', paddingVertical: space(6) }}>
        <Eyebrow color={colors.flameDeep}>On your home screen</Eyebrow>
        <PhotoWidget moment={latestFromPartner} senderName={names.partner} size={200} />
        <Body style={{ textAlign: 'center', fontSize: 13 }}>
          {latestFromMe
            ? `${names.partner} sees your last moment from ${relativeTime(latestFromMe.createdAt)}.`
            : `Send your first moment and it lands on ${names.partner}'s widget.`}
        </Body>
        {Platform.OS === 'android' ? (
          <Button
            label="Add the widget to your home screen"
            variant="secondary"
            onPress={addWidget}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.flameDeep} />}
          />
        ) : null}
      </Card>

      {draft ? (
        <Card>
          {draft.video ? (
            <View style={styles.draft}>
              <DraftVideo uri={draft.video.uri} style={StyleSheet.absoluteFill} />
              <Text style={styles.length}>{clipLength(draft.video.seconds)}</Text>
            </View>
          ) : (
            <Image source={{ uri: draft.uri }} style={styles.draft} contentFit="cover" />
          )}
          <Field value={caption} onChangeText={setCaption} placeholder="Add a caption…" maxLength={40} />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: once }}
            onPress={() => setOnce((v) => !v)}
            style={styles.onceRow}
          >
            <Ionicons name={once ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={once ? colors.flame : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.onceTitle}>View once</Text>
              <Text style={styles.onceHint}>For something special. {names.partner} can open it once, and it never shows on the widget.</Text>
            </View>
          </Pressable>
          <Row>
            <Button label="Retake" variant="ghost" onPress={() => setDraft(null)} style={{ flex: 1 }} />
            <Button
              label={busy ? 'Sending…' : `Send to ${names.partner}`}
              onPress={send}
              disabled={busy}
              style={{ flex: 2 }}
              icon={<Ionicons name="paper-plane" size={18} color={colors.white} />}
            />
          </Row>
        </Card>
      ) : (
        <View style={{ gap: space(3) }}>
          <Row>
            <Button
              label="Photo"
              onPress={() => capture('photo')}
              style={{ flex: 1 }}
              icon={<Ionicons name="camera" size={20} color={colors.white} />}
            />
            {Platform.OS !== 'web' ? (
              <Button
                label="Video"
                onPress={() => capture('video')}
                style={{ flex: 1 }}
                icon={<Ionicons name="videocam" size={20} color={colors.white} />}
              />
            ) : null}
          </Row>
          <Button
            label="Choose from your phone"
            variant="secondary"
            onPress={() => capture('library')}
            icon={<Ionicons name="images" size={20} color={colors.flameDeep} />}
          />
          {Platform.OS !== 'web' ? (
            <Body muted style={{ fontSize: 12, textAlign: 'center' }}>Videos can be up to {MAX_VIDEO_SECONDS} seconds.</Body>
          ) : null}
        </View>
      )}

      <Eyebrow color={colors.inkSoft}>History</Eyebrow>
      {state.moments.length === 0 ? (
        <Body muted>Your shared photos and videos will collect here.</Body>
      ) : (
        <View style={styles.grid}>
          {state.moments.map((m) => (
            <Pressable
              key={m.id}
              accessibilityLabel={`Open ${m.from === 'me' ? 'your' : `${names.partner}'s`} moment`}
              onPress={() => {
                if (!m.viewOnce) router.push(`/moment/${m.id}`);
                else if (m.uri) router.push(`/once/${m.id}`);
              }}
              onLongPress={() => remove(m)}
              style={styles.tile}
            >
              {m.viewOnce && (m.from === 'partner' || !m.uri) ? (
                // Your partner's stays hidden until it's opened; after that only this tile is left.
                <View style={styles.locked}>
                  <Ionicons name={m.openedAt ? 'eye-off-outline' : 'eye-outline'} size={26} color={m.openedAt ? colors.muted : colors.flameDeep} />
                  <Text style={[styles.lockedText, m.openedAt && { color: colors.muted }]}>{m.openedAt ? 'Opened' : 'Tap to view once'}</Text>
                </View>
              ) : (
                <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              )}
              {m.viewOnce && m.from === 'me' && m.uri ? (
                <View style={styles.onceBadge}>
                  <Ionicons name={m.openedAt ? 'eye-off' : 'eye'} size={12} color={colors.white} />
                  <Text style={styles.onceBadgeText}>{m.openedAt ? 'Opened' : 'Once'}</Text>
                </View>
              ) : null}
              {isVideo(m) && !m.viewOnce ? <PlayBadge size={30} /> : null}
              <View style={styles.tileMeta}>
                <Text style={styles.tileText} numberOfLines={1}>
                  {m.from === 'me' ? names.me : names.partner}
                  {m.caption ? ` · ${m.caption}` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {state.moments.length > 0 ? (
        <Body muted style={{ fontSize: 12, textAlign: 'center' }}>
          Tap one to see it full size, play it and save it. Press and hold to delete.
        </Body>
      ) : null}
    </Screen>
  );
}

/** The clip about to be sent, playing quietly on a loop so you can check it. */
function DraftVideo({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
}

const useStyles = makeStyles((colors, fonts) => ({
  draft: { width: '100%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.black },
  length: {
    position: 'absolute',
    right: space(3),
    bottom: space(3),
    ...fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: 2,
    overflow: 'hidden',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  tile: {
    width: '31.8%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.flameSoft,
  },
  tileMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(42,29,26,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tileText: { ...fonts.bodyMedium, fontSize: 10, color: colors.white },
  onceRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  onceTitle: { ...fonts.bodyBold, fontSize: 15, color: colors.ink },
  onceHint: { ...fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted },
  locked: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: space(1), paddingBottom: space(4) },
  lockedText: { ...fonts.bodyBold, fontSize: 11, color: colors.flameDeep, textAlign: 'center' },
  onceBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  onceBadgeText: { ...fonts.bodyBold, fontSize: 10, color: colors.white },
}));
