import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNames, useToday } from '../lib/hooks';
import { questionForDay } from '../lib/questions';
import { useStore } from '../lib/store';
import { colors, fonts, radius, space } from '../theme';
import { Avatar, Button, Card, Eyebrow, Field, Row } from './ui';

/** Today's shared question. Answers stay hidden until both of you have replied. */
export function QuestionCard() {
  const { state, update } = useStore();
  const names = useNames();
  const today = useToday();
  const question = questionForDay(today);
  const answers = state.answers[today] ?? {};
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    update((s) => ({
      ...s,
      answers: { ...s.answers, [today]: { ...s.answers[today], me: text } },
    }));
    setDraft('');
  };

  return (
    <Card tone="ember">
      <Eyebrow color={colors.flameDeep}>Today's question</Eyebrow>
      <Text style={styles.question}>{question.text}</Text>

      {!answers.me ? (
        <View style={{ gap: space(3) }}>
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder="Write your answer…"
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          <Button label="Lock in my answer" onPress={submit} disabled={!draft.trim()} />
          {answers.partner ? (
            <Text style={styles.hint}>{names.partner} already answered. Reply to unlock it.</Text>
          ) : null}
        </View>
      ) : !answers.partner ? (
        <View style={styles.locked}>
          <Ionicons name="lock-closed" size={18} color={colors.flameDeep} />
          <Text style={styles.hint}>
            Your answer is in. It unlocks for both of you once {names.partner} answers.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space(3) }}>
          <Answer name={names.me} text={answers.me} tone={colors.flame} />
          <Answer name={names.partner} text={answers.partner} tone={colors.plum} />
        </View>
      )}
    </Card>
  );
}

function Answer({ name, text, tone }: { name: string; text: string; tone: string }) {
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <Avatar name={name} size={32} tone={tone} />
      <View style={styles.bubble}>
        <Text style={styles.bubbleName}>{name}</Text>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  question: { fontFamily: fonts.display, fontSize: 22, lineHeight: 29, color: colors.ink },
  hint: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  locked: {
    flexDirection: 'row',
    gap: space(2),
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    padding: space(3),
  },
  bubble: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: space(3), gap: 2 },
  bubbleName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
});
