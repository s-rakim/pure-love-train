import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Text } from 'react-native';

import { linkEmail, linkGoogle, partnerRestoreCode, unlinkAccount } from '../lib/account';
import { relativeTime } from '../lib/dates';
import { type Account, useStore } from '../lib/store';
import { syncOnce } from '../lib/sync';
import { makeStyles, useTheme } from '../theme';
import { Body, Button, Card, Eyebrow, Field } from './ui';

/** Google or email sign-in, so everything can follow you to a new phone, plus helping your partner back in. */
export function AccountCard() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withEmail, setWithEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const { sync, account } = state;
  const partnerName = state.names.partner || 'your partner';

  const signIn = async (how: () => Promise<Account | null>) => {
    if (!sync) return;
    setBusy(true);
    setError(null);
    try {
      const linked = await how();
      if (!linked) return;
      let latest: typeof state = { ...state, account: linked };
      update((s) => ({ ...s, account: linked }));
      setPassword('');
      setWithEmail(false);
      // Take the first backup straight away rather than waiting for the next sync.
      await syncOnce(
        () => latest,
        (fn) => {
          latest = fn(latest);
          update(fn);
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const google = () =>
    signIn(async () => {
      const linkedEmail = await linkGoogle(sync!);
      return linkedEmail ? { email: linkedEmail, provider: 'google' } : null;
    });

  const emailSignIn = () =>
    signIn(async () => ({ email: await linkEmail(sync!, email, password), provider: 'email' }));

  const signOut = () => {
    const doIt = async () => {
      setBusy(true);
      setError(null);
      try {
        if (sync) await unlinkAccount(sync);
        update((s) => ({ ...s, account: undefined }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') return void doIt();
    Alert.alert('Sign out?', `You won't be able to restore with this account. ${partnerName} can still help you back in.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void doIt() },
    ]);
  };

  const makeCode = async () => {
    if (!sync) return;
    setBusy(true);
    setError(null);
    try {
      setCode(await partnerRestoreCode(sync));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const how = account?.provider === 'email' ? 'Restore with email' : 'Restore with Google';

  return (
    <Card>
      <Eyebrow>Your account</Eyebrow>
      {!sync ? (
        <Body style={{ fontSize: 14 }}>
          Connect to your server above first. Then you can sign in with Google or email and take everything with you
          to a new phone.
        </Body>
      ) : account ? (
        <>
          <Body style={{ fontSize: 14, color: colors.ink }}>Signed in as {account.email}.</Body>
          <Body muted style={{ fontSize: 13 }}>
            {sync.backedUpAt
              ? `Backed up ${relativeTime(sync.backedUpAt)}. On a new phone, choose “${how}” when you start.`
              : 'Your backup is on its way to the server.'}
          </Body>
          <Button label={busy ? 'Working…' : 'Sign out'} variant="ghost" onPress={signOut} disabled={busy} />
        </>
      ) : (
        <>
          <Body style={{ fontSize: 14 }}>
            Sign in to keep a private backup on your sync server, including your cycle logs. On a new phone, sign in
            again and everything comes back.
          </Body>
          {withEmail ? (
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
                placeholder="At least 6 characters"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
              <Body muted style={{ fontSize: 13 }}>
                New here? This makes your account. Already have one? Use the same password.
              </Body>
              <Button
                label={busy ? 'Signing in…' : 'Sign in with email'}
                variant="secondary"
                onPress={emailSignIn}
                disabled={busy || !email.includes('@') || password.length < 6}
                icon={<Ionicons name="mail-outline" size={18} color={colors.flameDeep} />}
              />
              <Button label="Use Google instead" variant="ghost" onPress={() => setWithEmail(false)} disabled={busy} />
            </>
          ) : (
            <>
              <Button
                label={busy ? 'Signing in…' : 'Sign in with Google'}
                variant="secondary"
                onPress={google}
                disabled={busy}
                icon={<Ionicons name="logo-google" size={18} color={colors.flameDeep} />}
              />
              <Button label="Use email instead" variant="ghost" onPress={() => setWithEmail(true)} disabled={busy} />
            </>
          )}
        </>
      )}

      {sync?.partnerId ? (
        <>
          <Eyebrow>Help {partnerName} back in</Eyebrow>
          {code ? (
            <>
              <Text selectable style={styles.code}>
                {code.code.slice(0, 4)} {code.code.slice(4)}
              </Text>
              <Body muted style={{ fontSize: 13 }}>
                On {partnerName}'s new phone, choose “Restore with a code from your partner” and type this in. It works
                once, until {new Date(code.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                Only give it to {partnerName} yourself: whoever types it in signs in as them.
              </Body>
            </>
          ) : (
            <Body muted style={{ fontSize: 13 }}>
              Lost their phone? Make a one-time code that brings back everything of theirs on a new one, if they never
              set up Google or email sign-in. Their old phone gets signed out.
            </Body>
          )}
          <Button
            label={code ? 'Make a new code' : 'Make a restore code'}
            variant="ghost"
            onPress={makeCode}
            disabled={busy}
          />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  error: { ...fonts.body, fontSize: 13, lineHeight: 18, color: colors.flameDeep },
  code: { ...fonts.bodyBold, fontSize: 28, letterSpacing: 4, color: colors.ink, textAlign: 'center' },
}));
