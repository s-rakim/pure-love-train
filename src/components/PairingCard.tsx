import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { withDemoPartner } from '../lib/demo';
import { relativeTime } from '../lib/dates';
import { useNames } from '../lib/hooks';
import { useStore } from '../lib/store';
import { createSpace, joinSpace, normalizeServerUrl, syncOnce } from '../lib/sync';
import { colors, fonts, radius, space } from '../theme';
import { Body, Button, Card, Eyebrow, Field, Row } from './ui';

/** Connects this phone to the couple's sync server and shows how pairing is going. */
export function PairingCard() {
  const { state, update } = useStore();
  const names = useNames();
  const [serverUrl, setServerUrl] = useState(state.sync?.serverUrl ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | 'sync' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sync = state.sync;

  const attempt = async (kind: 'create' | 'join', fn: (url: string) => Promise<void>) => {
    const url = normalizeServerUrl(serverUrl);
    if (!url) return setError('Enter your server address first.');
    setBusy(kind);
    setError(null);
    try {
      await fn(url);
      setServerUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const syncNow = async () => {
    setBusy('sync');
    let latest = state;
    await syncOnce(
      () => latest,
      (fn) => {
        latest = fn(latest);
        update(fn);
      },
    );
    setBusy(null);
  };

  const disconnect = () => {
    const doIt = () => update((s) => ({ ...s, sync: undefined, partnerCycle: undefined }));
    if (Platform.OS === 'web') return doIt();
    Alert.alert(
      'Disconnect from the server?',
      'Everything stays on this phone, but nothing will sync until you pair again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: doIt },
      ],
    );
  };

  if (!sync) {
    return (
      <Card>
        <Eyebrow>Sync with {names.partner}</Eyebrow>
        <Body>
          Enter the address of your Pure Love server, like the Tailscale address of the computer running it. One of
          you creates a space, the other joins with the code.
        </Body>
        <Field
          label="Server address"
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://100.101.102.103:8787"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Button
          label={busy === 'create' ? 'Creating…' : 'Create our space'}
          disabled={!!busy}
          onPress={() => attempt('create', (url) => createSpace(url, names.me, update))}
        />
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="Partner's code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
          </View>
          <Button
            label={busy === 'join' ? 'Joining…' : 'Join'}
            variant="secondary"
            disabled={!!busy || code.trim().length !== 6}
            onPress={() => attempt('join', (url) => joinSpace(url, code.trim(), names.me, update))}
          />
        </Row>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Body muted style={{ fontSize: 13 }}>
          Not set up yet? You can preview the shared features with a demo partner.
        </Body>
        <Button label="Preview with a demo partner" variant="ghost" onPress={() => update(withDemoPartner)} />
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Sync</Eyebrow>
      {sync.pairCode ? (
        <>
          <Body>Ask {names.partner} to open Settings, enter the same server address and join with this code:</Body>
          <View style={styles.code}>
            <Text style={styles.codeText}>{sync.pairCode}</Text>
          </View>
        </>
      ) : (
        <Body style={{ color: colors.ink }}>You're paired with {names.partner}. Everything syncs automatically.</Body>
      )}
      <Body muted style={{ fontSize: 13 }}>
        {sync.serverUrl}
        {sync.lastSyncAt ? ` · synced ${relativeTime(sync.lastSyncAt)}` : ''}
      </Body>
      {sync.error ? <Text style={styles.error}>{sync.error}</Text> : null}
      <Row>
        <Button
          label="Sync now"
          variant="secondary"
          disabled={!!busy}
          onPress={syncNow}
          style={{ flex: 1 }}
          icon={busy === 'sync' ? <ActivityIndicator color={colors.flameDeep} /> : undefined}
        />
        <Button label="Disconnect" variant="ghost" onPress={disconnect} style={{ flex: 1 }} />
      </Row>
    </Card>
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
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.flameDeep },
});
