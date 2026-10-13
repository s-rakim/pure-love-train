import { addDays, todayKey } from './dates';
import { questionForDay } from './questions';
import { newId, type State } from './store';

const DEMO_ANSWERS = [
  'Honestly? The way you hum when you cook.',
  'That rainy afternoon we got lost and found the tiny bookshop.',
  'When you bring me tea without asking.',
  'Something slow with no plans and lots of snacks.',
];

/**
 * Fills in the partner's side (answers, a mood, a note) so the shared
 * features can be tried on one phone before partner sync exists.
 */
export function withDemoPartner(s: State): State {
  const today = todayKey();
  const answers = { ...s.answers };
  for (let i = 0; i < 4; i++) {
    const key = addDays(today, -i);
    const text = DEMO_ANSWERS[questionForDay(key).index % DEMO_ANSWERS.length];
    answers[key] = { ...answers[key], partner: text };
  }
  const now = new Date().toISOString();
  return {
    ...s,
    answers,
    moods: { ...s.moods, partner: { emoji: '🥰', label: 'Loved', at: now } },
    notes: [
      { id: newId(), text: 'Thinking about you. Dinner on me tonight?', from: 'partner', createdAt: now },
      ...s.notes,
    ],
  };
}
