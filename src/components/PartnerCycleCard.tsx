import { useState } from 'react';
import { Text, View } from 'react-native';

import { partnerView, phaseCopy, type PartnerView, type SharedCycle } from '../lib/cycle';
import { dateRange, diffDays, shortDate, type DateKey } from '../lib/dates';
import { useToday } from '../lib/hooks';
import { makeStyles, space, useTheme } from '../theme';
import { MonthCalendar } from './MonthCalendar';
import { Body, Card, Eyebrow, Heading } from './ui';

/**
 * What your partner shares of their cycle: the day and phase, a bar of this cycle, and
 * (with `calendar`) a view-only copy of their calendar.
 */
export function PartnerCycleCard({ name, cycle, calendar }: { name: string; cycle: SharedCycle; calendar?: boolean }) {
  const { colors } = useTheme();
  const today = useToday();
  const view = partnerView(cycle, today);
  const { cycleDay, phase, daysUntilNext: daysUntil } = view;
  return (
    <>
      <Card tone="plum">
        <Eyebrow color={colors.plum}>{name}'s cycle</Eyebrow>
        <Heading style={{ fontSize: 19 }}>
          Day {cycleDay} · {phaseCopy[phase].title}
        </Heading>
        <Body style={{ fontSize: 14 }}>
          {daysUntil > 0
            ? `Period expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${shortDate(view.nextPeriod)}${
                view.nextLatest !== view.nextPeriod ? `, or as late as ${shortDate(view.nextLatest)}` : ''
              }).`
            : daysUntil === 0
              ? 'Period expected today.'
              : `Period was expected ${shortDate(view.nextPeriod)}.`}{' '}
          {phaseCopy[phase].body}
        </Body>
        <PhaseBar view={view} />
      </Card>
      {calendar ? (
        <Card>
          <Eyebrow color={colors.plum}>{name}'s calendar</Eyebrow>
          <MonthCalendar map={view.map} today={today} />
          <Body muted style={{ fontSize: 12, textAlign: 'center' }}>
            View only. It follows what {name} logs on their phone.
          </Body>
        </Card>
      ) : null}
    </>
  );
}

/** This cycle from day 1 to the next period: the period, the fertile window, ovulation and today. */
export function PhaseBar({ view }: { view: PartnerView }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  // A late period stretches the bar so today stays on it.
  const days = Math.max(view.cycleLength, view.cycleDay);
  const at = (key: DateKey) => diffDays(view.periodStart, key);
  const span = (start: DateKey, end: DateKey) => {
    const from = Math.max(at(start), 0);
    const to = Math.min(at(end), days - 1);
    return to < from ? null : { left: `${(from / days) * 100}%` as const, width: `${((to - from + 1) / days) * 100}%` as const };
  };
  const period = span(view.periodStart, view.periodEnd);
  const fertile = span(view.fertileStart, view.fertileEnd);
  const ovulation = at(view.ovulation);
  const todayX = ((view.cycleDay - 0.5) / days) * width;
  const labelWidth = 64;
  const labelLeft = Math.min(Math.max(todayX - labelWidth / 2, 0), Math.max(width - labelWidth, 0));

  return (
    <View
      accessible
      accessibilityLabel={`Day ${view.cycleDay} of about ${view.cycleLength}. Period ${dateRange(view.periodStart, view.periodEnd)}, fertile ${dateRange(view.fertileStart, view.fertileEnd)}, ovulation ${shortDate(view.ovulation)}.`}
      style={{ gap: space(2), marginTop: space(1) }}
    >
      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {period ? <View style={[styles.segment, period, { backgroundColor: colors.flame }]} /> : null}
        {fertile ? <View style={[styles.segment, fertile, { backgroundColor: colors.fertile }]} /> : null}
        {ovulation >= 0 && ovulation < days ? (
          <View
            style={[
              styles.ovulation,
              { left: `${((ovulation + 0.5) / days) * 100}%`, backgroundColor: colors.plum },
            ]}
          />
        ) : null}
        {width ? <View style={[styles.today, { left: todayX - 1.5 }]} /> : null}
      </View>
      {width ? (
        <Text style={[styles.dayLabel, { marginLeft: labelLeft, width: labelWidth }]}>Day {view.cycleDay}</Text>
      ) : null}
      <View style={styles.legend}>
        <Key color={colors.flame} label="Period" value={dateRange(view.periodStart, view.periodEnd)} />
        <Key color={colors.fertile} label="Fertile" value={dateRange(view.fertileStart, view.fertileEnd)} />
        <Key color={colors.plum} label="Ovulation" value={shortDate(view.ovulation)} />
      </View>
    </View>
  );
}

function Key({ color, label, value }: { color: string; label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.key}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.keyText}>
        {label} <Text style={styles.keyValue}>{value}</Text>
      </Text>
    </View>
  );
}

const BAR = 18;

const useStyles = makeStyles((colors, fonts) => ({
  track: { height: BAR, borderRadius: BAR / 2, backgroundColor: colors.line, marginTop: space(2) },
  segment: { position: 'absolute', top: 0, bottom: 0, borderRadius: BAR / 2 },
  ovulation: {
    position: 'absolute',
    top: 3,
    width: BAR - 6,
    height: BAR - 6,
    marginLeft: -(BAR - 6) / 2,
    borderRadius: (BAR - 6) / 2,
  },
  today: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  dayLabel: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space(3), rowGap: space(1) },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  keyText: { ...fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  keyValue: { ...fonts.body, color: colors.muted },
}));
