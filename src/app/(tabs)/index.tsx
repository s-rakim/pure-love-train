import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Flame } from '../../components/Flame';
import { PhotoWidget } from '../../components/PhotoWidget';
import { Body, Button, Card, Chip, Eyebrow, Field, Heading, Row, Screen, SectionTitle, Title, tap } from '../../components/ui';
import { phaseCopy, sharedCycleOn } from '../../lib/cycle';
import { relativeTime, shortDate, toKey } from '../../lib/dates';
import { useCycle, useDaysTogether, useNames, useStreak, useToday } from '../../lib/hooks';
import { newId, useStore, type Person } from '../../lib/store';
import { useColors, type Colors } from '../../theme/theme';
import { fonts, radius, space } from '../../theme';

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

type IconName = keyof typeof Ionicons.glyphMap;

export default function Home() {
  const { state, update } = useStore();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const names = useNames();
  const today = useToday();
  const days = useDaysTogether();
  const streak = useStreak();
  const { prediction } = useCycle();
  const [pickingMood, setPickingMood] = useState(false);
  const [pingSent, setPingSent] = useState(false);
  const [reminderDraft, setReminderDraft] = useState('');

  const latestFromPartner = state.moments.find((m) => m.from === 'partner');
  const latestNoteFromPartner = state.notes.find((n) => n.from === 'partner');
  const doneReminders = state.reminderLog[today] ?? [];
  const checklist: { label: string; done: boolean; href: Href }[] = [
    { label: "Answer today's question", done: !!state.answers[today]?.me, href: '/connect' },
    {
      label: `Send ${names.partner} a moment`,
      done: state.moments.some((m) => m.from === 'me' && dayOf(m.createdAt) === today),
      href: '/moments',
    },
    { label: 'Share how you feel', done: !!state.moods.me && dayOf(state.moods.me.at) === today, href: '/' },
  ];

  const setMood = (emoji: string, label: string) => {
    update((s) => ({ ...s, moods: { ...s.moods, me: { emoji, label, at: new Date().toISOString() } } }));
    setPickingMood(false);
  };

  const nextIdea = state.dateIdeas.find((d) => !d.done)?.text;

  /** One tap tells the partner they're on your mind; sync carries it to their phone. */
  const sendPing = () => {
    tap();
    update((s) => ({
      ...s,
      pings: [{ id: newId(), from: 'me', createdAt: new Date().toISOString() }, ...s.pings].slice(0, 20),
    }));
    setPingSent(true);
    setTimeout(() => setPingSent(false), 2000);
  };

  const addReminder = () => {
    const text = reminderDraft.trim();
    if (!text) return;
    update((s) => ({ ...s, reminders: [...s.reminders, { id: newId(), text }] }));
    setReminderDraft('');
  };

  const toggleReminder = (id: string) =>
    update((s) => {
      const day = s.reminderLog[today] ?? [];
      const reminderLog = {
        ...s.reminderLog,
        [today]: day.includes(id) ? day.filter((x) => x !== id) : [...day, id],
      };
      return { ...s, reminderLog };
    });

  const removeReminder = (id: string) =>
    update((s) => ({
      ...s,
      reminders: s.reminders.filter((r) => r.id !== id),
      reminderLog: Object.fromEntries(Object.entries(s.reminderLog).map(([d, ids]) => [d, ids.filter((x) => x !== id)])),
    }));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Body muted>{greeting()}</Body>
          <Title>{names.me}</Title>
        </View>
        <Pressable
          accessibilityLabel={`${streak.count} day streak`}
          onPress={() => router.push('/us')}
          style={styles.streakPill}
        >
          <Ionicons name="flame" size={18} color={streak.count ? colors.flame : colors.muted} />
          <Text style={styles.streakText}>{streak.count}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Settings" hitSlop={12} onPress={() => router.push('/settings')} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={20} color={colors.inkSoft} />
        </Pressable>
      </Row>

      <Card style={{ gap: space(4) }}>
        <Row style={{ gap: space(2) }}>
          <Flame size={58} lit={streak.count > 0 || streak.doneToday} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.heroTitle}>
              {streak.count ? `${streak.count} day streak` : 'Light your flame'}
            </Text>
            <Body muted style={{ fontSize: 14, lineHeight: 19 }}>
              {streak.doneToday
                ? `You and ${names.partner} showed up today.`
                : `Do one thing together today to keep it burning.`}
            </Body>
          </View>
        </Row>
        <View style={{ gap: space(2) }}>
          {checklist.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                tap();
                if (item.href === '/') setPickingMood(true);
                else router.push(item.href);
              }}
              style={styles.checkRow}
            >
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={item.done ? colors.flame : colors.muted}
              />
              <Text style={[styles.checkLabel, item.done && { color: colors.muted }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card tone="rose" style={{ gap: space(3) }}>
        <Row style={{ gap: space(3) }}>
          <View style={[styles.pingIcon, { backgroundColor: colors.rose }]}>
            <Ionicons name="heart" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.pingTitle}>Thinking of {names.partner}?</Text>
            <Body style={{ fontSize: 13, lineHeight: 18 }}>
              One tap sends a little heart to their phone.
            </Body>
          </View>
        </Row>
        <Button
          label={pingSent ? 'Sent 💭' : `I'm thinking of you`}
          onPress={sendPing}
          disabled={pingSent}
          icon={<Ionicons name="heart" size={18} color={colors.white} />}
        />
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

      <SectionTitle>From {names.partner}</SectionTitle>
      <Row style={{ alignItems: 'stretch' }}>
        <Pressable onPress={() => router.push('/moments')}>
          <PhotoWidget moment={latestFromPartner} senderName={names.partner} size={156} />
        </Pressable>
        <Card style={{ flex: 1, justifyContent: 'space-between' }} onPress={() => router.push('/connect')}>
          <Ionicons name="mail" size={20} color={colors.rose} />
          {latestNoteFromPartner ? (
            <>
              <Text style={styles.noteText} numberOfLines={4}>
                “{latestNoteFromPartner.text}”
              </Text>
              <Body muted style={{ fontSize: 12 }}>{relativeTime(latestNoteFromPartner.createdAt)}</Body>
            </>
          ) : (
            <Body muted style={{ fontSize: 14 }}>No notes yet. Leave one first.</Body>
          )}
        </Card>
      </Row>

      {state.partnerCycle ? <PartnerCycleCard name={names.partner} /> : null}

      <SectionTitle>Daily reminders</SectionTitle>
      <Card>
        {state.reminders.length === 0 ? (
          <Body muted>Add the little habits you want to remember each day.</Body>
        ) : (
          state.reminders.map((r) => {
            const done = doneReminders.includes(r.id);
            return (
              <Row key={r.id} style={styles.reminderRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  hitSlop={8}
                  onPress={() => toggleReminder(r.id)}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={done ? colors.sageDeep : colors.muted}
                  />
                </Pressable>
                <Text style={[styles.reminderText, done && styles.reminderDone]}>{r.text}</Text>
                <Pressable accessibilityLabel={`Remove ${r.text}`} hitSlop={8} onPress={() => removeReminder(r.id)}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </Row>
            );
          })
        )}
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              value={reminderDraft}
              onChangeText={setReminderDraft}
              placeholder="Add a reminder…"
              onSubmitEditing={addReminder}
            />
          </View>
          <Button label="Add" variant="secondary" onPress={addReminder} disabled={!reminderDraft.trim()} />
        </Row>
      </Card>

      <SectionTitle>Activities</SectionTitle>
      <View style={styles.grid}>
        <ActivityTile
          icon="chatbubbles"
          color={colors.ember}
          tint={colors.emberSoft}
          title="Daily question"
          subtitle={state.answers[today]?.me ? 'Answered' : 'New today'}
          onPress={() => router.push('/connect')}
        />
        <ActivityTile
          icon="camera"
          color={colors.rose}
          tint={colors.roseSoft}
          title="Send a moment"
          subtitle="Lands on their widget"
          onPress={() => router.push('/moments')}
        />
        <ActivityTile
          icon="heart"
          color={colors.plum}
          tint={colors.plumSoft}
          title="Love note"
          subtitle="Say something sweet"
          onPress={() => router.push('/connect')}
        />
        {state.cycle.tracking && prediction ? (
          <ActivityTile
            icon="water"
            color={colors.sky}
            tint={colors.skySoft}
            title={`Cycle day ${prediction.cycleDay}`}
            subtitle={phaseCopy[prediction.phase].title}
            onPress={() => router.push('/cycle')}
          />
        ) : null}
        <ActivityTile
          icon="sparkles"
          color={colors.sageDeep}
          tint={colors.sage}
          title="Date idea"
          subtitle={nextIdea ?? 'Add one together'}
          onPress={() => router.push('/us')}
        />
        <ActivityTile
          icon="calendar"
          color={colors.flame}
          tint={colors.flameSoft}
          title={days !== null ? `${days.toLocaleString()} days` : 'Anniversary'}
          subtitle={days !== null ? 'together' : 'Add it in settings'}
          onPress={() => router.push(days !== null ? '/us' : '/settings')}
        />
      </View>
    </Screen>
  );
}

