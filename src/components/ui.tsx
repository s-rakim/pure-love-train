import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { makeStyles, palettes, radius, shadow, space, tabBarSpace, useTheme } from '../theme';

/** Black or white, whichever reads better on the given background colour. */
export function textOn(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? palettes.dark.black : palettes.dark.white;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function Screen({
  children,
  scroll = true,
  style,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Screens under a header pass [] so the header handles the top inset. */
  edges?: Edge[];
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const content = [styles.scrollContent, { paddingBottom: tabBarSpace(insets.bottom) }, style];
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {/* A soft wash at the top; in dark mode both ends match, so it disappears. */}
      <LinearGradient colors={[colors.glow, colors.background]} style={styles.glow} pointerEvents="none" />
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[...content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Body({
  children,
  muted,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <Text style={[styles.eyebrow, { color: color ?? colors.flame }]}>{children}</Text>;
}

export function Card({
  children,
  style,
  tone = 'surface',
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'flame' | 'blush' | 'ember' | 'plum' | 'sage' | 'sky' | 'rose';
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const bg = {
    surface: colors.surface,
    flame: colors.flame,
    blush: colors.flameSoft,
    ember: colors.emberSoft,
    plum: colors.plumSoft,
    sage: colors.sage,
    sky: colors.skySoft,
    rose: colors.roseSoft,
  }[tone];
  if (!onPress) return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg },
        style,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = {
    primary: { bg: colors.flame, fg: colors.white },
    secondary: { bg: colors.flameSoft, fg: colors.flameDeep },
    ghost: { bg: 'transparent', fg: colors.inkSoft },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled && variant !== 'ghost' ? colors.surfaceRaised : palette.bg },
        { opacity: disabled ? 0.7 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonLabel, { color: disabled ? colors.muted : palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color: tint,
  labelStyle,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  /** Extra label styling, such as a font picker writing each name in its own font. */
  labelStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const color = tint ?? colors.flame;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : { borderColor: colors.line },
      ]}
    >
      <Text style={[styles.chipLabel, labelStyle, { color: selected ? textOn(color) : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space(1.5) }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Avatar({ name, size = 40, tone }: { name: string; size?: number; tone?: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone ?? colors.flame,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
      }}
    >
      <Text style={{ color: colors.white, ...fonts.bodyBold, fontSize: size * 0.4 }}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(3) }, style]}>{children}</View>;
}

const useStyles = makeStyles((colors, fonts) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scrollContent: { padding: space(5), gap: space(4) },
  title: { ...fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.8, ...fonts.title },
  heading: { ...fonts.display, fontSize: 20, color: colors.ink, letterSpacing: -0.4 },
  body: { ...fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  eyebrow: { ...fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { borderRadius: radius.lg, padding: space(5), gap: space(3), ...shadow(colors) },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
  },
  buttonLabel: { ...fonts.bodyBold, fontSize: 16 },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
  },
  chipLabel: { ...fonts.bodyMedium, fontSize: 14 },
  fieldLabel: { ...fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginBottom: -radius.xl,
    paddingBottom: space(6) + radius.xl,
    paddingHorizontal: space(5),
    paddingTop: space(3),
    gap: space(4),
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
    ...fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
}));

/**
 * Frosted glass behind something that floats: a translucent fill, a soft sheen across the
 * top and a fine rim. `solid` keeps the fill opaque for panels that sit over a dimmed screen.
 */
export function Glass({ radius: r = 0, solid }: { radius?: number; solid?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: r, overflow: 'hidden', backgroundColor: solid ? colors.surface : colors.glass },
        // Browsers can blur what's behind; on phones the translucency carries the effect.
        Platform.OS === 'web' && !solid ? ({ backdropFilter: 'blur(20px) saturate(160%)' } as ViewStyle) : null,
      ]}
    >
      <LinearGradient
        colors={[colors.glassSheen, 'rgba(255,255,255,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }}
      />
      <View style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: 1, borderColor: colors.glassRim }]} />
    </View>
  );
}

/** A panel that slides up from the bottom over a dimmed screen. Tap outside to close. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Glass radius={radius.xl} solid />
        <View style={styles.handle} />
        <Text style={styles.heading}>{title}</Text>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

export const APP_NAME = 'You&I💞';

/**
 * The app's name. It never names a font, so it's always drawn in the phone's own,
 * the same as the name under the app icon.
 */
export function Wordmark({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={{ fontSize: size, lineHeight: size * 1.25, color: colors.ink }}>
      {APP_NAME}
    </Text>
  );
}

/** Section label above a group of cards, like "Today" or "Activities". */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) }}>
      <Text style={{ ...fonts.bodyBold, fontSize: 18, color: colors.ink, letterSpacing: -0.3 }}>{children}</Text>
      {action}
    </View>
  );
}
