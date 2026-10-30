import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Eyebrow, Screen, SectionTitle, tap, textOn } from '../components/ui';
import { useNames } from '../lib/hooks';
import { splitOption, THIS_OR_THAT } from '../lib/questions';
import { useStore, type Side } from '../lib/store';
import { makeStyles, radius, space, useTheme } from '../theme';

/** "A kiss or a long hug", so the pair reads as one question. */
function pairTitle(p: { a: string; b: string }) {
  const b = splitOption(p.b).text;
  return `${splitOption(p.a).text} or ${b.startsWith('A ') ? `a${b.slice(1)}` : b}`;
}

/** This or that: pick a side of each pair, then see where the two of you agree. */
export default function ThisOrThat() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const picks = state.picks ?? {};
  // The pair just answered stays up to show how you compare, until Next.
  const [shown, setShown] = useState<string | null>(null);

  // Ones your partner already picked come first, so there's something to compare straight away.
  const open = THIS_OR_THAT.filter((p) => !picks[p.id]?.me);
  const queue = [...open.filter((p) => picks[p.id]?.partner), ...open.filter((p) => !picks[p.id]?.partner)];
  const pair = shown ? THIS_OR_THAT.find((p) => p.id === shown) : queue[0];
  const mine = pair ? picks[pair.id]?.me : undefined;
  const theirs = pair ? picks[pair.id]?.partner : undefined;

  const answered = THIS_OR_THAT.filter((p) => picks[p.id]?.me);
  // Both picked first, then the ones still waiting on your partner.
  const history = [...answered.filter((p) => picks[p.id]?.partner), ...answered.filter((p) => !picks[p.id]?.partner)];
  const compared = answered.filter((p) => picks[p.id]?.partner);
  const matches = compared.filter((p) => picks[p.id].me === picks[p.id].partner).length;

  const choose = (id: string, side: Side) => {
    update((s) => ({ ...s, picks: { ...s.picks, [id]: { ...s.picks?.[id], me: side } } }));
    setShown(id);
  };

  const verdict = () => {
    if (!pair || !mine) return null;
    if (!theirs) return `${names.partner} hasn't picked yet. You'll see theirs here once they do.`;
    const other = splitOption(theirs === 'a' ? pair.a : pair.b).text;
    return theirs === mine ? `💞 ${names.partner} picked ${other} too.` : `${names.partner} went for ${other}.`;
  };

  return (
    <Screen edges={[]} style={{ paddingTop: space(2) }}>
      {pair ? (
        <Card style={{ gap: space(4) }}>
          <Eyebrow color={colors.sky}>{shown ? 'Your pick' : 'Which one?'}</Eyebrow>
          <View style={styles.pair}>
            <Option option={pair.a} mine={mine === 'a'} theirs={!!mine && theirs === 'a'} onPress={() => choose(pair.id, 'a')} />
            <Text style={styles.or}>or</Text>
            <Option option={pair.b} mine={mine === 'b'} theirs={!!mine && theirs === 'b'} onPress={() => choose(pair.id, 'b')} />
          </View>
          {shown ? (
            <>
              <Body style={{ fontSize: 15, textAlign: 'center' }}>{verdict()}</Body>
              <Button label={queue.length ? 'Next' : 'Done'} onPress={() => setShown(null)} />
            </>
          ) : (
            <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
              Go with your gut. You'll see {names.partner}'s pick after yours.
            </Body>
          )}
        </Card>
      ) : (
        <Card style={{ alignItems: 'center', gap: space(2) }}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={styles.doneTitle}>You've picked them all</Text>
          <Body muted style={{ fontSize: 14, textAlign: 'center' }}>
            {compared.length < answered.length
              ? `Once ${names.partner} catches up, you'll see how you compare below.`
              : 'Scroll down to see how you compare.'}
          </Body>
        </Card>
      )}
      <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
        {answered.length} of {THIS_OR_THAT.length} picked
      </Body>

      {history.length ? (
        <>
          <SectionTitle
            action={
              compared.length ? (
                <Text style={styles.score}>
                  {matches} of {compared.length} match
                </Text>
              ) : null
            }
          >
            Your picks
          </SectionTitle>
          <Card style={{ gap: 0, paddingVertical: space(2) }}>
            {history.map((p, i) => {
              const me = picks[p.id].me!;
              const them = picks[p.id].partner;
              const label = (side: Side) => splitOption(side === 'a' ? p.a : p.b).text;
              return (
                <View key={p.id} style={[styles.row, i > 0 && styles.rowLine]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>{pairTitle(p)}</Text>
                    <Text style={styles.rowMeta}>
                      You: {label(me)} · {them ? `${names.partner}: ${label(them)}` : `waiting for ${names.partner}`}
                    </Text>
                  </View>
                  {them === me ? <Ionicons name="heart" size={20} color={colors.rose} /> : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Option({ option, mine, theirs, onPress }: { option: string; mine: boolean; theirs: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const names = useNames();
  const { emoji, text } = splitOption(option);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: mine }}
      accessibilityLabel={text}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        mine && { borderColor: colors.sky, backgroundColor: colors.skySoft },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={styles.optionText}>{text}</Text>
      {mine || theirs ? (
        <View style={styles.badges}>
          {mine ? <Text style={[styles.badge, { backgroundColor: colors.sky, color: textOn(colors.sky) }]}>You</Text> : null}
          {theirs ? (
            <Text style={[styles.badge, { backgroundColor: colors.plum, color: textOn(colors.plum) }]} numberOfLines={1}>
              {names.partner}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: space(2) },
  or: { ...fonts.bodyBold, fontSize: 13, color: colors.muted, alignSelf: 'center' },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    minHeight: 150,
    padding: space(3),
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
  },
  optionEmoji: { fontSize: 40 },
  optionText: { ...fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ink, textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space(1) },
  badge: {
    ...fonts.bodyBold,
    fontSize: 11,
    paddingHorizontal: space(2),
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    maxWidth: 110,
  },
  doneTitle: { ...fonts.display, fontSize: 21, color: colors.ink, textAlign: 'center' },
  score: { ...fonts.bodyBold, fontSize: 14, color: colors.rose },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { ...fonts.bodyMedium, fontSize: 15, color: colors.ink },
  rowMeta: { ...fonts.body, fontSize: 13, color: colors.muted },
}));
