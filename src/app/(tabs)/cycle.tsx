import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MonthCalendar } from '../../components/MonthCalendar';
import { PeriodSheet, type PeriodEdit } from '../../components/PeriodSheet';
import { Body, Button, Card, Chip, Eyebrow, Heading, Row, Screen, Title } from '../../components/ui';
import {
  cycleHistory,
  isPeriodDay,
  openPeriod,
  phaseCopy,
  stagesOf,
  type CycleEntry,
  type Prediction,
  type Stage,
} from '../../lib/cycle';
import { addDays, dateRange, diffDays, shortDate, type DateKey } from '../../lib/dates';
import { useCycle, useNames } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import { makeStyles, space, useTheme, type Palette } from '../../theme';

export default function Cycle() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const { prediction, map, today } = useCycle();
  const { periods, logs, shareWithPartner } = state.cycle;
  const onPeriodToday = isPeriodDay(periods, today);
  const open = openPeriod(periods, today);
  const [sheet, setSheet] = useState<PeriodEdit | null>(null);
  const history = cycleHistory(periods, today).slice(0, 12);

  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <Title>Cycle</Title>
        <Body muted>Know what's coming, together.</Body>
      </View>

      {prediction ? (
        <Card tone="flame" style={{ alignItems: 'center', paddingVertical: space(7) }}>
          <View style={styles.ring}>
            <Text style={styles.ringDay}>Day</Text>
            <Text style={styles.ringNumber}>{prediction.cycleDay}</Text>
          </View>
          <Heading style={{ color: colors.white }}>{phaseCopy[prediction.phase].title}</Heading>
          <Body style={styles.onFlame}>{phaseCopy[prediction.phase].body}</Body>
        </Card>
      ) : (
        <Card tone="blush">
          <Heading>Start with your last period</Heading>
          <Body>
            Tap the first day of your last period on the calendar, or log today if it started today.
            Predictions get sharper with every cycle you log.
          </Body>
        </Card>
      )}

      <Row>
        {open ? (
          <Button label="Period ended" onPress={() => setSheet({ kind: 'end', period: open })} style={{ flex: 1 }} />
        ) : !onPeriodToday ? (
          <Button label="Period started" onPress={() => setSheet({ kind: 'start' })} style={{ flex: 1 }} />
        ) : null}
        <Button
          label="Log today"
          variant={onPeriodToday && !open ? 'primary' : 'secondary'}
          onPress={() => router.push(`/log/${today}`)}
          style={{ flex: 1 }}
        />
      </Row>
      {open && prediction ? (
        <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
          Day {diffDays(open.start, today) + 1} of your period. Until you confirm the last day, it's counted as{' '}
          {prediction.periodLength} days.
        </Body>
      ) : null}

      {prediction ? (
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Next period" value={shortDate(prediction.nextPeriod)} sub={nextPeriodText(prediction, today)} />
          <Stat
            label="Fertile window"
            value={dateRange(prediction.fertileStart, prediction.fertileEnd)}
            sub={`ovulation around ${shortDate(prediction.ovulation)}`}
          />
        </Row>
      ) : null}

      {prediction ? (
        <Card>
          <Eyebrow>This cycle</Eyebrow>
          {stagesOf(prediction, today).map((stage) => (
            <StageRow key={stage.phase} stage={stage} today={today} prediction={prediction} />
          ))}
          <View style={styles.stage}>
            <View style={[styles.stageDot, { backgroundColor: colors.flameSoft, borderColor: colors.flame, borderWidth: 1.5 }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stageTitle}>Next period</Text>
              <Body muted style={{ fontSize: 13 }}>
                {prediction.nextEarliest === prediction.nextLatest
                  ? `Around ${shortDate(prediction.nextPeriod)}`
                  : `Around ${shortDate(prediction.nextPeriod)}, likely between ${dateRange(prediction.nextEarliest, prediction.nextLatest)}`}
              </Body>
            </View>
          </View>
          <Body muted style={{ fontSize: 12 }}>
            Your period is what you log. The other phases are counted back from your next period (ovulation is usually
            about 14 days before it), so they're estimates that follow your own cycles. You're most likely to get
            pregnant in the fertile window, {dateRange(prediction.fertileStart, prediction.fertileEnd)}.
          </Body>
        </Card>
      ) : null}

      <Card>
        <MonthCalendar
          map={map}
          today={today}
          logged={logs}
          onSelect={(key) => router.push(`/log/${key}`)}
        />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>Your cycles</Eyebrow>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSheet({ kind: 'add' })} style={styles.addButton}>
            <Ionicons name="add" size={16} color={colors.flameDeep} />
            <Text style={styles.addLabel}>Add a past period</Text>
          </Pressable>
        </Row>
        {history.length ? (
          history.map((entry, i) => (
            <HistoryRow
              key={entry.period.start}
              entry={entry}
              current={i === 0}
              today={today}
              onPress={() => setSheet({ kind: 'edit', period: entry.period })}
            />
          ))
        ) : (
          <Body muted style={{ fontSize: 14 }}>Periods you log show up here. Tap one to change its dates.</Body>
        )}
      </Card>

      {prediction ? (
        <Card>
          <Eyebrow>Your averages</Eyebrow>
          <Row style={{ justifyContent: 'space-around' }}>
            <Average value={prediction.cycleLength} label="day cycle" />
            <Average value={prediction.periodLength} label="day period" />
            <Average value={periods.length} label="periods logged" />
          </Row>
          {prediction.shortestCycle !== prediction.longestCycle ? (
            <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
              Your recent cycles ran {prediction.shortestCycle} to {prediction.longestCycle} days.
              {prediction.irregular
                ? ' That changes by more than a week, so your next period and fertile days are shown as a wider window.'
                : ''}
            </Body>
          ) : null}
        </Card>
      ) : null}

      <Card tone="plum">
        <Eyebrow color={colors.plum}>Sharing</Eyebrow>
        <Body style={{ color: colors.ink }}>
          {shareWithPartner
            ? `${names.partner} sees your phase and next period, never your notes or symptoms.`
            : `Your cycle is private to you.`}
        </Body>
        <Row>
          <Chip
            label={`Share with ${names.partner}`}
            selected={shareWithPartner}
            color={colors.plum}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, shareWithPartner: true } }))}
          />
          <Chip
            label="Keep private"
            selected={!shareWithPartner}
            color={colors.plum}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, shareWithPartner: false } }))}
          />
        </Row>
      </Card>

      <Body muted style={{ fontSize: 12, textAlign: 'center' }}>
        Predictions are estimates and aren't a form of contraception or medical advice.
      </Body>

      <PeriodSheet edit={sheet} today={today} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function nextPeriodText(p: Prediction, today: DateKey) {
  if (today > p.nextLatest) return `${plural(diffDays(p.nextLatest, today), 'day')} later than usual`;
  if (today >= p.nextEarliest && p.nextEarliest !== p.nextLatest) return 'could start any day now';
  if (p.daysUntilNext > 0) return `in ${plural(p.daysUntilNext, 'day')}`;
  return p.daysUntilNext === 0 ? 'expected today' : `${plural(-p.daysUntilNext, 'day')} late`;
}

