import { useState } from 'react';
import { Text, View } from 'react-native';

import { QuestionCard } from '../../components/QuestionCard';
import { Body, Button, Card, Eyebrow, Field, Row, Screen, SectionTitle, Title } from '../../components/ui';
import { relativeTime, shortDate } from '../../lib/dates';
import { useNames, useToday } from '../../lib/hooks';
import { questionText } from '../../lib/questions';
import { newId, useStore } from '../../lib/store';
import { makeStyles, radius, space, useTheme } from '../../theme';

/** Talking to each other: today's question, love notes and every answer so far. */
export default function Connect() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { state, update } = useStore();
  const names = useNames();
  const today = useToday();
  const [note, setNote] = useState('');

  const pastAnswers = Object.entries(state.answers)
    .filter(([key, a]) => key < today && a.me && a.partner)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 14);

  const sendNote = () => {
    const text = note.trim();
    if (!text) return;
    update((s) => ({
      ...s,
      notes: [{ id: newId(), text, from: 'me', createdAt: new Date().toISOString() }, ...s.notes],
    }));
    setNote('');
  };

  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <Title>Connect</Title>
        <Body muted>One question a day. Answers unlock once you've both replied.</Body>
      </View>

      <QuestionCard />

      <SectionTitle>Love notes</SectionTitle>
      <Card>
        {/* Like any chat: oldest at the top, newest just above the box you type in. */}
        {state.notes.length ? (
          state.notes.slice(0, 20).reverse().map((n) => (
            <View key={n.id} style={[styles.bubble, n.from === 'me' ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, n.from === 'me' && styles.onFlame]}>{n.text}</Text>
              <Text style={[styles.bubbleMeta, n.from === 'me' && styles.onFlame]}>
                {n.from === 'me' ? names.me : names.partner} · {relativeTime(n.createdAt)}
              </Text>
            </View>
          ))
        ) : (
          <Body muted>Notes you send each other show up here.</Body>
        )}
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={note} onChangeText={setNote} placeholder={`Leave a note for ${names.partner}…`} />
          </View>
          <Button label="Send" onPress={sendNote} disabled={!note.trim()} />
        </Row>
      </Card>

      {pastAnswers.length ? (
        <>
          <SectionTitle>Past answers</SectionTitle>
          {pastAnswers.map(([key, a]) => (
            <Card key={key} style={{ gap: space(2) }}>
              <Eyebrow color={colors.muted}>{shortDate(key)}</Eyebrow>
              <Text style={styles.pastQuestion}>{questionText(state.questions, key)}</Text>
              <Body style={{ fontSize: 14 }}>
                <Text style={styles.who}>{names.me}: </Text>
                {a.me}
              </Body>
              <Body style={{ fontSize: 14 }}>
                <Text style={styles.who}>{names.partner}: </Text>
                {a.partner}
              </Body>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors, fonts) => ({
  bubble: { borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(2.5), maxWidth: '85%', gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.flame, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 6 },
  bubbleText: { ...fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  bubbleMeta: { ...fonts.body, fontSize: 11, color: colors.ink, opacity: 0.6 },
  onFlame: { color: colors.white },
  pastQuestion: { ...fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  who: { ...fonts.bodyBold, color: colors.ink },
}));
