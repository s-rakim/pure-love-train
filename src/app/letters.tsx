import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Eyebrow, Field, Row, Screen, SectionTitle, Sheet, tap } from '../components/ui';
import { relativeTime, shortDate, toKey } from '../lib/dates';
import { useNames } from '../lib/hooks';
import { newId, useStore, type Letter } from '../lib/store';
import { makeStyles, radius, space, useTheme } from '../theme';

const OCCASIONS = [
  { label: '🥺 You miss me', when: 'Open when you miss me' },
  { label: '🌙 You can’t sleep', when: 'Open when you can’t sleep' },
  { label: '😂 You need a laugh', when: 'Open when you need a laugh' },
  { label: '🌧️ It’s a hard day', when: 'Open when you’re having a hard day' },
  { label: '💔 We’ve had a fight', when: 'Open when we’ve had a fight' },
  { label: '🏆 You did it', when: 'Open when you’ve done something amazing' },
  { label: '✈️ We’re apart', when: 'Open when we’re far apart' },
  { label: '🎂 Your birthday', when: 'Open on your birthday' },
];

/** Turns "you're nervous", "When you're nervous" or "on our anniversary" into a proper "Open…" line. */
function occasionFrom(custom: string) {
  const text = custom.trim();
  if (/^open\b/i.test(text)) return `O${text.slice(1)}`;
  if (/^(when|on|after|before|if)\b/i.test(text)) return `Open ${text[0].toLowerCase()}${text.slice(1)}`;
  return `Open when ${text}`;
}

