import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
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

import { colors, fonts, radius, shadow, space } from '../theme';

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
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
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
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color = colors.flame }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function Card({
  children,
  style,
  tone = 'surface',
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'flame' | 'blush' | 'ember' | 'plum' | 'sage';
  onPress?: () => void;
}) {
  const bg = {
    surface: colors.surface,
    flame: colors.flame,
    blush: colors.flameSoft,
    ember: colors.emberSoft,
    plum: colors.plumSoft,
    sage: colors.sage,
  }[tone];
  const content = <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      {content}
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
        { backgroundColor: palette.bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.flame,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
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
      <Text style={[styles.chipLabel, { color: selected ? colors.white : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space(1.5) }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Avatar({ name, size = 40, tone = colors.flame }: { name: string; size?: number; tone?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: space(5), paddingBottom: space(16), gap: space(4) },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { borderRadius: radius.lg, padding: space(5), gap: space(3), ...shadow },
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
    backgroundColor: colors.surface,
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
