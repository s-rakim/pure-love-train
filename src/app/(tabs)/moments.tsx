import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';

import { PhotoWidget } from '../../components/PhotoWidget';
import { Body, Button, Card, Eyebrow, Field, Row, Screen, Title } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { deletePhoto, persistPhoto, pickPhoto } from '../../lib/moments';
import { newId, useStore, type Moment } from '../../lib/store';
import { fonts, makeStyles, radius, space, useTheme } from '../../theme';
import { WIDGET_NAME } from '../../widget/MomentWidget';

export default function Moments() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const latestFromPartner = state.moments.find((m) => m.from === 'partner');
  const latestFromMe = state.moments.find((m) => m.from === 'me');

  const capture = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickPhoto(source);
      if (uri) setDraftUri(uri);
    } catch (err) {
      Alert.alert('Could not open the camera', err instanceof Error ? err.message : String(err));
    }
  };

  const send = async () => {
    if (!draftUri) return;
    setBusy(true);
    try {
      const id = newId();
      const uri = await persistPhoto(draftUri, id);
      const moment: Moment = { id, uri, caption: caption.trim(), from: 'me', createdAt: new Date().toISOString() };
      update((s) => ({ ...s, moments: [moment, ...s.moments] }));
      setDraftUri(null);
      setCaption('');
    } catch (err) {
      Alert.alert('Could not save the photo', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const addWidget = async () => {
    const pinned = await requestPinWidget({ widgetName: WIDGET_NAME }).catch(() => false);
    if (!pinned) {
      Alert.alert(
        'Add it from your home screen',
        "Press and hold an empty spot on your home screen, tap Widgets, then find Pure Love.",
      );
    }
  };

  const remove = (moment: Moment) => {
    const doRemove = () => {
      deletePhoto(moment.uri);
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
        <Body muted>Little live photos for each other's home screen.</Body>
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

      {draftUri ? (
        <Card>
          <Image source={{ uri: draftUri }} style={styles.draft} contentFit="cover" />
          <Field value={caption} onChangeText={setCaption} placeholder="Add a caption…" maxLength={40} />
          <Row>
            <Button label="Retake" variant="ghost" onPress={() => setDraftUri(null)} style={{ flex: 1 }} />
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
        <Row>
          <Button
            label="Snap"
            onPress={() => capture('camera')}
            style={{ flex: 1 }}
            icon={<Ionicons name="camera" size={20} color={colors.white} />}
          />
          <Button
            label="Choose"
            variant="secondary"
            onPress={() => capture('library')}
            style={{ flex: 1 }}
            icon={<Ionicons name="images" size={20} color={colors.flameDeep} />}
          />
        </Row>
      )}

      <Eyebrow color={colors.inkSoft}>History</Eyebrow>
      {state.moments.length === 0 ? (
        <Body muted>Your shared photos will collect here.</Body>
      ) : (
        <View style={styles.grid}>
          {state.moments.map((m) => (
            <Pressable
              key={m.id}
              accessibilityLabel={`Open ${m.from === 'me' ? 'your' : `${names.partner}'s`} moment`}
              onPress={() => router.push(`/moment/${m.id}`)}
              onLongPress={() => remove(m)}
              style={styles.tile}
            >
              <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
        <Body muted style={{ fontSize: 12, textAlign: 'center' }}>Tap a photo to see it full size and save it. Press and hold to delete.</Body>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  draft: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
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
  tileText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.white },
}));