/** "Open when…" letters: written now, kept sealed until the moment they're for. */
export default function Letters() {
  const { colors } = useTheme();
  const { state, update } = useStore();
  const names = useNames();
  const [occasion, setOccasion] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);

  const letters = state.letters ?? [];
  // Sealed ones first, so the ones still waiting are easy to find.
  const sealedFirst = (a: Letter, b: Letter) => Number(!!a.openedAt) - Number(!!b.openedAt);
  const forMe = letters.filter((l) => l.from === 'partner').sort(sealedFirst);
  const fromMe = letters.filter((l) => l.from === 'me');
  const when = custom.trim() ? occasionFrom(custom) : occasion;
  const reading = letters.find((l) => l.id === readingId);

  const seal = () => {
    if (!when || !text.trim()) return;
    const letter: Letter = { id: newId(), when, text: text.trim(), from: 'me', createdAt: new Date().toISOString() };
    update((s) => ({ ...s, letters: [letter, ...(s.letters ?? [])] }));
    setOccasion(null);
    setCustom('');
    setText('');
    setSent(true);
  };

  const open = (id: string) =>
    update((s) => ({
      ...s,
      letters: s.letters.map((l) => (l.id === id && !l.openedAt ? { ...l, openedAt: new Date().toISOString() } : l)),
    }));

  const takeBack = (id: string) => {
    const remove = () => {
      update((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) }));
      setReadingId(null);
    };
    if (Platform.OS === 'web') return remove();
    Alert.alert('Take this letter back?', `${names.partner} hasn't opened it yet, so it will just disappear.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Take it back', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <Screen edges={[]} style={{ paddingTop: space(2) }}>
      <Card tone="plum">
        <Eyebrow color={colors.plum}>Write a letter</Eyebrow>
        <Body style={{ fontSize: 14 }}>
          {names.partner} sees the envelope straight away, but it stays sealed until they choose to open it.
        </Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {OCCASIONS.map((o) => (
            <Chip
              key={o.when}
              label={o.label}
              color={colors.plum}
              selected={!custom.trim() && occasion === o.when}
              onPress={() => {
                setCustom('');
                setOccasion(o.when);
                setSent(false);
              }}
            />
          ))}
        </View>
        <Field
          value={custom}
          onChangeText={(v) => {
            setCustom(v);
            setSent(false);
          }}
          placeholder="Or your own: Open when…"
          maxLength={60}
        />
        <Field
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSent(false);
          }}
          placeholder={when ? `${when}…` : 'Dear…'}
          multiline
          maxLength={2000}
          style={{ minHeight: 140, textAlignVertical: 'top' }}
        />
        <Button
          label={`Seal it for ${names.partner}`}
          onPress={seal}
          disabled={!when || !text.trim()}
          icon={<Ionicons name="mail" size={18} color={when && text.trim() ? colors.white : colors.muted} />}
        />
        {sent ? <Body style={{ fontSize: 13, textAlign: 'center' }}>Sealed and sent to {names.partner} 💌</Body> : null}
      </Card>

      <SectionTitle>For you</SectionTitle>
      {forMe.length ? (
        forMe.map((l) => (
          <Envelope
            key={l.id}
            letter={l}
            meta={l.openedAt ? `From ${names.partner} · opened ${relativeTime(l.openedAt)}` : `From ${names.partner} · sealed`}
            onPress={() => setReadingId(l.id)}
          />
        ))
      ) : (
        <Body muted>Letters from {names.partner} land here, sealed until you open them.</Body>
      )}

      {fromMe.length ? (
        <>
          <SectionTitle>You wrote</SectionTitle>
          {fromMe.map((l) => (
            <Envelope
              key={l.id}
              letter={l}
              meta={l.openedAt ? `${names.partner} opened it ${relativeTime(l.openedAt)}` : 'Still sealed'}
              onPress={() => setReadingId(l.id)}
            />
          ))}
        </>
      ) : null}

      <Sheet visible={!!reading} title={reading?.when ?? ''} onClose={() => setReadingId(null)}>
        {reading ? (
          reading.from === 'partner' && !reading.openedAt ? (
            <View style={{ alignItems: 'center', gap: space(3) }}>
              <Text style={{ fontSize: 56 }}>💌</Text>
              <Body muted style={{ textAlign: 'center' }}>
                {names.partner} wrote this for just that moment. Is it now?
              </Body>
              <Row style={{ alignSelf: 'stretch' }}>
                <Button label="Not yet" variant="ghost" onPress={() => setReadingId(null)} style={{ flex: 1 }} />
                <Button label="Open it" onPress={() => open(reading.id)} style={{ flex: 1 }} />
              </Row>
            </View>
          ) : (
            <LetterBody
              letter={reading}
              signature={reading.from === 'me' ? names.me : names.partner}
              onTakeBack={reading.from === 'me' && !reading.openedAt ? () => takeBack(reading.id) : undefined}
            />
          )
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Envelope({ letter, meta, onPress }: { letter: Letter; meta: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const sealed = !letter.openedAt;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.envelope, sealed && { borderColor: colors.plum }, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.envelopeIcon, { backgroundColor: sealed ? colors.plumSoft : colors.surfaceRaised }]}>
        <Ionicons name={sealed ? 'mail' : 'mail-open-outline'} size={20} color={sealed ? colors.plum : colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.when}>{letter.when}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

function LetterBody({ letter, signature, onTakeBack }: { letter: Letter; signature: string; onTakeBack?: () => void }) {
  const styles = useStyles();
  return (
    <View style={{ gap: space(3) }}>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: space(3) }}>
        <Text style={styles.letterText}>{letter.text}</Text>
        <Text style={styles.signature}>
          {signature} · {shortDate(toKey(new Date(letter.createdAt)))}
        </Text>
      </ScrollView>
      {onTakeBack ? <Button label="Take it back" variant="ghost" onPress={onTakeBack} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  envelope: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  envelopeIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  when: { ...fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { ...fonts.body, fontSize: 12, color: colors.muted },
  letterText: { ...fonts.body, fontSize: 17, lineHeight: 26, color: colors.ink },
  signature: { ...fonts.bodyMedium, fontSize: 14, color: colors.inkSoft, textAlign: 'right' },
}));
