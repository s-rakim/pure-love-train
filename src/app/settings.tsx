import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View, type TextStyle } from 'react-native';

import { AccountCard } from '../components/AccountCard';
import { PairingCard } from '../components/PairingCard';
import { UpdateRow } from '../components/UpdateRow';
import { Body, Button, Card, Chip, Eyebrow, Field, Row, Screen, Wordmark } from '../components/ui';
import { isValidKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { leaveSpace } from '../lib/sync';
import { type AppearancePref, type FontPref, makeStyles, radius, space, type ThemeName, themes, useTheme } from '../theme';

const APPEARANCES: { value: AppearancePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Each font's chip is written in that font, so you can see it before picking.
const FONTS: { value: FontPref; label: string; preview?: TextStyle }[] = [
  { value: 'phone', label: "My phone's font", preview: { fontFamily: undefined } },
  { value: 'classic', label: 'DM Sans', preview: { fontFamily: 'DMSans_500Medium' } },
  { value: 'script', label: 'Great Vibes', preview: { fontFamily: 'GreatVibes_400Regular', fontWeight: '400', fontSize: 19 } },
  { value: 'rounded', label: 'Quicksand', preview: { fontFamily: 'Quicksand_600SemiBold' } },
  { value: 'bebas', label: 'Bebas Neue', preview: { fontFamily: 'BebasNeue_400Regular', fontWeight: '400', fontSize: 17, letterSpacing: 0.6 } },
];

const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'candle', label: 'Candle' },
  { value: 'lilac', label: 'Lilac' },
  { value: 'lavender', label: 'Lavender' },
  { value: 'misty', label: 'Misty' },
];

