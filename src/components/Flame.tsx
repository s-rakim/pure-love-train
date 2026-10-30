import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { makeStyles, useTheme } from '../theme';

/** A little flame with a face. It glows while the streak is alive and dims when it isn't. */
export function Flame({ size = 96, lit = true }: { size?: number; lit?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const outer = lit ? colors.flame : colors.ash;
  const inner = lit ? colors.ember : colors.ashSoft;
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

const useStyles = makeStyles((colors) => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: colors.flame, opacity: 0.14 },
}));
