import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MonthCalendar } from '../../components/MonthCalendar';
import { Body, Button, Card, Chip, Eyebrow, Heading, Row, Screen, Title } from '../../components/ui';
import { addPeriodDay, isPeriodDay, phaseCopy } from '../../lib/cycle';
import { shortDate } from '../../lib/dates';
import { useCycle, useNames } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import { useColors, type Colors } from '../../theme/theme';
import { fonts, space } from '../../theme';

export default function Cycle() {
  const { state, update } = useStore();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const names = useNames();
  const { prediction, map, today } = useCycle();
  const { periods, logs, shareWithPartner } = state.cycle;
  const onPeriodToday = isPeriodDay(periods, today);

  const startPeriodToday = () =>
    update((s) => ({ ...s, cycle: { ...s.cycle, periods: addPeriodDay(s.cycle.periods, today) } }));

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
        {!onPeriodToday ? (
          <Button label="Period started" onPress={startPeriodToday} style={{ flex: 1 }} />
        ) : null}
        <Button
          label="Log today"
          variant={onPeriodToday ? 'primary' : 'secondary'}
          onPress={() => router.push(`/log/${today}`)}
          style={{ flex: 1 }}
        />
      </Row>

      {prediction ? (
        <Row style={{ alignItems: 'stretch' }}>
          <Stat
            label="Next period"
            value={shortDate(prediction.nextPeriod)}
            sub={
              prediction.daysUntilNext >= 0
                ? `in ${prediction.daysUntilNext} day${prediction.daysUntilNext === 1 ? '' : 's'}`
                : `${-prediction.daysUntilNext} day${prediction.daysUntilNext === -1 ? '' : 's'} late`
            }
          />
          <Stat
            label="Fertile window"
            value={dateRange(prediction.fertileStart, prediction.fertileEnd)}
            sub={`ovulation ${shortDate(prediction.ovulation)}`}
          />
        </Row>
      ) : null}

      <Card>
        <MonthCalendar
          map={map}
          today={today}
          logged={logs}
          onSelect={(key) => router.push(`/log/${key}`)}
        />
      </Card>

      {prediction ? (
        <Card>
          <Eyebrow>Your averages</Eyebrow>
          <Row style={{ justifyContent: 'space-around' }}>
            <Average value={prediction.cycleLength} label="day cycle" />
            <Average value={prediction.periodLength} label="day period" />
            <Average value={periods.length} label="periods logged" />
          </Row>
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
    </Screen>
  );
}

function dateRange(start: string, end: string) {
  const [startMonth] = shortDate(start).split(' ');
  const [endMonth, endDay] = shortDate(end).split(' ');
  return `${shortDate(start)}–${startMonth === endMonth ? endDay : `${endMonth} ${endDay}`}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={{ flex: 1, gap: space(1) }}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={styles.statValue}>{value}</Text>
      <Body muted style={{ fontSize: 13 }}>{sub}</Body>
    </Card>
  );
}

function Average({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.avgValue}>{value}</Text>
      <Body muted style={{ fontSize: 12 }}>{label}</Body>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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
    ringDay: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white, letterSpacing: 1 },
    ringNumber: { fontFamily: fonts.display, fontSize: 48, lineHeight: 54, color: colors.white },
    onFlame: { color: colors.white, opacity: 0.92, textAlign: 'center' },
    statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
    avgValue: { fontFamily: fonts.display, fontSize: 28, color: colors.flame },
  });
