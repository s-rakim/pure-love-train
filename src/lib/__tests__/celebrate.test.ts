/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { celebrationsFor } from '../celebrate.ts';

const names = { me: 'Alex', partner: 'Sam' };

describe('celebrations', () => {
  it('marks anniversaries, every 100 days and birthdays', () => {
    const s = { togetherSince: '2024-02-14', birthdays: { partner: '1999-06-01' } };
    assert.equal(celebrationsFor(s, names, '2026-02-14')[0].title, 'Happy 2 years!');
    assert.equal(celebrationsFor(s, names, '2024-05-24')[0].title, '100 days together');
    assert.equal(celebrationsFor(s, names, '2026-06-01')[0].title, "It's Sam's birthday");
    assert.deepEqual(celebrationsFor(s, names, '2026-06-02'), []);
    assert.deepEqual(celebrationsFor(s, names, '2024-02-14'), [], 'not on the very first day');
  });
});
