import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Flame } from '../../components/Flame';
import { NextDateSheet } from '../../components/NextDateSheet';
import { PhotoWidget } from '../../components/PhotoWidget';
import { Body, Card, Chip, Eyebrow, Heading, Row, Screen, SectionTitle, Sheet, Title, tap } from '../../components/ui';
import { phaseCopy, sharedCycleOn } from '../../lib/cycle';
import { diffDays, relativeTime, shortDate, toKey } from '../../lib/dates';
import { useCycle, useDaysTogether, useNames, useStreak, useToday } from '../../lib/hooks';
import { THIS_OR_THAT } from '../../lib/questions';
import { newId, useStore, type Person } from '../../lib/store';
import { makeStyles, radius, space, useTheme } from '../../theme';

const LOVE_TAPS = [
  { emoji: '🤗', label: 'Hug', text: 'Sending you a big hug' },
  { emoji: '😘', label: 'Kiss', text: 'Here’s a kiss for you' },
  { emoji: '💭', label: 'Thinking of you', text: 'Thinking of you' },
  { emoji: '🥺', label: 'Miss you', text: 'I miss you' },
  { emoji: '💖', label: 'Love you', text: 'I love you' },
];

// Roughly sunny to stormy, so the one you want is easy to find.
const MOODS = [
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😊', label: 'Happy' },
  { emoji: '🤩', label: 'Excited' },
  { emoji: '😏', label: 'Flirty' },
  { emoji: '🤪', label: 'Playful' },
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🥺', label: 'Missing you' },
  { emoji: '🤗', label: 'Need a hug' },
  { emoji: '😤', label: 'Stressed' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Upset' },
  { emoji: '🤒', label: 'Unwell' },
];

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type IconName = keyof typeof Ionicons.glyphMap;

export default function Home() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const today = useToday();
  const days = useDaysTogether();
  const streak = useStreak();
  const { prediction } = useCycle();
  const [pickingMood, setPickingMood] = useState(false);
  const [pickingTap, setPickingTap] = useState(false);
  const [sentTap, setSentTap] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);

  const latestFromPartner = state.moments.find((m) => m.from === 'partner');
  const latestNoteFromPartner = state.notes.find((n) => n.from === 'partner');
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
    update((s) => {
      const days = (s.moodDays?.me ?? []).filter((d) => d !== today);
      return {
        ...s,
        moods: { ...s.moods, me: { emoji, label, at: new Date().toISOString() } },
        moodDays: { ...s.moodDays, me: [...days, today].slice(-60) },
      };
    });
    setPickingMood(false);
  };

  const nextIdea = state.dateIdeas.find((d) => !d.done)?.text;
  const couponsToRedeem = (state.coupons ?? []).filter((c) => c.from === 'partner' && !c.redeemedAt).length;
  const picks = state.picks ?? {};
  const picksWaiting = THIS_OR_THAT.filter((p) => picks[p.id]?.partner && !picks[p.id]?.me).length;
  const sealedForMe = (state.letters ?? []).filter((l) => l.from === 'partner' && !l.openedAt).length;
  const nextDate = state.nextDate && state.nextDate.date >= today ? state.nextDate : undefined;
  const dateAway = nextDate ? diffDays(today, nextDate.date) : 0;

  // A love tap is a one-line note, so it reaches the partner like any other note.
  const sendTap = (tap: (typeof LOVE_TAPS)[number]) => {
    const text = `${tap.emoji} ${tap.text}`;
    update((s) => ({
      ...s,
      notes: [{ id: newId(), text, from: 'me', createdAt: new Date().toISOString() }, ...s.notes],
    }));
    setSentTap(tap.label);
    setPickingTap(false);
  };

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
                : streak.meDone
                  ? `Your three are done. Waiting on ${names.partner}.`
                  : `Tick all three, both of you, to keep it burning.`}
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
        <ActivityTile
          icon="happy"
          color={colors.ember}
          tint={colors.emberSoft}
          title="Send a hug"
          subtitle={sentTap ? `${sentTap} sent` : 'One tap, straight to them'}
          onPress={() => setPickingTap((v) => !v)}
        />
        <ActivityTile
          icon="swap-horizontal"
          color={colors.sky}
          tint={colors.skySoft}
          title="This or that"
          subtitle={picksWaiting ? `${picksWaiting} waiting for you` : 'Pick a side, see if you match'}
          onPress={() => router.push('/this-or-that')}
        />
        <ActivityTile
          icon="mail-open"
          color={colors.plum}
          tint={colors.plumSoft}
          title="Open when…"
          subtitle={sealedForMe ? `${sealedForMe} sealed for you` : 'Letters for the right moment'}
          onPress={() => router.push('/letters')}
        />
        <ActivityTile
          icon="ticket"
          color={colors.rose}
          tint={colors.roseSoft}
          title="Love coupons"
          subtitle={couponsToRedeem ? `${couponsToRedeem} to redeem` : 'Give a sweet promise'}
          onPress={() => router.push('/coupons')}
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
          title="Date night spin"
          subtitle={nextIdea ? 'Let fate pick tonight' : 'Add ideas together'}
          onPress={() => router.push(nextIdea ? '/us?spin=1' : '/us')}
        />
        <ActivityTile
          icon="hourglass"
          color={colors.ember}
          tint={colors.emberSoft}
          title={
            !nextDate
              ? 'Next date'
              : dateAway === 0
                ? 'Date today'
                : dateAway === 1
                  ? 'Date tomorrow'
                  : `${dateAway} days to go`
          }
          subtitle={nextDate ? nextDate.label || shortDate(nextDate.date) : 'Plan it, count it down'}
          onPress={() => setPlanning(true)}
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
      <Sheet visible={pickingTap} title={`Send ${names.partner} a little love`} onClose={() => setPickingTap(false)}>
        <View style={styles.wrap}>
          {LOVE_TAPS.map((t) => (
            <Chip key={t.label} label={`${t.emoji} ${t.label}`} onPress={() => sendTap(t)} />
          ))}
        </View>
        <Body muted style={{ fontSize: 13 }}>It lands in your love notes.</Body>
      </Sheet>
      <NextDateSheet visible={planning} onClose={() => setPlanning(false)} />
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
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={colors.onAccent} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>{subtitle}</Text>
    </Pressable>
  );
}

