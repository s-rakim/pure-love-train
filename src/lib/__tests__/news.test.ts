/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { newsFrom } from '../news.ts';
import type { State } from '../store';

const state = (extra: Partial<State>) =>
  ({ names: { me: 'Alex', partner: 'Sam' }, moments: [], notes: [], letters: [], ...extra }) as unknown as State;

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
});
