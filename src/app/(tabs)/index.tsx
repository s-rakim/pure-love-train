import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoWidget } from '../../components/PhotoWidget';
import { QuestionCard } from '../../components/QuestionCard';
import { Avatar, Body, Button, Card, Chip, Eyebrow, Field, Heading, Row, Screen, Title } from '../../components/ui';
import { phaseCopy } from '../../lib/cycle';
import { relativeTime, shortDate } from '../../lib/dates';
import { useCycle, useDaysTogether, useNames } from '../../lib/hooks';
import { newId, useStore, type Person } from '../../lib/store';
import { colors, fonts, space } from '../../theme';

const MOODS = [
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤩', label: 'Excited' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😤', label: 'Stressed' },
  { emoji: '🥺', label: 'Need a hug' },
];

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { state, update } = useStore();
  const names = useNames();
  const days = useDaysTogether();
  const { prediction } = useCycle();
  const [pickingMood, setPickingMood] = useState(false);
  const [note, setNote] = useState('');

  const latestFromPartner = state.moments.find((m) => m.from === 'partner');
  const latestNoteFromPartner = state.notes.find((n) => n.from === 'partner');

  const setMood = (emoji: string, label: string) => {
    update((s) => ({ ...s, moods: { ...s.moods, me: { emoji, label, at: new Date().toISOString() } } }));
    setPickingMood(false);
  };

  const sendNote = () => {
    const text = note.trim();
    if (!text) return;
    update((s) => ({
      ...s,
      notes: [{ id: newId(), text, from: 'me', createdAt: new Date().toISOString() }, ...s.notes],
    }));
    setNote('');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Body muted>{greeting()},</Body>
          <Title>{names.me}</Title>
        </View>
        <Pressable accessibilityLabel="Settings" hitSlop={12} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.inkSoft} />
        </Pressable>
      </Row>

      <Card tone="flame" style={{ alignItems: 'center', paddingVertical: space(7) }}>
        <View style={{ flexDirection: 'row' }}>
          <Avatar name={names.me} size={56} tone={colors.flameDeep} />
          <View style={{ marginLeft: -14 }}>
            <Avatar name={names.partner} size={56} tone={colors.plum} />
          </View>
        </View>
        <Text style={styles.coupleNames}>
          {names.me} & {names.partner}
        </Text>
        {days !== null ? (
          <>
            <Text style={styles.daysNumber}>{days.toLocaleString()}</Text>
            <Text style={styles.daysLabel}>days together</Text>
          </>
        ) : (
          <Pressable onPress={() => router.push('/settings')}>
            <Text style={styles.daysLabel}>Add your anniversary in settings</Text>
          </Pressable>
        )}
      </Card>

      <Row style={{ alignItems: 'stretch' }}>
        <MoodTile who="me" name={names.me} onPress={() => setPickingMood((v) => !v)} />
        <MoodTile who="partner" name={names.partner} />
      </Row>
      {pickingMood ? (
        <Card>
          <Eyebrow>How are you feeling?</Eyebrow>
          <View style={styles.wrap}>
            {MOODS.map((m) => (
              <Chip
                key={m.label}
                label={`${m.emoji} ${m.label}`}
                selected={state.moods.me?.label === m.label}
                onPress={() => setMood(m.emoji, m.label)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <QuestionCard />

      <Row style={{ alignItems: 'stretch' }}>
        <Pressable onPress={() => router.push('/moments')}>
          <PhotoWidget moment={latestFromPartner} senderName={names.partner} size={160} />
        </Pressable>
        {state.cycle.tracking && prediction ? (
          <Card tone="blush" style={{ flex: 1, justifyContent: 'center' }} onPress={() => router.push('/cycle')}>
            <Eyebrow color={colors.flameDeep}>Cycle · Day {prediction.cycleDay}</Eyebrow>
            <Heading style={{ fontSize: 18 }}>{phaseCopy[prediction.phase].title}</Heading>
            <Body style={{ fontSize: 13, lineHeight: 18 }}>
              {prediction.daysUntilNext > 0
                ? `Period in ${prediction.daysUntilNext} day${prediction.daysUntilNext === 1 ? '' : 's'}`
                : prediction.daysUntilNext === 0
                  ? 'Period expected today'
                  : `Period ${-prediction.daysUntilNext} day${prediction.daysUntilNext === -1 ? '' : 's'} late`}
              {'\n'}
              {shortDate(prediction.nextPeriod)}
            </Body>
          </Card>
        ) : (
          <Card tone="plum" style={{ flex: 1, justifyContent: 'center' }} onPress={() => router.push('/together')}>
            <Eyebrow color={colors.plum}>Date idea</Eyebrow>
            <Body style={{ color: colors.ink }} numberOfLines={4}>
              {state.dateIdeas.find((d) => !d.done)?.text ?? 'Add a new date idea together'}
            </Body>
          </Card>
        )}
      </Row>

      <Card>
        <Eyebrow>Love notes</Eyebrow>
        {latestNoteFromPartner ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>“{latestNoteFromPartner.text}”</Text>
            <Body muted style={{ fontSize: 12 }}>
              {names.partner} · {relativeTime(latestNoteFromPartner.createdAt)}
            </Body>
          </View>
        ) : (
          <Body muted>Notes from {names.partner} will show up here.</Body>
        )}
        <Field value={note} onChangeText={setNote} placeholder={`Leave a note for ${names.partner}…`} />
        <Button label="Send note" variant="secondary" onPress={sendNote} disabled={!note.trim()} />
      </Card>
    </Screen>
  );
}

function MoodTile({ who, name, onPress }: { who: Person; name: string; onPress?: () => void }) {
  const { state } = useStore();
  const mood = state.moods[who];
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: space(1) }} onPress={onPress}>
      <Text style={{ fontSize: 34 }}>{mood?.emoji ?? (who === 'me' ? '🙂' : '💭')}</Text>
      <Text style={styles.moodLabel}>{mood?.label ?? (who === 'me' ? 'Set your mood' : 'No mood yet')}</Text>
      <Body muted style={{ fontSize: 12 }}>
        {name}
        {mood ? ` · ${relativeTime(mood.at)}` : ''}
      </Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  coupleNames: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white, marginTop: space(2) },
  daysNumber: { fontFamily: fonts.display, fontSize: 56, color: colors.white, lineHeight: 64 },
  daysLabel: { fontFamily: fonts.displayItalic, fontSize: 17, color: colors.white, opacity: 0.9 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  moodLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, textAlign: 'center' },
  note: { backgroundColor: colors.flameSoft, borderRadius: 16, padding: space(4), gap: space(1) },
  noteText: { fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 24, color: colors.ink },
});
