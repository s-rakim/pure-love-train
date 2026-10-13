import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Eyebrow, Field, Row, Screen } from '../components/ui';
import { isValidKey } from '../lib/dates';
import { withDemoPartner } from '../lib/demo';
import { useStore } from '../lib/store';
import { colors, fonts, radius, space } from '../theme';

export default function Settings() {
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

      <Card>
        <Eyebrow>Pairing</Eyebrow>
        <View style={styles.code}>
          <Text style={styles.codeText}>{state.pairCode}</Text>
        </View>
        <Body>
          This is your invite code. Syncing between two phones is coming soon; for now everything stays on this
          phone. You can preview the shared features with a demo partner.
        </Body>
        <Button
          label="Preview with a demo partner"
          variant="secondary"
          onPress={() => update(withDemoPartner)}
        />
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

const styles = StyleSheet.create({
  code: {
    alignSelf: 'center',
    backgroundColor: colors.flameSoft,
    borderRadius: radius.md,
    paddingHorizontal: space(6),
    paddingVertical: space(3),
  },
  codeText: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 6, color: colors.flameDeep },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, minWidth: 64, textAlign: 'center' },
});
