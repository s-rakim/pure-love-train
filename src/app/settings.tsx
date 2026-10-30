import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { AccountCard } from '../components/AccountCard';
import { PairingCard } from '../components/PairingCard';
import { Body, Button, Card, Chip, Eyebrow, Field, Row, Screen, Wordmark } from '../components/ui';
import { isValidKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { leaveSpace } from '../lib/sync';
import { type AppearancePref, type FontPref, makeStyles, radius, space, useTheme } from '../theme';

const APPEARANCES: { value: AppearancePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const FONTS: { value: FontPref; label: string }[] = [
  { value: 'phone', label: "My phone's font" },
  { value: 'classic', label: 'DM Sans' },
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
    const sync = state.sync;
    const eraseHere = () => {
      reset();
      router.replace('/onboarding');
    };
    // Also take everything you shared off the server: records, photos, videos and the backup.
    const doReset = async () => {
      if (!sync) return eraseHere();
      try {
        await leaveSpace(sync);
        eraseHere();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        if (Platform.OS === 'web') return eraseHere();
        Alert.alert("Couldn't delete your data from the server", `${reason}\n\nErase this phone anyway? What you shared stays on the server.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Erase this phone', style: 'destructive', onPress: eraseHere },
        ]);
      }
    };
    if (Platform.OS === 'web') return doReset();
    const message = sync
      ? `This removes all moments, answers and cycle logs from this phone, and deletes everything you shared from your sync server. ${state.names.partner || 'Your partner'} will no longer see your moments, notes or answers.`
      : 'This removes all moments, answers and cycle logs from this phone.';
    Alert.alert('Erase everything?', message, [
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
        <Eyebrow>Font</Eyebrow>
        <Row>
          {FONTS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={(state.font ?? 'phone') === f.value}
              onPress={() => update((s) => ({ ...s, font: f.value }))}
            />
          ))}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          Your phone's font is whatever you've picked in your phone's settings, the same as on your home screen.
        </Body>
        {Platform.OS === 'android' ? (
          <>
            <Eyebrow>Widget</Eyebrow>
            <Row>
              <Chip
                label="Show the photo"
                selected={!state.widgetPrivate}
                onPress={() => update((s) => ({ ...s, widgetPrivate: false }))}
              />
              <Chip
                label="Keep it private"
                selected={!!state.widgetPrivate}
                onPress={() => update((s) => ({ ...s, widgetPrivate: true }))}
              />
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              Private hides the photo and caption on your home screen and just says a moment arrived.
            </Body>
          </>
        ) : null}
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

      <View style={{ alignItems: 'center', gap: space(1) }}>
        <Wordmark size={22} />
        <Body muted style={{ fontSize: 12 }}>Version {Constants.expoConfig?.version}</Body>
      </View>
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

const useStyles = makeStyles((colors, fonts) => ({
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, minWidth: 64, textAlign: 'center' },
}));
