import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoWidget } from '../../components/PhotoWidget';
import { Body, Button, Card, Eyebrow, Field, Row, Screen, Title } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { deletePhoto, persistPhoto, pickPhoto } from '../../lib/moments';
import { newId, useStore, type Moment } from '../../lib/store';
import { colors, fonts, radius, space } from '../../theme';

export default function Moments() {
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
            <Pressable key={m.id} onLongPress={() => remove(m)} style={styles.tile}>
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
        <Body muted style={{ fontSize: 12, textAlign: 'center' }}>Press and hold a photo to delete it.</Body>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