export default function Settings() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update, reset } = useStore();
  const [me, setMe] = useState(state.names.me);
  const [partner, setPartner] = useState(state.names.partner);
  const [since, setSince] = useState(state.togetherSince ?? '');
  const [myBirthday, setMyBirthday] = useState(state.birthdays?.me ?? '');
  const [theirBirthday, setTheirBirthday] = useState(state.birthdays?.partner ?? '');
  // A synced partner shares their own birthday, so it's only typed in here when you're not linked.
  const askPartnerBirthday = !state.sync;
  const datesValid = [since, myBirthday, theirBirthday].every((d) => d === '' || isValidKey(d));

  const saveProfile = () => {
    if (!me.trim() || !partner.trim() || !datesValid) return;
    update((s) => ({
      ...s,
      names: { me: me.trim(), partner: partner.trim() },
      togetherSince: since || undefined,
      birthdays: {
        ...s.birthdays,
        me: myBirthday || undefined,
        ...(askPartnerBirthday ? { partner: theirBirthday || undefined } : {}),
      },
    }));
  };

  const setLength = (field: 'cycleLength' | 'periodLength', delta: number) => {
    const [min, max] = field === 'cycleLength' ? [18, 50] : [1, 12];
    update((s) => {
      const next = Math.min(max, Math.max(min, s.cycle.settings[field] + delta));
      return { ...s, cycle: { ...s.cycle, settings: { ...s.cycle.settings, [field]: next } } };
    });
  };

  const confirmReset = () => {
    const sync = state.sync;
    const eraseHere = () => {
      reset();
      router.replace('/onboarding');
    };
    // Also take everything you shared off the server: records, photos, videos and the backup.
    const doReset = async () => {
      if (!sync) return eraseHere();
      try {
        await leaveSpace(sync);
        eraseHere();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        if (Platform.OS === 'web') return eraseHere();
        Alert.alert("Couldn't delete your data from the server", `${reason}\n\nErase this phone anyway? What you shared stays on the server.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Erase this phone', style: 'destructive', onPress: eraseHere },
        ]);
      }
    };
    if (Platform.OS === 'web') return doReset();
    const message = sync
      ? `This removes all moments, answers and cycle logs from this phone, and deletes everything you shared from your sync server. ${state.names.partner || 'Your partner'} will no longer see your moments, notes or answers.`
      : 'This removes all moments, answers and cycle logs from this phone.';
    Alert.alert('Erase everything?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen edges={[]} style={{ paddingTop: space(2) }}>
      <Card>
        <Eyebrow>You two</Eyebrow>
        <Field label="Your name" value={me} onChangeText={setMe} autoCapitalize="words" />
        <Field label="Partner's name" value={partner} onChangeText={setPartner} autoCapitalize="words" />
        <Field
          label="Together since"
          value={since}
          onChangeText={setSince}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Your birthday"
          value={myBirthday}
          onChangeText={setMyBirthday}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
        {askPartnerBirthday ? (
          <Field
            label="Partner's birthday"
            value={theirBirthday}
            onChangeText={setTheirBirthday}
            placeholder="YYYY-MM-DD"
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        ) : null}
        {!datesValid ? <Body style={{ color: colors.flameDeep, fontSize: 13 }}>Use YYYY-MM-DD.</Body> : null}
        <Button label="Save" onPress={saveProfile} disabled={!me.trim() || !partner.trim() || !datesValid} />
      </Card>

      <PairingCard />

      <AccountCard />

      <Card>
        <Eyebrow>Appearance</Eyebrow>
        <Row>
          {APPEARANCES.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              selected={(state.appearance ?? 'system') === a.value}
              onPress={() => update((s) => ({ ...s, appearance: a.value }))}
            />
          ))}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          System follows your phone's light or dark setting.
        </Body>
        <Eyebrow>Theme</Eyebrow>
        <View style={styles.themes}>
          {THEMES.map((t) => (
            <ThemeSwatch
              key={t.value}
              name={t.value}
              label={t.label}
              selected={(state.theme ?? 'candle') === t.value}
              onPress={() => update((s) => ({ ...s, theme: t.value }))}
            />
          ))}
        </View>
        <Body muted style={{ fontSize: 13 }}>Each theme has a light and a dark version, following the setting above.</Body>
        <Eyebrow>Font</Eyebrow>
        <View style={styles.wrap}>
          {FONTS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              labelStyle={f.preview}
              selected={(state.font ?? 'phone') === f.value}
              onPress={() => update((s) => ({ ...s, font: f.value }))}
            />
          ))}
        </View>
        <Body muted style={{ fontSize: 13 }}>
          Your phone's font is whatever you've picked in your phone's settings, the same as on your home screen. Great
          Vibes and Bebas Neue are for titles and your name; everything else stays in your phone's font.
        </Body>
        {Platform.OS === 'android' ? (
          <>
            <Eyebrow>Widget</Eyebrow>
            <Row>
              <Chip
                label="Show the photo"
                selected={!state.widgetPrivate}
                onPress={() => update((s) => ({ ...s, widgetPrivate: false }))}
              />
              <Chip
                label="Keep it private"
                selected={!!state.widgetPrivate}
                onPress={() => update((s) => ({ ...s, widgetPrivate: true }))}
              />
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              Private hides the photo and caption on your home screen and just says a moment arrived.
            </Body>
          </>
        ) : null}
        {Platform.OS !== 'web' ? (
          <>
            <Eyebrow>Notifications</Eyebrow>
            <Row>
              <Chip
                label="On"
                selected={state.notifications !== false}
                onPress={() => update((s) => ({ ...s, notifications: true }))}
              />
              <Chip label="Off" selected={state.notifications === false} onPress={() => update((s) => ({ ...s, notifications: false }))} />
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              New moments, notes, letters, moods and answers, plus an 8pm nudge if your three aren't done. Your phone checks your server
              every 15 to 30 minutes, so they can take that long to arrive.
            </Body>
          </>
        ) : null}
      </Card>

      <Card>
        <Eyebrow>Cycle</Eyebrow>
        <Row>
          <Chip
            label="Track my cycle"
            selected={state.cycle.tracking}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, tracking: true } }))}
          />
          <Chip
            label="Off"
            selected={!state.cycle.tracking}
            onPress={() => update((s) => ({ ...s, cycle: { ...s.cycle, tracking: false } }))}
          />
        </Row>
        <Stepper
          label="Typical cycle length"
          value={state.cycle.settings.cycleLength}
          onChange={(d) => setLength('cycleLength', d)}
        />
        <Stepper
          label="Typical period length"
          value={state.cycle.settings.periodLength}
          onChange={(d) => setLength('periodLength', d)}
        />
        <Body muted style={{ fontSize: 13 }}>
          Used until you've logged two periods. After that, predictions follow your own history.
        </Body>
      </Card>

      <Button label="Erase all data" variant="ghost" onPress={confirmReset} />

      <View style={{ alignItems: 'center', gap: space(1) }}>
        <Wordmark size={22} />
        <Body muted style={{ fontSize: 12 }}>Version {Constants.expoConfig?.version}</Body>
        <UpdateRow />
      </View>
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body style={{ color: colors.ink }}>{label}</Body>
      <Row style={{ gap: space(2) }}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(-1)} style={styles.step}>
          <Ionicons name="remove" size={18} color={colors.flameDeep} />
        </Pressable>
        <Text style={styles.stepValue}>{value} days</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => onChange(1)} style={styles.step}>
          <Ionicons name="add" size={18} color={colors.flameDeep} />
        </Pressable>
      </Row>
    </Row>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  swatch: { width: '47%', flexGrow: 1, borderWidth: 2, borderRadius: radius.md, padding: space(1.5), gap: space(1.5) },
  swatchPreview: { height: 56, borderRadius: radius.sm, padding: space(2.5), justifyContent: 'center' },
  swatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: space(2.5),
    paddingVertical: space(2),
  },
  swatchDot: { width: 12, height: 12, borderRadius: 6 },
  swatchLabel: { ...fonts.bodyBold, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.flameSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { ...fonts.bodyBold, fontSize: 15, color: colors.ink, minWidth: 64, textAlign: 'center' },
}));

/** A small preview of a theme: its background, a card and its accents, in the current light or dark. */
function ThemeSwatch({
  name,
  label,
  selected,
  onPress,
}: {
  name: ThemeName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { scheme, colors } = useTheme();
  const styles = useStyles();
  const c = themes[name][scheme];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} theme`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.swatch, { borderColor: selected ? colors.flame : colors.line }]}
    >
      <View style={[styles.swatchPreview, { backgroundColor: c.background }]}>
        <View style={[styles.swatchCard, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={[styles.swatchDot, { backgroundColor: c.flame }]} />
          <View style={[styles.swatchDot, { backgroundColor: c.plum }]} />
          <View style={[styles.swatchDot, { backgroundColor: c.sky }]} />
          <View style={[styles.swatchDot, { backgroundColor: c.rose }]} />
        </View>
      </View>
      <Text style={[styles.swatchLabel, selected && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}