function PartnerCycleCard({ name }: { name: string }) {
  const { colors } = useTheme();
  const { state } = useStore();
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
          ? `Period expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${shortDate(c.nextPeriod)}${
              c.nextLatest && c.nextLatest !== c.nextPeriod ? `, or as late as ${shortDate(c.nextLatest)}` : ''
            }).`
          : daysUntil === 0
            ? 'Period expected today.'
            : `Period was expected ${shortDate(c.nextPeriod)}.`}{' '}
        {phaseCopy[phase].body}
      </Body>
    </Card>
  );
}

function MoodTile({ who, name, onPress }: { who: Person; name: string; onPress?: () => void }) {
  const styles = useStyles();
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

const useStyles = makeStyles((colors, fonts) => ({
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
  streakText: { ...fonts.bodyBold, fontSize: 15, color: colors.ink },
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
  heroTitle: { ...fonts.display, fontSize: 21, color: colors.ink, letterSpacing: -0.4 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
  },
  checkLabel: { flex: 1, ...fonts.bodyMedium, fontSize: 15, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  moodLabel: { ...fonts.bodyBold, fontSize: 14, color: colors.ink, textAlign: 'center' },
  noteText: { ...fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: { width: '47.8%', flexGrow: 1, borderRadius: radius.lg, padding: space(4), gap: space(1.5), minHeight: 128 },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space(1) },
  tileTitle: { ...fonts.bodyBold, fontSize: 16, color: colors.ink },
  tileSubtitle: { ...fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
}));
