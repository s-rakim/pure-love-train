import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useMemo, type ReactNode } from 'react';
import {
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
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { darkColors, useColors, type Colors } from '../theme/theme';
import { fonts, radius, space, TAB_BAR_SPACE } from '../theme';

/** Black or white, whichever reads better on the given background colour. */
export function textOn(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? darkColors.black : darkColors.white;
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tint = color ?? colors.flame;
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
        selected ? { backgroundColor: tint, borderColor: tint } : { borderColor: colors.line },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? textOn(tint) : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space(1.5) }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

/** A small round avatar: a photo when one is set, otherwise the person's initial. */
export function Avatar({
  name,
  size = 40,
  tone,
  uri,
}: {
  name: string;
  size?: number;
  tone?: string;
  /** Local file uri of a profile photo; falls back to the initial when null. */
  uri?: string | null;
}) {
  const colors = useColors();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        contentFit="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: colors.background,
          backgroundColor: colors.surfaceRaised,
        }}
      />
    );
  }
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
      <Text style={{ color: colors.white, fontFamily: fonts.bodyBold, fontSize: size * 0.4 }}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(3) }, style]}>{children}</View>;
}

/** Section label above a group of cards, like "Today" or "Activities". */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink, letterSpacing: -0.3 }}>{children}</Text>
      {action}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: space(5), paddingBottom: TAB_BAR_SPACE, gap: space(4) },
    title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.8 },
    heading: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, letterSpacing: -0.4 },
    body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
    // Shadows barely read on black, so cards lean on a hairline border instead.
    card: { borderRadius: radius.lg, padding: space(5), gap: space(3), borderWidth: 1, borderColor: colors.line },
    button: {
      minHeight: 50,
      borderRadius: radius.pill,
      paddingHorizontal: space(6),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(2),
    },
    buttonLabel: { fontFamily: fonts.bodyBold, fontSize: 16 },
    chip: {
      borderWidth: 1.5,
      borderRadius: radius.pill,
      paddingHorizontal: space(3.5),
      paddingVertical: space(2),
    },
    chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 14 },
    fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.line,
      paddingHorizontal: space(4),
      paddingVertical: space(3.5),
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.ink,
    },
  });
