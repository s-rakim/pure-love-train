import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/** A little flame with a face. It glows while the streak is alive and dims when it isn't. */
export function Flame({ size = 96, lit = true }: { size?: number; lit?: boolean }) {
  const outer = lit ? colors.flame : '#4A3F3A';
  const inner = lit ? colors.ember : '#6B5E57';
  const eye = size * 0.07;
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {lit ? <View style={[styles.glow, { width: size * 1.4, height: size * 1.4, borderRadius: size }]} /> : null}
      <Ionicons name="flame" size={size} color={outer} />
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: size * 0.32 }]}>
        <Ionicons name="flame" size={size * 0.55} color={inner} />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: size * 0.42 }]}>
        <View style={{ flexDirection: 'row', gap: size * 0.11 }}>
          <View style={{ width: eye, height: eye * (lit ? 1.4 : 0.4), borderRadius: eye, backgroundColor: colors.black }} />
          <View style={{ width: eye, height: eye * (lit ? 1.4 : 0.4), borderRadius: eye, backgroundColor: colors.black }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: colors.flame, opacity: 0.14 },
});
