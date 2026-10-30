import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MomentVideo, PlayBadge } from '../../components/MomentVideo';
import { Button, Glass, Row } from '../../components/ui';
import { relativeTime } from '../../lib/dates';
import { useNames } from '../../lib/hooks';
import { deleteMomentFiles } from '../../lib/moments';
import { saveToPhone } from '../../lib/saveToPhone';
import { isVideo, useStore, type Moment } from '../../lib/store';
import { downloadVideo } from '../../lib/sync';
import { makeStyles, radius, space, useTheme } from '../../theme';

/** One moment at full size, playing if it's a video. Swipe sideways through the rest of the history. */
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

  const video = isVideo(current);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/moments'));

  const save = async () => {
    setSaving(true);
    try {
      const name = `you-and-i-${current.createdAt.slice(0, 10)}-${current.id}`;
      if (!video) {
        await saveToPhone(current.uri, `${name}.jpg`);
      } else {
        // A partner's video may still be downloading; fetch it now rather than wait.
        const uri =
          current.videoUri ??
          (state.sync && Platform.OS !== 'web' ? await downloadVideo(state.sync, current, update) : null);
        if (!uri) throw new Error('This video is still on its way. Try again in a moment.');
        await saveToPhone(uri, `${name}.${current.videoExt ?? 'mp4'}`);
      }
      setSaved(current.id);
    } catch (err) {
      Alert.alert(`Could not save the ${video ? 'video' : 'photo'}`, err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    const doRemove = () => {
      deleteMomentFiles(current);
      update((s) => ({ ...s, moments: s.moments.filter((m) => m.id !== current.id) }));
      if (moments.length <= 1) close();
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
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={close} style={styles.iconButton}>
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
        extraData={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          setSaved(null);
        }}
        renderItem={({ item, index: i }) => (
          <View style={{ width, height: pageHeight, paddingHorizontal: space(4) }}>
            {isVideo(item) && i === index ? (
              // Only the clip on screen gets a player; the rest show their still frame.
              <MomentVideo moment={item} playing style={styles.photo} />
            ) : (
              <>
                <Image source={{ uri: item.uri }} style={styles.photo} contentFit="contain" transition={150} />
                {isVideo(item) ? <PlayBadge size={64} /> : null}
              </>
            )}
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

const useStyles = makeStyles((colors, fonts) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { justifyContent: 'space-between', paddingHorizontal: space(4), paddingVertical: space(2) },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { ...fonts.bodyMedium, fontSize: 14, color: colors.inkSoft },
  photo: { width: '100%', height: '100%', borderRadius: radius.lg },
  footer: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(4), gap: space(2) },
  who: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  caption: { ...fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
}));
