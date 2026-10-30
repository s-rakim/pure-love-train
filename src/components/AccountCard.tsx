import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Text } from 'react-native';

import { linkGoogle, unlinkGoogle } from '../lib/account';
import { relativeTime } from '../lib/dates';
import { useStore } from '../lib/store';
import { syncOnce } from '../lib/sync';
import { fonts, makeStyles, useTheme } from '../theme';
import { Body, Button, Card, Eyebrow } from './ui';

/** Google sign-in, so everything can follow you to a new phone. */
export function AccountCard() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sync, account } = state;

  const signIn = async () => {
    if (!sync) return;
    setBusy(true);
    setError(null);
    try {
      const email = await linkGoogle(sync);
      if (!email) return;
      let latest: typeof state = { ...state, account: { email } };
      update((s) => ({ ...s, account: { email } }));
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

  const signOut = () => {
    const doIt = async () => {
      setBusy(true);
      setError(null);
      try {
        if (sync) await unlinkGoogle(sync);
        update((s) => ({ ...s, account: undefined }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') return void doIt();
    Alert.alert('Sign out of Google?', 'Your backup is deleted from the server. Everything stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void doIt() },
    ]);
  };

  return (
    <Card>
      <Eyebrow>Your account</Eyebrow>
      {!sync ? (
        <Body style={{ fontSize: 14 }}>
          Connect to your server above first. Then you can sign in with Google and take everything with you to a new
          phone.
        </Body>
      ) : account ? (
        <>
          <Body style={{ fontSize: 14, color: colors.ink }}>Signed in as {account.email}.</Body>
          <Body muted style={{ fontSize: 13 }}>
            {account.backedUpAt
              ? `Backed up ${relativeTime(account.backedUpAt)}. On a new phone, choose “Restore with Google” when you start.`
              : 'Your backup is on its way to the server.'}
          </Body>
          <Button label={busy ? 'Signing out…' : 'Sign out'} variant="ghost" onPress={signOut} disabled={busy} />
        </>
      ) : (
        <>
          <Body style={{ fontSize: 14 }}>
            Sign in with Google to keep a private backup on your Pure Love server, including your cycle logs. On a new
            phone, sign in again and everything comes back.
          </Body>
          <Button
            label={busy ? 'Signing in…' : 'Sign in with Google'}
            variant="secondary"
            onPress={signIn}
            disabled={busy}
            icon={<Ionicons name="logo-google" size={18} color={colors.flameDeep} />}
          />
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.flameDeep },
}));