const stageColor = (phase: Stage['phase'], colors: Palette) =>
  ({ period: colors.flame, follicular: colors.sky, ovulation: colors.plum, luteal: colors.ember })[phase];

const stageNote = (stage: Stage, p: Prediction) => {
  if (stage.phase === 'period') return stage.estimated ? 'last day not confirmed yet' : 'from your log';
  if (stage.phase === 'ovulation' && p.irregular) {
    // Ovulation sits about 14 days before the period, so it moves with the cycle length.
    return `estimated, could be ${dateRange(addDays(p.nextEarliest, -14), addDays(p.nextLatest, -14))}`;
  }
  return 'estimated';
};

function StageRow({ stage, today, prediction }: { stage: Stage; today: DateKey; prediction: Prediction }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const now = today >= stage.start && today <= stage.end;
  return (
    <View style={styles.stage}>
      <View style={[styles.stageDot, { backgroundColor: stageColor(stage.phase, colors) }]} />
      <View style={{ flex: 1 }}>
        <Row style={{ gap: space(2) }}>
          <Text style={styles.stageTitle}>{phaseCopy[stage.phase].title}</Text>
          {now ? <Text style={styles.now}>Now</Text> : null}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          {dateRange(stage.start, stage.end)} · {stageNote(stage, prediction)}
        </Body>
      </View>
      <Text style={styles.stageDays}>
        {stage.estimated ? '~' : ''}
        {plural(stage.days, 'day')}
      </Text>
    </View>
  );
}

function HistoryRow({
  entry,
  current,
  today,
  onPress,
}: {
  entry: CycleEntry;
  current: boolean;
  today: DateKey;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { period, periodDays, cycleDays } = entry;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Change the period from ${shortDate(period.start)}`} onPress={onPress} style={styles.history}>
      <Text style={styles.historyDate}>{shortDate(period.start)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.historyText, periodDays === null && { color: colors.flameDeep }]}>
          {periodDays === null ? 'Last day not set' : `Period ${plural(periodDays, 'day')}`}
        </Text>
        <Body muted style={{ fontSize: 13 }}>
          {cycleDays !== null
            ? `Cycle ${plural(cycleDays, 'day')}`
            : current
              ? `Cycle so far: ${plural(diffDays(period.start, today) + 1, 'day')}`
              : ''}
        </Body>
      </View>
      <Ionicons name="create-outline" size={18} color={colors.muted} />
    </Pressable>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const styles = useStyles();
  return (
    <Card style={{ flex: 1, gap: space(1) }}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={styles.statValue}>{value}</Text>
      <Body muted style={{ fontSize: 13 }}>{sub}</Body>
    </Card>
  );
}

function Average({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.avgValue}>{value}</Text>
      <Body muted style={{ fontSize: 12 }}>{label}</Body>
    </View>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  ring: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(2),
  },
  ringDay: { ...fonts.bodyBold, fontSize: 13, color: colors.white, letterSpacing: 1 },
  ringNumber: { ...fonts.display, fontSize: 48, lineHeight: 54, color: colors.white },
  onFlame: { color: colors.white, opacity: 0.92, textAlign: 'center' },
  statValue: { ...fonts.display, fontSize: 20, color: colors.ink },
  avgValue: { ...fonts.display, fontSize: 28, color: colors.flame },
  stage: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(1) },
  stageDot: { width: 12, height: 12, borderRadius: 6 },
  stageTitle: { ...fonts.bodyBold, fontSize: 15, color: colors.ink },
  stageDays: { ...fonts.bodyBold, fontSize: 15, color: colors.ink },
  now: {
    ...fonts.bodyBold,
    fontSize: 11,
    color: colors.onAccent,
    backgroundColor: colors.flame,
    borderRadius: 999,
    paddingHorizontal: space(2),
    paddingVertical: 1,
    overflow: 'hidden',
  },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addLabel: { ...fonts.bodyBold, fontSize: 13, color: colors.flameDeep },
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  historyDate: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, width: 70 },
  historyText: { ...fonts.bodyMedium, fontSize: 15, color: colors.ink },
}));
