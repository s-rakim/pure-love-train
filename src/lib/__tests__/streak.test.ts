/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { activeDays, streakLength, weekStrip } from '../streak.ts';

describe('streak', () => {
  const days = new Set(['2026-10-10', '2026-10-11', '2026-10-12']);

  it('counts back from yesterday when today is not done yet', () => {
    assert.equal(streakLength(days, '2026-10-13'), 3);
  });

  it('includes today once it counts', () => {
    assert.equal(streakLength(new Set([...days, '2026-10-13']), '2026-10-13'), 4);
  });

  it('resets after a missed day', () => {
    assert.equal(streakLength(days, '2026-10-14'), 0);
  });

  it('counts answers, moments and notes from either of you', () => {
    const d = activeDays({
      answers: { '2026-10-01': { partner: 'hi' }, '2026-10-02': {} },
      moments: [{ id: 'm', uri: 'x', caption: '', from: 'me', createdAt: new Date(2026, 9, 3, 9).toISOString() }],
      notes: [{ id: 'n', text: 'x', from: 'partner', createdAt: new Date(2026, 9, 4, 22).toISOString() }],
    });
    assert.deepEqual([...d].sort(), ['2026-10-01', '2026-10-03', '2026-10-04']);
  });

  it('lays out the week Monday first', () => {
    const week = weekStrip(days, '2026-10-13'); // a Tuesday
    assert.equal(week[0].key, '2026-10-12');
    assert.equal(week[0].active, true);
    assert.equal(week[1].isToday, true);
    assert.equal(week.length, 7);
  });
});
