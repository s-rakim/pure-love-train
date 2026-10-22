import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { relativeTime } from '../lib/dates';
import { useNames } from '../lib/hooks';
import { newId, useStore, type Ping } from '../lib/store';
import { fonts, radius, space } from '../theme';
import { useColors } from '../theme/theme';
import { tap } from './ui';

/** Pops up over everything when the partner's "thinking of you" ping arrives over sync. */
export function PingBanner() {
  const { state, update } = useStore();
  const colors = useColors();
  const names = useNames();
  const [ping, setPing] = useState<Ping | null>(null);

  const latestPartnerPing = state.pings
    .filter((p) => p.from === 'partner')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  useEffect(() => {
    if (!latestPartnerPing) return;
    if (state.lastPingViewedAt && latestPartnerPing.createdAt <= state.lastPingViewedAt) return;
    setPing(latestPartnerPing);
    // Mark it viewed right away so a re-render or app reopen doesn't show it again.
    update((s) => ({ ...s, lastPingViewedAt: latestPartnerPing.createdAt }));
  }, [latestPartnerPing, state.lastPingViewedAt]);

  useEffect(() => {
    if (!ping) return;
    const t = setTimeout(() => setPing(null), 6000);
    return () => clearTimeout(t);
  }, [ping]);

  const sendBack = () => {
    tap();
    update((s) => ({
      ...s,
      pings: [{ id: newId(), from: 'me', createdAt: new Date().toISOString() }, ...s.pings].slice(0, 20),
    }));
    setPing(null);
  };

  if (!ping) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={() => setPing(null)}>
      <Pressable style={styles.backdrop} onPress={() => setPing(null)}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={() => {}}>
          <View style={[styles.heartRing, { backgroundColor: colors.roseSoft }]}>
            <Ionicons name="heart" size={44} color={colors.rose} />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>{names.partner} is thinking of you</Text>
          <Text style={[styles.when, { color: colors.muted }]}>{relativeTime(ping.createdAt)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={sendBack}
            style={[styles.reply, { backgroundColor: colors.flame }]}
          >
            <Ionicons name="heart" size={18} color={colors.white} />
            <Text style={[styles.replyLabel, { color: colors.white }]}>Send one back</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(6),
  },
  card: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: space(2),
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space(7),
    width: '100%',
    maxWidth: 340,
  },
  heartRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(2),
  },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, textAlign: 'center', letterSpacing: -0.4 },
  when: { fontFamily: fonts.body, fontSize: 13 },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderRadius: radius.pill,
    paddingHorizontal: space(5),
    height: 48,
    marginTop: space(2),
  },
  replyLabel: { fontFamily: fonts.bodyBold, fontSize: 16 },
});
