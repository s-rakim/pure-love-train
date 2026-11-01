import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Eyebrow, Screen, SectionTitle, tap, textOn } from '../components/ui';
import { useNames, usePickCounts } from '../lib/hooks';
import { splitOption } from '../lib/questions';
import { useStore, type Side } from '../lib/store';
import { pairById, pairsUpTo, PAIRS_PER_DAY, type Pair } from '../lib/thisOrThat';
import { makeStyles, radius, space, useTheme } from '../theme';

/** How many past picks show at first, and how many more each tap of Show more adds. */
const HISTORY_PAGE = 30;

/** "A kiss or a long hug", so the pair reads as one question. */
function pairTitle(p: { a: string; b: string }) {
  const b = splitOption(p.b).text;
  return `${splitOption(p.a).text} or ${b.startsWith('A ') ? `a${b.slice(1)}` : b}`;
}

/**
 * This or that: pick a side of each pair, then see where the two of you agree.
 * Fifty new pairs come out each day, and any you haven't picked wait for you.
 */
export default function ThisOrThat() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const counts = usePickCounts();
  const picks = state.picks ?? {};
  // The pair just answered stays up to show how you compare, until Next.
  const [shown, setShown] = useState<string | null>(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE);

  // Working out tens of thousands of pairs takes a moment, so it waits until the screen has opened.
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setPairs(pairsUpTo(counts.out)));
    return () => task.cancel();
  }, [counts.out]);

  const { queue, history } = useMemo(() => {
    const out = pairs ?? [];
    const open = out.filter((p) => !picks[p.id]?.me);
    // Ones your partner already picked come first, so there's something to compare straight away;
    // the rest go oldest first, so yesterday's leftovers come before today's.
    const queue = [...open.filter((p) => picks[p.id]?.partner), ...open.filter((p) => !picks[p.id]?.partner)];
    const history = out.filter((p) => picks[p.id]?.me).reverse();
    return { queue, history };
  }, [pairs, picks]);

  const pair = shown ? pairById(shown) : queue[0];
  const mine = pair ? picks[pair.id]?.me : undefined;
  const theirs = pair ? picks[pair.id]?.partner : undefined;
  const left = queue.length;

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

  if (!pairs) {
    return (
      <Screen edges={[]} style={{ paddingTop: space(6), alignItems: 'center' }}>
        <ActivityIndicator color={colors.sky} />
      </Screen>
    );
  }

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
              <Button label={left ? 'Next' : 'Done'} onPress={() => setShown(null)} />
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
          <Text style={styles.doneTitle}>That's all for today</Text>
          <Body muted style={{ fontSize: 14, textAlign: 'center' }}>
            {PAIRS_PER_DAY} new pairs come out tomorrow.
            {counts.compared < counts.mine
              ? ` Once ${names.partner} catches up, you'll see how you compare below.`
              : ' Scroll down to see how you compare.'}
          </Body>
        </Card>
      )}
      <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
        {left
          ? `${left} left to pick. Any you don't get to stay here for tomorrow.`
          : `${counts.mine} picked so far`}
      </Body>

      {history.length ? (
        <>
          <SectionTitle
            action={
              counts.compared ? (
                <Text style={styles.score}>
                  {counts.matches} of {counts.compared} match
                </Text>
              ) : null
            }
          >
            Your picks
          </SectionTitle>
          <Card style={{ gap: 0, paddingVertical: space(2) }}>
            {history.slice(0, historyShown).map((p, i) => {
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
          {history.length > historyShown ? (
            <Button label="Show more" variant="ghost" onPress={() => setHistoryShown((n) => n + HISTORY_PAGE)} />
          ) : null}
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