const dayOf = (iso: string) => toKey(new Date(iso));

function ActivityTile({
  icon,
  color,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  color: string;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={colors.black} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>{subtitle}</Text>
    </Pressable>
  );
}

function PartnerCycleCard({ name }: { name: string }) {
  const { state } = useStore();
  const colors = useColors();
  const today = useToday();
  const c = state.partnerCycle!;
  const { cycleDay, phase, daysUntilNext: daysUntil } = sharedCycleOn(c, today);
  return (
    <Card tone="plum">
      <Eyebrow color={colors.plum}>{name}'s cycle</Eyebrow>
      <Heading style={{ fontSize: 19 }}>
        Day {cycleDay} · {phaseCopy[phase].title}
      </Heading>
      <Body style={{ fontSize: 14 }}>
        {daysUntil > 0
          ? `Period expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${shortDate(c.nextPeriod)}).`
          : daysUntil === 0
            ? 'Period expected today.'
            : `Period was expected ${shortDate(c.nextPeriod)}.`}{' '}
        {phaseCopy[phase].body}
      </Body>
    </Card>
  );
}

function MoodTile({ who, name, onPress }: { who: Person; name: string; onPress?: () => void }) {
  const { state } = useStore();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.pill,
      paddingHorizontal: space(3),
      height: 40,
    },
    streakText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, letterSpacing: -0.4 },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      paddingHorizontal: space(3.5),
      paddingVertical: space(3),
    },
    checkLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
    moodLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, textAlign: 'center' },
    noteText: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
    pingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    pingTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, letterSpacing: -0.3 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
    tile: { width: '47.8%', flexGrow: 1, borderRadius: radius.lg, padding: space(4), gap: space(1.5), minHeight: 128 },
    tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space(1) },
    tileTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
    tileSubtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
    reminderRow: { gap: space(2) },
    reminderText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
    reminderDone: { color: colors.muted, textDecorationLine: 'line-through' },
  });
