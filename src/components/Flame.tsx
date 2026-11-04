import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

// Phones run the animation off the JS thread; the browser preview can't.
const native = Platform.OS !== 'web';

/** Mixes two #RRGGBB colours; `t` is how much of `b` to take. */
function mix(a: string, b: string, t: number) {
  const n = (hex: string) => parseInt(hex.slice(1, 7), 16);
  const [x, y] = [n(a), n(b)];
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * (1 - t) + ((y >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** Runs `make` as a loop unless the phone asks for less motion. */
function useLoop(make: () => Animated.CompositeAnimation, on: boolean) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setCalm)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setCalm);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!on || calm) return;
    const loop = Animated.loop(make());
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, calm]);
}

/**
 * The streak's little flame. While the streak is alive it sways, glows, blinks and smiles;
 * once it goes out it turns grey and dozes.
 */
export function Flame({ size = 96, lit = true }: { size?: number; lit?: boolean }) {
  const { colors } = useTheme();
  const sway = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const ease = Easing.inOut(Easing.sin);
  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: native }),
        Animated.timing(sway, { toValue: -1, duration: 2600, easing: ease, useNativeDriver: native }),
        Animated.timing(sway, { toValue: 0, duration: 1300, easing: ease, useNativeDriver: native }),
      ]),
    lit,
  );
  useLoop(
    () =>
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(blink, { toValue: 0.1, duration: 90, useNativeDriver: native }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: native }),
      ]),
    lit,
  );
  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: ease, useNativeDriver: native }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: ease, useNativeDriver: native }),
      ]),
    lit,
  );

  const outer = lit ? colors.flame : colors.ash;
  const inner = lit ? colors.ember : colors.ashSoft;
  const middle = mix(outer, inner, 0.5);
  const ink = colors.black;
  const box = size * 1.5;
  const eyeW = size * 0.08;
  const eyeH = size * 0.11;
  const stroke = Math.max(1.5, size * 0.028);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  const stretch = sway.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.03, 0.98, 1.03] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.26] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const layer = (top: number) => [StyleSheet.absoluteFill, styles.center, { paddingTop: size * top }];

  return (
    <View
      accessible
      accessibilityLabel={lit ? 'A happy flame' : 'A sleeping flame'}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
    >
      {lit ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size,
            backgroundColor: outer,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
      ) : null}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          { transformOrigin: '50% 85%', transform: [{ rotate }, { scaleY: stretch }] },
        ]}
      >
        {/* The flame icon has a hollow near its base; this fills it from behind. */}
        <View
          style={{
            position: 'absolute',
            left: box / 2 - size * 0.18,
            top: box / 2 - size * 0.02,
            width: size * 0.36,
            height: size * 0.38,
            borderRadius: size,
            backgroundColor: inner,
          }}
        />
        <Ionicons name="flame" size={size} color={outer} />
        <View style={layer(0.2)}>
          <Ionicons name="flame" size={size * 0.78} color={middle} />
        </View>
        <View style={layer(0.42)}>
          <Ionicons name="flame" size={size * 0.56} color={inner} />
        </View>
        {/* A little shine near the top, so it looks round and glossy. */}
        <View
          style={{
            position: 'absolute',
            left: box / 2 - size * 0.2,
            top: box / 2 - size * 0.2,
            width: size * 0.09,
            height: size * 0.18,
            borderRadius: size,
            backgroundColor: '#FFFFFF',
            opacity: lit ? 0.45 : 0.25,
            transform: [{ rotate: '28deg' }],
          }}
        />
        <View style={layer(0.46)}>
          <View style={{ alignItems: 'center', gap: size * 0.035 }}>
            <View style={{ flexDirection: 'row', gap: size * 0.12, alignItems: 'center' }}>
              {[0, 1].map((i) =>
                lit ? (
                  <Animated.View
                    key={i}
                    style={{ width: eyeW, height: eyeH, borderRadius: eyeW, backgroundColor: ink, transform: [{ scaleY: blink }] }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top: eyeH * 0.14,
                        right: eyeW * 0.12,
                        width: eyeW * 0.42,
                        height: eyeW * 0.42,
                        borderRadius: eyeW,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </Animated.View>
                ) : (
                  // Asleep: soft closed eyes.
                  <View
                    key={i}
                    style={{
                      width: eyeW * 1.3,
                      height: eyeW * 0.65,
                      borderBottomLeftRadius: eyeW,
                      borderBottomRightRadius: eyeW,
                      borderWidth: stroke,
                      borderTopWidth: 0,
                      borderColor: ink,
                      opacity: 0.7,
                    }}
                  />
                ),
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.025 }}>
              {lit ? <View style={[styles.cheek, cheek(size, colors.rose)]} /> : null}
              <View
                style={{
                  width: size * (lit ? 0.13 : 0.08),
                  height: size * (lit ? 0.07 : 0.03),
                  borderBottomLeftRadius: size,
                  borderBottomRightRadius: size,
                  borderWidth: stroke,
                  borderTopWidth: 0,
                  borderColor: ink,
                  opacity: lit ? 1 : 0.6,
                }}
              />
              {lit ? <View style={[styles.cheek, cheek(size, colors.rose)]} /> : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const cheek = (size: number, color: string) => ({
  width: size * 0.085,
  height: size * 0.05,
  borderRadius: size,
  backgroundColor: color,
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  cheek: { opacity: 0.6 },
});
