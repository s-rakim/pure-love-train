import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Flame } from '../components/Flame';
import { Body, Button, Card, Chip, Field, Screen, Title, Wordmark } from '../components/ui';
import { restoreWithCode, restoreWithEmail, restoreWithGoogle } from '../lib/account';
import { resetPassword } from '../lib/firebase';
import { isValidKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { normalizeServerUrl } from '../lib/sync';
import { isPrivateHttp } from '../lib/syncCore';
import { makeStyles, space, useTheme } from '../theme';

export default function Onboarding() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const [me, setMe] = useState(state.names.me);
  const [partner, setPartner] = useState(state.names.partner);
  const [since, setSince] = useState(state.togetherSince ?? '');
  const [tracking, setTracking] = useState(state.cycle.tracking);

  const sinceValid = since === '' || isValidKey(since);
  const canContinue = me.trim() && partner.trim() && sinceValid;

  const [restoring, setRestoring] = useState(false);
  const [method, setMethod] = useState<'google' | 'email' | 'code'>('google');
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const restore = async (checked = false) => {
    const url = normalizeServerUrl(serverUrl);
    // Restoring sends your sign-in and brings back your backup, so plain http only inside the tailnet.
    if (!checked && url && !isPrivateHttp(url) && Platform.OS !== 'web') {
      return Alert.alert(
        "This address isn't private",
        "It isn't a Tailscale address, so your sign-in and backup would travel unencrypted. Use the server's Tailscale address, or an https:// one.",
        [
          { text: 'Change it', style: 'cancel' },
          { text: 'Use it anyway', style: 'destructive', onPress: () => restore(true) },
        ],
      );
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const restored =
        method === 'google'
          ? await restoreWithGoogle(url)
          : method === 'email'
            ? await restoreWithEmail(url, email, password)
            : await restoreWithCode(url, code);
      if (!restored) return;
      update(() => restored);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email);
      setNotice(`We've emailed ${email.trim()} a link to choose a new password.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const ready =
    !!serverUrl.trim() &&
    (method === 'google' ||
      (method === 'email' && email.includes('@') && password.length > 0) ||
      (method === 'code' && code.replace(/[^a-z0-9]/gi, '').length === 8));

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
        <Wordmark />
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

      <Card style={{ gap: space(3) }}>
        <Text style={styles.label}>Moving from another phone?</Text>
        {restoring ? (
          <>
            <Field
              label="Your sync server"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://100.101.102.103:8787"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              <Chip label="Google" selected={method === 'google'} onPress={() => setMethod('google')} />
              <Chip label="Email" selected={method === 'email'} onPress={() => setMethod('email')} />
              <Chip label="Code from your partner" selected={method === 'code'} onPress={() => setMethod('code')} />
            </View>
            {method === 'email' ? (
              <>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                />
              </>
            ) : null}
            {method === 'code' ? (
              <>
                <Field
                  label="Restore code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="ABCD EFGH"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                />
                <Body muted style={{ fontSize: 13 }}>
                  Your partner makes this in Settings → Your account → Help them back in.
                </Body>
              </>
            ) : null}
            <Button
              label={
                busy
                  ? 'Restoring…'
                  : method === 'google'
                    ? 'Restore with Google'
                    : method === 'email'
                      ? 'Restore with email'
                      : 'Restore with a code from your partner'
              }
              variant="secondary"
              onPress={() => restore()}
              disabled={busy || !ready}
              icon={
                method === 'google' ? (
                  <Ionicons name="logo-google" size={18} color={colors.flameDeep} />
                ) : method === 'email' ? (
                  <Ionicons name="mail-outline" size={18} color={colors.flameDeep} />
                ) : (
                  <Ionicons name="key-outline" size={18} color={colors.flameDeep} />
                )
              }
            />
            {method === 'email' ? (
              <Button label="Forgot your password?" variant="ghost" onPress={forgot} disabled={busy || !email.includes('@')} />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Body muted style={{ fontSize: 13 }}>{notice}</Body> : null}
          </>
        ) : (
          <>
            <Body muted style={{ fontSize: 13 }}>
              If you signed in on your old phone, or your partner gives you a restore code, you can bring everything
              across.
            </Body>
            <Button label="Restore my things" variant="ghost" onPress={() => setRestoring(true)} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  label: { ...fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  error: { ...fonts.body, fontSize: 13, color: colors.flameDeep },
}));
