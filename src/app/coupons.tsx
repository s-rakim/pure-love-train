import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Chip, Eyebrow, Field, Screen, SectionTitle } from '../components/ui';
import { relativeTime } from '../lib/dates';
import { useNames } from '../lib/hooks';
import { newId, useStore, type Coupon } from '../lib/store';
import { makeStyles, radius, space, useTheme } from '../theme';

const IDEAS = [
  { emoji: '🍳', text: 'Breakfast in bed' },
  { emoji: '💆', text: 'A massage, no time limit' },
  { emoji: '🎬', text: 'Movie night, your pick' },
  { emoji: '🍝', text: 'I cook you dinner' },
  { emoji: '💃', text: 'A slow dance in the kitchen' },
  { emoji: '🧽', text: 'I do the dishes tonight' },
  { emoji: '🤗', text: 'One extra long hug' },
  { emoji: '✨', text: 'A yes day' },
];

/** Love coupons: small promises you give each other, redeemed whenever the other wants. */
export default function Coupons() {
  const { colors } = useTheme();
  const { state, update } = useStore();
  const names = useNames();
  const [pick, setPick] = useState<(typeof IDEAS)[number] | null>(null);
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const coupons = state.coupons ?? [];
  const forMe = coupons.filter((c) => c.from === 'partner');
  const fromMe = coupons.filter((c) => c.from === 'me');
  const text = custom.trim() || pick?.text || '';

  const give = () => {
    if (!text) return;
    const coupon: Coupon = {
      id: newId(),
      emoji: custom.trim() ? '💌' : (pick?.emoji ?? '💌'),
      text,
      from: 'me',
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, coupons: [coupon, ...(s.coupons ?? [])] }));
    setSent(text);
    setPick(null);
    setCustom('');
  };

  const redeem = (id: string) =>
    update((s) => ({
      ...s,
      coupons: s.coupons.map((c) => (c.id === id ? { ...c, redeemedAt: new Date().toISOString() } : c)),
    }));

  return (
    <Screen edges={[]} style={{ paddingTop: space(2) }}>
      <Card tone="rose">
        <Eyebrow color={colors.rose}>Give a coupon</Eyebrow>
        <Body style={{ fontSize: 14 }}>A little promise for {names.partner} to cash in whenever they like.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {IDEAS.map((idea) => (
            <Chip
              key={idea.text}
              label={`${idea.emoji} ${idea.text}`}
              color={colors.rose}
              selected={!custom.trim() && pick?.text === idea.text}
              onPress={() => {
                setCustom('');
                setPick(idea);
                setSent(null);
              }}
            />
          ))}
        </View>
        <Field
          value={custom}
          onChangeText={(v) => {
            setCustom(v);
            setSent(null);
          }}
          placeholder="Or write your own…"
          maxLength={60}
        />
        <Button label={text ? `Give “${text}”` : 'Pick one to give'} onPress={give} disabled={!text} />
        {sent ? <Body style={{ fontSize: 13, textAlign: 'center' }}>Sent to {names.partner} 💌</Body> : null}
      </Card>

      <SectionTitle>For you</SectionTitle>
      {forMe.length ? (
        forMe.map((c) => (
          <Ticket key={c.id} coupon={c} label={`From ${names.partner}`}>
            {c.redeemedAt ? null : <Button label="Redeem" variant="secondary" onPress={() => redeem(c.id)} />}
          </Ticket>
        ))
      ) : (
        <Body muted>Coupons from {names.partner} land here.</Body>
      )}

      {fromMe.length ? (
        <>
          <SectionTitle>You gave</SectionTitle>
          {fromMe.map((c) => (
            <Ticket key={c.id} coupon={c} label={`For ${names.partner}`} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Ticket({ coupon, label, children }: { coupon: Coupon; label: string; children?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={[styles.ticket, coupon.redeemedAt && { opacity: 0.6 }]}>
      <Text style={styles.emoji}>{coupon.emoji}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.text}>{coupon.text}</Text>
        <Text style={styles.meta}>
          {label} · {coupon.redeemedAt ? `redeemed ${relativeTime(coupon.redeemedAt)}` : relativeTime(coupon.createdAt)}
        </Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.rose,
    backgroundColor: colors.surface,
  },
  emoji: { fontSize: 28 },
  text: { ...fonts.bodyBold, fontSize: 16, color: colors.ink },
  meta: { ...fonts.body, fontSize: 12, color: colors.muted },
}));
