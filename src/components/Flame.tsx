import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useColors } from '../theme/theme';

/** A little flame with a face. It glows while the streak is alive and dims when it isn't. */
export function Flame({ size = 96, lit = true }: { size?: number; lit?: boolean }) {
  const colors = useColors();
  const outer = lit ? colors.flame : colors.muted;
  const inner = lit ? colors.ember : colors.muted;
  const eye = size * 0.07;
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {lit ? (
        <View
          style={{
            position: 'absolute',
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size,
            backgroundColor: colors.flame,
            opacity: 0.14,
          }}
        />
      ) : null}
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
});
