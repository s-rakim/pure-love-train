import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { AccountCard } from '../components/AccountCard';
import { PairingCard } from '../components/PairingCard';
import { Body, Button, Card, Chip, Eyebrow, Field, Row, Screen } from '../components/ui';
import { isValidKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { type AppearancePref, fonts, makeStyles, radius, space, useTheme } from '../theme';

const APPEARANCES: { value: AppearancePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Settings() {
  const { colors } = useTheme();
  const { state, update, reset } = useStore();
  const [me, setMe] = useState(state.names.me);
  const [partner, setPartner] = useState(state.names.partner);
  const [since, setSince] = useState(state.togetherSince ?? '');
  const sinceValid = since === '' || isValidKey(since);

  const saveProfile = () => {
    if (!me.trim() || !partner.trim() || !sinceValid) return;
    update((s) => ({
      ...s,
      names: { me: me.trim(), partner: partner.trim() },
      togetherSince: since || undefined,
    }));
  };

  const setLength = (field: 'cycleLength' | 'periodLength', delta: number) => {
    const [min, max] = field === 'cycleLength' ? [18, 50] : [1, 12];
    update((s) => {
      const next = Math.min(max, Math.max(min, s.cycle.settings[field] + delta));
      return { ...s, cycle: { ...s.cycle, settings: { ...s.cycle.settings, [field]: next } } };
    });
  };

  const confirmReset = () => {
    const doReset = () => {
      reset();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') return doReset();
    Alert.alert('Erase everything?', 'This removes all moments, answers and cycle logs from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen edges={[]} style={{ paddingTop: space(2) }}>
      <Card>
        <Eyebrow>You two</Eyebrow>
        <Field label="Your name" value={me} onChangeText={setMe} autoCapitalize="words" />
        <Field label="Partner's name" value={partner} onChangeText={setPartner} autoCapitalize="words" />
        <Field
          label="Together since"
          value={since}
          onChangeText={setSince}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
        {!sinceValid ? <Body style={{ color: colors.flameDeep, fontSize: 13 }}>Use YYYY-MM-DD.</Body> : null}
        <Button label="Save" onPress={saveProfile} disabled={!me.trim() || !partner.trim() || !sinceValid} />
      </Card>

      <PairingCard />

      <AccountCard />

      <Card>
        <Eyebrow>Appearance</Eyebrow>
        <Row>
          {APPEARANCES.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              selected={(state.appearance ?? 'system') === a.value}
              onPress={() => update((s) => ({ ...s, appearance: a.value }))}
            />
          ))}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          System follows your phone's light or dark setting.
        </Body>
      </Card>

      <Card>
        <Eyebrow>Cycle</Eyebrow>
        <Row>
          <Chip
            label="Track my cycle"
            selected={state.cycle.tracking}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, tracking: true } }))}
          />
          <Chip
            label="Off"
            selected={!state.cycle.tracking}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, tracking: false } }))}
          />
        </Row>
        <Stepper
          label="Typical cycle length"
          value={state.cycle.settings.cycleLength}
          onChange={(d) => setLength('cycleLength', d)}
        />
        <Stepper
          label="Typical period length"
          value={state.cycle.settings.periodLength}
          onChange={(d) => setLength('periodLength', d)}
        />
        <Body muted style={{ fontSize: 13 }}>
          Used until you've logged two periods. After that, predictions follow your own history.
        </Body>
      </Card>

      <Button label="Erase all data" variant="ghost" onPress={confirmReset} />
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body style={{ color: colors.ink }}>{label}</Body>
      <Row style={{ gap: space(2) }}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(-1)} style={styles.step}>
          <Ionicons name="remove" size={18} color={colors.flameDeep} />
        </Pressable>
        <Text style={styles.stepValue}>{value} days</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => onChange(1)} style={styles.step}>
          <Ionicons name="add" size={18} color={colors.flameDeep} />
        </Pressable>
      </Row>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, minWidth: 64, textAlign: 'center' },
}));
