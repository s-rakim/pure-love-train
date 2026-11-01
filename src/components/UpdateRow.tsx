import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Button } from './ui';

/**
 * New app code arrives over the air: it downloads quietly when the app opens and is used
 * the next time it starts. This lets you fetch it now and restart straight into it.
 */
export function UpdateRow() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'current' | 'failed'>('idle');
  if (Platform.OS === 'web' || !Updates.isEnabled) return null;

  const check = async () => {
    setStatus('checking');
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (!isAvailable) return setStatus('current');
      await Updates.fetchUpdateAsync();
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  };

  const label = {
    idle: 'Check for updates',
    checking: 'Checking…',
    current: "You're up to date",
    failed: "Couldn't check, try again",
    ready: 'Update ready, restart now',
  }[status];
  return (
    <Button
      label={label}
      variant="ghost"
      disabled={status === 'checking'}
      onPress={status === 'ready' ? () => Updates.reloadAsync() : check}
    />
  );
}
