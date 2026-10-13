import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QuestionCard } from '../../components/QuestionCard';
import { Body, Button, Card, Eyebrow, Field, Row, Screen, Title } from '../../components/ui';
import { addDays, diffDays, fromKey, relativeTime, shortDate, toKey, type DateKey } from '../../lib/dates';
import { useNames, useToday } from '../../lib/hooks';
import { questionForDay } from '../../lib/questions';
import { newId, useStore } from '../../lib/store';
import { colors, fonts, space } from '../../theme';

type Milestone = { label: string; date: DateKey; daysAway: number };

function upcomingMilestones(since: DateKey | undefined, today: DateKey): Milestone[] {
  if (!since) return [];
  const out: Milestone[] = [];
  const days = diffDays(since, today);

  const nextHundred = Math.max(100, Math.ceil((days + 1) / 100) * 100);
  const hundredDate = addDays(since, nextHundred);
  out.push({ label: `${nextHundred.toLocaleString()} days`, date: hundredDate, daysAway: diffDays(today, hundredDate) });

  const start = fromKey(since);
  const t = fromKey(today);
  let years = t.getFullYear() - start.getFullYear();
  let anniversary = toKey(new Date(start.getFullYear() + years, start.getMonth(), start.getDate()));
  if (anniversary <= today) {
    years += 1;
    anniversary = toKey(new Date(start.getFullYear() + years, start.getMonth(), start.getDate()));
  }
  out.push({
    label: `${years} year${years === 1 ? '' : 's'}`,
    date: anniversary,
    daysAway: diffDays(today, anniversary),
  });

  return out.sort((a, b) => a.daysAway - b.daysAway);
}

export default function Together() {
  const { state, update } = useStore();
  const names = useNames();
  const today = useToday();
  const [idea, setIdea] = useState('');

  const pastAnswers = Object.entries(state.answers)
    .filter(([key, a]) => key < today && a.me && a.partner)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 10);

  const milestones = upcomingMilestones(state.togetherSince, today);

  const addIdea = () => {
    const text = idea.trim();
    if (!text) return;
    update((s) => ({ ...s, dateIdeas: [{ id: newId(), text, done: false }, ...s.dateIdeas] }));
    setIdea('');
  };

  const toggleIdea = (id: string) =>
    update((s) => ({
      ...s,
      dateIdeas: s.dateIdeas.map((d) => (d.id === id ? { ...d, done: !d.done } : d)),
    }));

  const removeIdea = (id: string) =>
    update((s) => ({ ...s, dateIdeas: s.dateIdeas.filter((d) => d.id !== id) }));

  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <Title>Together</Title>
        <Body muted>Questions, plans and the days worth counting.</Body>
      </View>

      {milestones.length ? (
        <Row style={{ alignItems: 'stretch' }}>
          {milestones.map((m) => (
            <Card key={m.label} tone="plum" style={{ flex: 1, gap: space(1) }}>
              <Eyebrow color={colors.plum}>Coming up</Eyebrow>
              <Text style={styles.milestone}>{m.label}</Text>
              <Body style={{ fontSize: 13, color: colors.ink }}>
                {shortDate(m.date)} · {m.daysAway === 0 ? 'today' : `in ${m.daysAway} days`}
              </Body>
            </Card>
          ))}
        </Row>
      ) : null}

      <QuestionCard />

      {pastAnswers.length ? (
        <Card>
          <Eyebrow>Past answers</Eyebrow>
          {pastAnswers.map(([key, a]) => (
            <View key={key} style={styles.past}>
              <Body muted style={{ fontSize: 12 }}>{shortDate(key)}</Body>
              <Text style={styles.pastQuestion}>{questionForDay(key).text}</Text>
              <Body style={{ fontSize: 14 }}>
                <Text style={styles.who}>{names.me}: </Text>
                {a.me}
              </Body>
              <Body style={{ fontSize: 14 }}>
                <Text style={styles.who}>{names.partner}: </Text>
                {a.partner}
              </Body>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Eyebrow>Date ideas</Eyebrow>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={idea} onChangeText={setIdea} placeholder="Add an idea…" onSubmitEditing={addIdea} />
          </View>
          <Button label="Add" variant="secondary" onPress={addIdea} disabled={!idea.trim()} />
        </Row>
        {state.dateIdeas.map((d) => (
          <Row key={d.id} style={styles.idea}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: d.done }}
              hitSlop={8}
              onPress={() => toggleIdea(d.id)}
            >
              <Ionicons
                name={d.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={d.done ? colors.sageDeep : colors.muted}
              />
            </Pressable>
            <Text style={[styles.ideaText, d.done && styles.ideaDone]}>{d.text}</Text>
            <Pressable accessibilityLabel="Remove idea" hitSlop={8} onPress={() => removeIdea(d.id)}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </Row>
        ))}
      </Card>

      {state.notes.length ? (
        <Card>
          <Eyebrow>Love notes</Eyebrow>
          {state.notes.slice(0, 20).map((n) => (
            <View key={n.id} style={[styles.noteRow, n.from === 'me' ? styles.noteMine : styles.noteTheirs]}>
              <Text style={styles.noteText}>{n.text}</Text>
              <Body muted style={{ fontSize: 11 }}>
                {n.from === 'me' ? names.me : names.partner} · {relativeTime(n.createdAt)}
              </Body>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  milestone: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  past: { gap: 4, paddingVertical: space(2), borderTopWidth: 1, borderTopColor: colors.line },
  pastQuestion: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  who: { fontFamily: fonts.bodyBold, color: colors.ink },
  idea: { paddingVertical: space(1) },
  ideaText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  ideaDone: { color: colors.muted, textDecorationLine: 'line-through' },
  noteRow: { borderRadius: 16, padding: space(3), maxWidth: '85%', gap: 2 },
  noteMine: { alignSelf: 'flex-end', backgroundColor: colors.flameSoft },
  noteTheirs: { alignSelf: 'flex-start', backgroundColor: colors.plumSoft },
  noteText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
});
