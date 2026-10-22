import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';

import { relativeTime } from '../lib/dates';

const STATE_KEY = 'pure-love/state/v1';

type Latest = { uri: string; caption: string; senderName: string; createdAt: string };

/**
 * The home screen widget: a square tile showing the newest shared moment,
 * echoing the in-app PhotoWidget. Runs in the app process, so it reads the
 * same saved state the app writes.
 */
export function MomentWidget() {
  const [latest, setLatest] = useState<Latest | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        if (!raw || !alive) return;
        const state = JSON.parse(raw);
        const moments: any[] = state.moments ?? [];
        const moment = moments.find((m) => m.from === 'partner') ?? moments[0];
        if (!moment || !alive) return;
        const senderName =
          moment.from === 'partner' ? state.names?.partner : state.names?.me;
        setLatest({
          uri: moment.uri,
          caption: moment.caption ?? '',
          senderName: senderName || 'Your person',
          createdAt: moment.createdAt,
        });
      } catch {
        // Keep the placeholder when the saved state can't be read.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#191615',
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {latest ? (
        <OverlapWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          <ImageWidget
            imageUrl={latest.uri}
            style={{ height: 'match_parent', width: 'match_parent', borderRadius: 26 }}
            imageWidth="match_parent"
            imageHeight="match_parent"
          />
          <FlexWidget
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderBottomLeftRadius: 26,
              borderBottomRightRadius: 26,
            }}
          >
            {latest.caption ? (
              <TextWidget text={latest.caption} style={{ fontSize: 12, color: '#FFFFFF' }} maxLines={1} />
            ) : null}
            <TextWidget
              text={`${latest.senderName} · ${relativeTime(latest.createdAt)}`}
              style={{ fontSize: 10, color: '#FFF6EE', opacity: 0.85 }}
              maxLines={1}
            />
          </FlexWidget>
        </OverlapWidget>
      ) : (
        <FlexWidget style={{ alignItems: 'center', gap: 6 }}>
          <TextWidget text="🔥" style={{ fontSize: 22 }} />
          <TextWidget text="Waiting for a moment" style={{ fontSize: 12, color: '#CDBFB6' }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
