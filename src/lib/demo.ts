import { addDays, todayKey } from './dates';
import { questionForDay } from './questions';
import { newId, type Side, type State } from './store';

const DEMO_ANSWERS = [
  'Honestly? The way you hum when you cook.',
  'That rainy afternoon we got lost and found the tiny bookshop.',
  'When you bring me tea without asking.',
  'Something slow with no plans and lots of snacks.',
];

const DEMO_PICKS: Record<string, Side> = {
  'night-in-out': 'a',
  'beach-mountains': 'b',
  'coffee-tea': 'a',
  'sunrise-sunset': 'b',
  'kiss-hug': 'b',
  'big-little-spoon': 'b',
};

/**
 * Fills in the partner's side (answers, a mood, a note, a few picks and a sealed letter) so the shared
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
  const picks = { ...s.picks };
  for (const [pair, side] of Object.entries(DEMO_PICKS)) picks[pair] = { ...picks[pair], partner: side };
  return {
    ...s,
    answers,
    picks,
    letters: [
      {
        id: 'demo-letter',
        when: 'Open when you miss me',
        text: 'Close your eyes for a second. That warm feeling? That’s me, thinking about you right now. I’ll be home soon.',
        from: 'partner',
        createdAt: now,
      },
      ...(s.letters ?? []).filter((l) => l.id !== 'demo-letter'),
    ],
    moods: { ...s.moods, partner: { emoji: '🥰', label: 'Loved', at: now } },
    notes: [
      { id: newId(), text: 'Thinking about you. Dinner on me tonight?', from: 'partner', createdAt: now },
      ...s.notes,
    ],
  };
}
