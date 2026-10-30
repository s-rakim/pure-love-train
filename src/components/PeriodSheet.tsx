import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import {
  editPeriod,
  endPeriod,
  normalize,
  overlapsAnother,
  startPeriod,
  type DayKind,
  type Period,
} from '../lib/cycle';
import { addDays, dateRange, diffDays, shortDate, type DateKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { makeStyles, space, useTheme } from '../theme';
import { MonthCalendar } from './MonthCalendar';
import { Body, Button, Chip, Row, Sheet } from './ui';

/** What the sheet is for: confirming when a period started or ended, or fixing one already logged. */
export type PeriodEdit =
  | { kind: 'start' }
  | { kind: 'end'; period: Period }
  | { kind: 'edit'; period: Period }
  | { kind: 'add' };

const TITLES: Record<PeriodEdit['kind'], string> = {
  start: 'When did your period start?',
  end: 'When was the last day?',
  edit: 'Change this period',
  add: 'Add a past period',
};

export function PeriodSheet({ edit, today, onClose }: { edit: PeriodEdit | null; today: DateKey; onClose: () => void }) {
  return (
    <Sheet visible={!!edit} title={edit ? TITLES[edit.kind] : ''} onClose={onClose}>
      {edit ? <PeriodForm edit={edit} today={today} onDone={onClose} /> : null}
    </Sheet>
  );
}

function initialRange(edit: PeriodEdit, today: DateKey, usualLength: number): Period {
  switch (edit.kind) {
    case 'start':
      return { start: today, end: today };
    case 'end':
      return { start: edit.period.start, end: today };
    case 'edit':
      return edit.period;
    case 'add': {
      const start = addDays(today, -28);
      return { start, end: addDays(start, usualLength - 1) };
    }
  }
}

function PeriodForm({ edit, today, onDone }: { edit: PeriodEdit; today: DateKey; onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const periods = state.cycle.periods;
  const [range, setRange] = useState(() => initialRange(edit, today, state.cycle.settings.periodLength));
  // Which end of the period a tap on the calendar sets.
  const [picking, setPicking] = useState<'start' | 'end'>(edit.kind === 'end' ? 'end' : 'start');
  const both = edit.kind === 'edit' || edit.kind === 'add';
  const original = edit.kind === 'end' || edit.kind === 'edit' ? edit.period : undefined;

  // A new period runs on until today; the others cover just the days chosen.
  const draft: Period = edit.kind === 'start' ? { start: range.start, end: today } : range;
  const clash = overlapsAnother(periods, draft, original);

  const others = normalize(periods).filter((p) => p.start !== original?.start);
  const map: Record<DateKey, DayKind> = {};
  for (const p of others) for (let k = p.start; k <= p.end; k = addDays(k, 1)) map[k] = 'predicted';
  for (let k = draft.start; k <= draft.end; k = addDays(k, 1)) map[k] = 'period';

  const pick = (key: DateKey) => {
    if (edit.kind === 'start') return setRange({ start: key, end: key });
    if (edit.kind === 'end') return setRange((r) => ({ ...r, end: key < r.start ? r.start : key }));
    if (picking === 'start') {
      setRange((r) => ({ start: key, end: key > r.end ? key : r.end }));
      setPicking('end');
    } else {
      setRange((r) => (key < r.start ? { start: key, end: r.end } : { ...r, end: key }));
    }
  };

  const save = () => {
    update((s) => {
      const current = s.cycle.periods;
      const next =
        edit.kind === 'start'
          ? startPeriod(current, range.start, today)
          : edit.kind === 'end'
            ? endPeriod(current, range.end)
            : editPeriod(current, original ?? null, range);
      return { ...s, cycle: { ...s.cycle, periods: next } };
    });
    onDone();
  };

  const remove = () => {
    const doRemove = () => {
      update((s) => ({ ...s, cycle: { ...s.cycle, periods: editPeriod(s.cycle.periods, original ?? null, null) } }));
      onDone();
    };
    if (Platform.OS === 'web') return doRemove();
    Alert.alert('Delete this period?', 'Your predictions will be worked out again without it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };

  const days = diffDays(draft.start, draft.end) + 1;
  const quick =
    edit.kind === 'start' || edit.kind === 'end'
      ? [
          { label: 'Today', key: today },
          { label: 'Yesterday', key: addDays(today, -1) },
        ]
      : [];
  const chosen = edit.kind === 'end' ? range.end : range.start;

  return (
    <View style={{ gap: space(3) }}>
      {both ? (
        <Row style={{ gap: space(2) }}>
          <Chip label={`First day · ${shortDate(range.start)}`} selected={picking === 'start'} onPress={() => setPicking('start')} />
          <Chip label={`Last day · ${shortDate(range.end)}`} selected={picking === 'end'} onPress={() => setPicking('end')} />
        </Row>
      ) : (
        <Row style={{ gap: space(2) }}>
          {quick.map((q) => (
            <Chip
              key={q.label}
              label={q.label}
              selected={chosen === q.key}
              onPress={() => pick(q.key)}
            />
          ))}
        </Row>
      )}
      <MonthCalendar
        map={map}
        today={today}
        selected={both ? (picking === 'start' ? range.start : range.end) : chosen}
        onSelect={pick}
        maxDate={today}
        legend={false}
      />
      <Text style={styles.summary}>
        {edit.kind === 'start'
          ? draft.start === today
            ? 'Starting today'
            : `${dateRange(draft.start, today)} so far · ${days} day${days === 1 ? '' : 's'}`
          : `${dateRange(draft.start, draft.end)} · ${days} day${days === 1 ? '' : 's'}`}
      </Text>
      {clash ? (
        <Body style={{ fontSize: 13, color: colors.flameDeep }}>
          That runs into another period you've logged. Pick other days, or change that one instead.
        </Body>
      ) : edit.kind === 'start' ? (
        <Body muted style={{ fontSize: 13 }}>Once it's over, tap Period ended to confirm the last day.</Body>
      ) : null}
      <Button label="Save" onPress={save} disabled={clash} />
      {edit.kind === 'edit' ? <Button label="Delete this period" variant="ghost" onPress={remove} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  summary: { ...fonts.bodyBold, fontSize: 16, color: colors.ink, textAlign: 'center' },
}));
