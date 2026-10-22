import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Flame } from '../components/Flame';
import { Body, Button, Chip, Field, Screen, Title } from '../components/ui';
import { isValidKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { useColors, type Colors } from '../theme/theme';
import { fonts, space } from '../theme';

export default function Onboarding() {
  const { state, update } = useStore();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [me, setMe] = useState(state.names.me);
  const [partner, setPartner] = useState(state.names.partner);
  const [since, setSince] = useState(state.togetherSince ?? '');
  const [tracking, setTracking] = useState(state.cycle.tracking);

  const sinceValid = since === '' || isValidKey(since);
  const canContinue = me.trim() && partner.trim() && sinceValid;

  const finish = () => {
    update((s) => ({
      ...s,
      onboarded: true,
      names: { me: me.trim(), partner: partner.trim() },
      togetherSince: since || undefined,
      cycle: { ...s.cycle, tracking },
    }));
    router.replace('/');
  };

  return (
    <Screen style={{ paddingTop: space(10), gap: space(6) }}>
      <View style={{ gap: space(2), alignItems: 'center' }}>
        <Flame size={84} />
        <Title style={{ textAlign: 'center' }}>A little space{'\n'}just for two.</Title>
        <Body style={{ textAlign: 'center' }}>
          Daily questions, shared moments, and your cycle, all in one cosy place.
        </Body>
      </View>

      <Field label="Your name" value={me} onChangeText={setMe} placeholder="Alex" autoCapitalize="words" />
      <Field
        label="Your partner's name"
        value={partner}
        onChangeText={setPartner}
        placeholder="Sam"
        autoCapitalize="words"
      />
      <View style={{ gap: space(1.5) }}>
        <Field
          label="Together since (optional)"
          value={since}
          onChangeText={setSince}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        {!sinceValid ? <Text style={styles.error}>Use the format YYYY-MM-DD, like 2024-02-14.</Text> : null}
      </View>

      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>Do you want to track a cycle in the app?</Text>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <Chip label="Yes, track my cycle" selected={tracking} onPress={() => setTracking(true)} />
          <Chip label="Not now" selected={!tracking} onPress={() => setTracking(false)} />
        </View>
        <Body muted style={{ fontSize: 13 }}>
          You can change this any time, and choose whether your partner sees it.
        </Body>
      </View>

      <Button label="Let's begin" onPress={finish} disabled={!canContinue} />
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
    error: { fontFamily: fonts.body, fontSize: 13, color: colors.flameDeep },
  });
