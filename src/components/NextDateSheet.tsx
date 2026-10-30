import { useState } from 'react';
import { Text, View } from 'react-native';

import { diffDays, shortDate, untilText, type DateKey } from '../lib/dates';
import { useNames, useToday } from '../lib/hooks';
import { useStore } from '../lib/store';
import { makeStyles, space } from '../theme';
import { MonthCalendar } from './MonthCalendar';
import { Body, Button, Field, Sheet } from './ui';

/** Sets the next date you two have planned; it counts down on both phones. */
export function NextDateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} title="Your next date" onClose={onClose}>
      {visible ? <NextDateForm onDone={onClose} /> : null}
    </Sheet>
  );
}

function NextDateForm({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const today = useToday();
  const current = state.nextDate && state.nextDate.date >= today ? state.nextDate : undefined;
  const [label, setLabel] = useState(current?.label ?? '');
  const [date, setDate] = useState<DateKey | undefined>(current?.date);

  const save = () => {
    if (!date) return;
    update((s) => ({ ...s, nextDate: { date, label: label.trim() } }));
    onDone();
  };

  const clear = () => {
    update((s) => ({ ...s, nextDate: undefined }));
    onDone();
  };

  return (
    <View style={{ gap: space(3) }}>
      <Field value={label} onChangeText={setLabel} placeholder="What's the plan? Dinner, a trip…" maxLength={60} />
      <MonthCalendar map={{}} today={today} selected={date} onSelect={setDate} minDate={today} legend={false} />
      <Text style={styles.summary}>
        {date ? `${shortDate(date)}, ${untilText(diffDays(today, date))}` : 'Pick the day'}
      </Text>
      <Body muted style={{ fontSize: 13, textAlign: 'center' }}>{names.partner} sees the countdown too.</Body>
      <Button label="Save" onPress={save} disabled={!date} />
      {state.nextDate ? <Button label="Clear it" variant="ghost" onPress={clear} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  summary: { ...fonts.bodyBold, fontSize: 16, color: colors.ink, textAlign: 'center' },
}));
