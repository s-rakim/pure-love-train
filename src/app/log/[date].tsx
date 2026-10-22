import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Chip, Eyebrow, Field, Heading, Screen } from '../../components/ui';
import { addPeriodDay, isPeriodDay, removePeriodDay } from '../../lib/cycle';
import { fromKey, isValidKey, todayKey } from '../../lib/dates';
import { useStore, type DayLog, type Flow } from '../../lib/store';
import { useColors } from '../../theme/theme';
import { space } from '../../theme';

const FLOWS: { value: Flow; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Tender breasts', 'Acne',
  'Back pain', 'Cravings', 'Fatigue', 'Insomnia', 'Nausea',
];

const MOODS = ['Happy', 'Calm', 'Energetic', 'Sensitive', 'Irritable', 'Anxious', 'Sad'];

export default function LogDay() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { state, update } = useStore();
  const colors = useColors();
  const valid = typeof date === 'string' && isValidKey(date);
  const key = valid ? date : todayKey();

  const [isPeriod, setIsPeriod] = useState(isPeriodDay(state.cycle.periods, key));
  const [log, setLog] = useState<DayLog>(state.cycle.logs[key] ?? { symptoms: [] });

  if (!valid) {
    return (
      <Screen edges={[]}>
        <Body>That date doesn't look right.</Body>
      </Screen>
    );
  }

  const future = key > todayKey();
  const label = fromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const toggleSymptom = (s: string) =>
    setLog((l) => ({
      ...l,
      symptoms: l.symptoms.includes(s) ? l.symptoms.filter((x) => x !== s) : [...l.symptoms, s],
    }));

  const save = () => {
    update((s) => {
      const periods = isPeriod ? addPeriodDay(s.cycle.periods, key) : removePeriodDay(s.cycle.periods, key);
      const entry: DayLog = { ...log, flow: isPeriod ? log.flow : undefined, note: log.note?.trim() || undefined };
      const empty = !entry.flow && entry.symptoms.length === 0 && !entry.mood && !entry.note;
      const logs = { ...s.cycle.logs };
      if (empty) delete logs[key];
      else logs[key] = entry;
      return { ...s, cycle: { ...s.cycle, periods, logs } };
    });
    router.back();
  };

  return (
    <Screen edges={[]} style={{ gap: space(5) }}>
      <Heading>{label}</Heading>
      {future ? (
        <Body muted>This day hasn't happened yet. Come back on the day to log it.</Body>
      ) : (
        <>
          <View style={{ gap: space(2) }}>
            <Eyebrow>Period</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              <Chip label="Period day" selected={isPeriod} onPress={() => setIsPeriod(true)} />
              <Chip label="No period" selected={!isPeriod} onPress={() => setIsPeriod(false)} />
            </View>
            {isPeriod ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                {FLOWS.map((f) => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    selected={log.flow === f.value}
                    color={colors.flameDeep}
                    onPress={() => setLog((l) => ({ ...l, flow: l.flow === f.value ? undefined : f.value }))}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ gap: space(2) }}>
            <Eyebrow color={colors.plum}>Symptoms</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {SYMPTOMS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={log.symptoms.includes(s)}
                  color={colors.plum}
                  onPress={() => toggleSymptom(s)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: space(2) }}>
            <Eyebrow color={colors.sageDeep}>Mood</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {MOODS.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={log.mood === m}
                  color={colors.sageDeep}
                  onPress={() => setLog((l) => ({ ...l, mood: l.mood === m ? undefined : m }))}
                />
              ))}
            </View>
          </View>

          <Field
            label="Note"
            value={log.note ?? ''}
            onChangeText={(note) => setLog((l) => ({ ...l, note }))}
            placeholder="Anything worth remembering…"
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <Button label="Save" onPress={save} />
        </>
      )}
    </Screen>
  );
}
