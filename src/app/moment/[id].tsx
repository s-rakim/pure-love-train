import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Glass, Row } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { deletePhoto } from '../../lib/moments';
import { savePhoto } from '../../lib/savePhoto';
import { useStore, type Moment } from '../../lib/store';
import { fonts, makeStyles, radius, space, useTheme } from '../../theme';

/** One moment at full size. Swipe sideways through the rest of the history. */
export default function MomentViewer() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, update } = useStore();
  const names = useNames();
  const { width } = useWindowDimensions();
  const moments = state.moments;
  const start = Math.max(0, moments.findIndex((m) => m.id === id));
  const [index, setIndex] = useState(start);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const list = useRef<FlatList<Moment>>(null);

  const current = moments[Math.min(index, moments.length - 1)];
  if (!current) return <Redirect href="/moments" />;

  const save = async () => {
    setSaving(true);
    try {
      await savePhoto(current.uri, `pure-love-${current.createdAt.slice(0, 10)}-${current.id}.jpg`);
      setSaved(current.id);
    } catch (err) {
      Alert.alert('Could not save the photo', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    const doRemove = () => {
      deletePhoto(current.uri);
      update((s) => ({ ...s, moments: s.moments.filter((m) => m.id !== current.id) }));
      if (moments.length <= 1) router.back();
      else setIndex((i) => Math.min(i, moments.length - 2));
    };
    if (Platform.OS === 'web') return doRemove();
    Alert.alert('Delete this moment?', 'It stays on your partner\'s phone if it already reached them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Row style={styles.top}>
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} style={styles.iconButton}>
          <Glass radius={20} />
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.counter}>
          {Math.min(index, moments.length - 1) + 1} of {moments.length}
        </Text>
        <Pressable accessibilityLabel="Delete moment" hitSlop={12} onPress={remove} style={styles.iconButton}>
          <Glass radius={20} />
          <Ionicons name="trash-outline" size={20} color={colors.inkSoft} />
        </Pressable>
      </Row>

      <FlatList
        ref={list}
        data={moments}
        keyExtractor={(m) => m.id}
        horizontal
        pagingEnabled
        style={{ flex: 1 }}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          setSaved(null);
        }}
        renderItem={({ item }) => (
          <View style={{ width, height: pageHeight, paddingHorizontal: space(4) }}>
            <Image source={{ uri: item.uri }} style={styles.photo} contentFit="contain" transition={150} />
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.who}>
          {current.from === 'me' ? names.me : names.partner} · {relativeTime(current.createdAt)}
        </Text>
        {current.caption ? <Text style={styles.caption}>{current.caption}</Text> : null}
        <Button
          label={saving ? 'Saving…' : saved === current.id ? 'Saved to your phone' : 'Save to phone'}
          variant={saved === current.id ? 'secondary' : 'primary'}
          disabled={saving}
          onPress={save}
          icon={
            <Ionicons
              name={saved === current.id ? 'checkmark' : 'download-outline'}
              size={20}
              color={saved === current.id ? colors.flameDeep : colors.white}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { justifyContent: 'space-between', paddingHorizontal: space(4), paddingVertical: space(2) },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.inkSoft },
  photo: { width: '100%', height: '100%', borderRadius: radius.lg },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(4), gap: space(2) },
  who: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  caption: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
}));
