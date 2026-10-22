import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { Flame } from '../../components/Flame';
import { Avatar, Body, Button, Card, Eyebrow, Field, Row, Screen, SectionTitle, Title } from '../../components/ui';
import { addDays, diffDays, fromKey, shortDate, toKey, type DateKey } from '../../lib/dates';
import { useDaysTogether, useNames, useStreak, useToday } from '../../lib/hooks';
import { deletePhoto, persistPhoto, pickPhoto } from '../../lib/moments';
import { newId, useStore, type Person } from '../../lib/store';
import { useColors, type Colors } from '../../theme/theme';
import { fonts, radius, space } from '../../theme';

type Milestone = { label: string; date: DateKey; daysAway: number };

function upcomingMilestones(since: DateKey | undefined, today: DateKey): Milestone[] {
  if (!since) return [];
  const out: Milestone[] = [];
  const days = diffDays(since, today);

  const nextHundred = Math.max(100, Math.ceil((days + 1) / 100) * 100);
  const hundredDate = addDays(since, nextHundred);
  out.push({ label: `${nextHundred.toLocaleString()} days`, date: hundredDate, daysAway: diffDays(today, hundredDate) });

  const start = fromKey(since);
  const t = fromKey(today);
  let years = t.getFullYear() - start.getFullYear();
  let anniversary = toKey(new Date(start.getFullYear() + years, start.getMonth(), start.getDate()));
  if (anniversary <= today) {
    years += 1;
    anniversary = toKey(new Date(start.getFullYear() + years, start.getMonth(), start.getDate()));
  }
  out.push({
    label: `${years} year${years === 1 ? '' : 's'}`,
    date: anniversary,
    daysAway: diffDays(today, anniversary),
  });

  return out.sort((a, b) => a.daysAway - b.daysAway);
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function together(since: DateKey, today: DateKey) {
  const a = fromKey(since);
  const b = fromKey(today);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  if (b.getDate() < a.getDate()) months -= 1;
  return { years: Math.floor(months / 12), months: months % 12 };
}

/** The couple's dashboard: streak, time together, what's coming up and plans. */
export default function Us() {
  const { state, update } = useStore();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const names = useNames();
  const today = useToday();
  const days = useDaysTogether();
  const streak = useStreak();
  const [idea, setIdea] = useState('');

  const avatars = state.avatars ?? { me: null, partner: null };
  const milestones = upcomingMilestones(state.togetherSince, today);
  const span = state.togetherSince ? together(state.togetherSince, today) : null;
  const paired = !!state.sync && !state.sync.pairCode;

  const addIdea = () => {
    const text = idea.trim();
    if (!text) return;
    update((s) => ({ ...s, dateIdeas: [{ id: newId(), text, done: false }, ...s.dateIdeas] }));
    setIdea('');
  };

  const toggleIdea = (id: string) =>
    update((s) => ({
      ...s,
      dateIdeas: s.dateIdeas.map((d) => (d.id === id ? { ...d, done: !d.done } : d)),
    }));

  const removeIdea = (id: string) =>
    update((s) => ({ ...s, dateIdeas: s.dateIdeas.filter((d) => d.id !== id) }));

  /** Swap the small round avatar for a photo. Photos stay small and round no matter the source image. */
  const setAvatar = async (person: Person, source: 'camera' | 'library') => {
    try {
      const picked = await pickPhoto(source);
      if (!picked) return;
      const uri = await persistPhoto(picked, `avatar-${person}-${newId()}`);
      const old = (state.avatars ?? {})[person];
      if (old) deletePhoto(old);
      update((s) => ({ ...s, avatars: { me: null, partner: null, ...s.avatars, [person]: uri } }));
    } catch (err) {
      Alert.alert('Could not set the photo', err instanceof Error ? err.message : String(err));
    }
  };

  const clearAvatar = (person: Person) => {
    const doIt = () => {
      const old = (state.avatars ?? {})[person];
      if (old) deletePhoto(old);
      update((s) => ({ ...s, avatars: { me: null, partner: null, ...s.avatars, [person]: null } }));
    };
    if (Platform.OS === 'web') return doIt();
    Alert.alert('Remove the photo?', 'The initial comes back instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doIt },
    ]);
  };

  const avatarMenu = (person: Person) => {
    const who = person === 'me' ? names.me : names.partner;
    if (Platform.OS === 'web') {
      void setAvatar(person, 'library');
      return;
    }
    const buttons = [
      { text: 'Take photo', onPress: () => void setAvatar(person, 'camera') },
      { text: 'Choose photo', onPress: () => void setAvatar(person, 'library') },
      ...(avatars[person]
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => clearAvatar(person) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(`${who}'s picture`, 'Keep it small and round, like the initial it replaces.', buttons);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Us</Title>
        <View style={{ flexDirection: 'row' }}>
          <Pressable accessibilityLabel="Change your photo" onPress={() => avatarMenu('me')}>
            <Avatar name={names.me} size={40} tone={colors.flame} uri={avatars.me} />
          </Pressable>
          <View style={{ marginLeft: -10 }}>
            <Pressable accessibilityLabel={`Change ${names.partner}'s photo`} onPress={() => avatarMenu('partner')}>
              <Avatar name={names.partner} size={40} tone={colors.plum} uri={avatars.partner} />
            </Pressable>
          </View>
        </View>
      </Row>

      {!paired ? (
        <Card tone="flame" onPress={() => router.push('/settings')} style={{ gap: space(2) }}>
          <Text style={styles.pairTitle}>{state.sync ? `Waiting for ${names.partner}` : `Pair with ${names.partner}`}</Text>
          <Text style={styles.pairBody}>
            {state.sync
              ? `Share your code ${state.sync.pairCode} so ${names.partner} can join.`
              : 'Connect your phones so moments, answers and notes reach each other.'}
          </Text>
        </Card>
      ) : null}

      <Card style={{ alignItems: 'center', gap: space(2) }}>
        <Flame size={72} lit={streak.count > 0} />
        <Text style={styles.bigNumber}>{streak.count}</Text>
        <Text style={styles.bigLabel}>day streak</Text>
        <Row style={{ gap: space(2), marginTop: space(2) }}>
          {streak.week.map((d, i) => (
            <View key={d.key} style={{ alignItems: 'center', gap: space(1.5) }}>
              <Text style={[styles.weekday, d.isToday && { color: colors.ink }]}>{WEEKDAYS[i]}</Text>
              <View
                style={[
                  styles.dot,
                  d.active && { backgroundColor: colors.flame, borderColor: colors.flame },
                  d.isToday && !d.active && { borderColor: colors.flame },
                ]}
              >
                {d.active ? <Ionicons name="flame" size={14} color={colors.black} /> : null}
              </View>
            </View>
          ))}
        </Row>
        <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
          {streak.doneToday
            ? 'Today counts. See you tomorrow.'
            : 'Answer the question, send a moment or leave a note to keep it going.'}
        </Body>
      </Card>

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1, gap: space(1) }} onPress={state.togetherSince ? undefined : () => router.push('/settings')}>
          <Eyebrow color={colors.rose}>Together</Eyebrow>
          {days !== null ? (
            <>
              <Text style={styles.statNumber}>{days.toLocaleString()}</Text>
              <Body muted style={{ fontSize: 13 }}>
                days{span && span.years + span.months > 0
                  ? ` · ${span.years ? `${span.years}y ` : ''}${span.months}m`
                  : ''}
              </Body>
            </>
          ) : (
            <Body muted style={{ fontSize: 13 }}>Add your anniversary in settings</Body>
          )}
        </Card>
        {milestones[0] ? (
          <Card style={{ flex: 1, gap: space(1) }}>
            <Eyebrow color={colors.ember}>Next up</Eyebrow>
            <Text style={styles.statNumber}>{milestones[0].daysAway}</Text>
            <Body muted style={{ fontSize: 13 }}>days to {milestones[0].label}</Body>
          </Card>
        ) : null}
      </Row>

      {milestones.length ? (
        <>
          <SectionTitle>Countdowns</SectionTitle>
          {milestones.map((m) => (
            <Card key={m.label} style={styles.countdown}>
              <View style={styles.countIcon}>
                <Ionicons name="calendar" size={20} color={colors.flame} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.countTitle}>{m.label} together</Text>
                <Body muted style={{ fontSize: 13 }}>{shortDate(m.date)}</Body>
              </View>
              <Text style={styles.countDays}>{m.daysAway === 0 ? 'Today' : `${m.daysAway}d`}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <SectionTitle>Date ideas</SectionTitle>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={idea} onChangeText={setIdea} placeholder="Add an idea…" onSubmitEditing={addIdea} />
          </View>
          <Button label="Add" variant="secondary" onPress={addIdea} disabled={!idea.trim()} />
        </Row>
        {state.dateIdeas.map((d) => (
          <Row key={d.id} style={styles.idea}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: d.done }}
              hitSlop={8}
              onPress={() => toggleIdea(d.id)}
            >
              <Ionicons
                name={d.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={d.done ? colors.sageDeep : colors.muted}
              />
            </Pressable>
            <Text style={[styles.ideaText, d.done && styles.ideaDone]}>{d.text}</Text>
            <Pressable accessibilityLabel="Remove idea" hitSlop={8} onPress={() => removeIdea(d.id)}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    pairTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.white },
    pairBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.white, opacity: 0.9 },
    bigNumber: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, color: colors.ink, marginTop: -space(2) },
    bigLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft, marginTop: -space(2) },
    weekday: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    dot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statNumber: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 },
    countdown: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(4) },
    countIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.flameSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
    countDays: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.flame },
    idea: { paddingVertical: space(1) },
    ideaText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
    ideaDone: { color: colors.muted, textDecorationLine: 'line-through' },
  });
