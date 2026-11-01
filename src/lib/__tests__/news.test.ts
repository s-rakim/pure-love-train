/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { newsFrom } from '../news.ts';
import type { State } from '../store';

const state = (extra: Partial<State>) =>
  ({ names: { me: 'Alex', partner: 'Sam' }, moments: [], notes: [], letters: [], moods: {}, answers: {}, ...extra }) as unknown as State;

describe('notifications', () => {
  it('announces only new things from the partner', () => {
    const before = state({ notes: [{ id: 'n0', text: 'old', from: 'partner', createdAt: '' }] });
    const after = state({
      notes: [...before.notes, { id: 'n1', text: 'Miss you', from: 'partner', createdAt: '' }, { id: 'n2', text: 'mine', from: 'me', createdAt: '' }],
      moments: [{ id: 'm1', uri: 'x', caption: '', from: 'partner', createdAt: '', viewOnce: true }],
    });
    assert.deepEqual(
      newsFrom(before, after).map((n) => [n.id, n.title]),
      [['moment:m1', 'Sam sent a view-once moment'], ['note:n1', 'Sam']],
    );
  });

  it('announces a new mood and today\'s answer, without giving the answer away', () => {
    const today = '2026-11-01';
    const at = new Date(2026, 10, 1, 9).toISOString();
    const before = state({ moods: { partner: { emoji: '😴', label: 'Tired', at: new Date(2026, 9, 31, 9).toISOString() } } });
    const after = state({
      moods: { partner: { emoji: '🥰', label: 'Loved', at } },
      answers: { [today]: { partner: 'Voice notes' }, '2026-10-20': { partner: 'old' } },
    });
    assert.deepEqual(newsFrom(before, after, today), [
      { id: 'mood', title: 'Sam shared how they feel', body: '🥰 Loved' },
      { id: `answer:${today}`, title: "Sam answered today's question", body: 'Answer yours to unlock theirs.' },
    ]);
    assert.deepEqual(newsFrom(after, after, today), [], 'nothing new the second time');
  });
});
