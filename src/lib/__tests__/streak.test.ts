/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { activeDays, dayProgress, streakLength, weekStrip } from '../streak.ts';

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

  it('counts a day only once you both answer, send a moment and share a mood', () => {
    const at = (d: number, who: 'me' | 'partner') => ({
      id: `${who}${d}`, uri: 'x', caption: '', from: who, createdAt: new Date(2026, 9, d, 12).toISOString(),
    });
    const input = {
      answers: { '2026-10-01': { me: 'a', partner: 'b' }, '2026-10-02': { me: 'a', partner: 'b' }, '2026-10-03': { me: 'a' } },
      moments: [at(1, 'me'), at(1, 'partner'), at(2, 'me'), at(2, 'partner'), at(3, 'me'), at(3, 'partner')],
      moods: {},
      moodDays: { me: ['2026-10-01', '2026-10-02', '2026-10-03'], partner: ['2026-10-01', '2026-10-03'] },
    };
    // Oct 2: no mood from the partner. Oct 3: the partner didn't answer.
    assert.deepEqual([...activeDays(input)], ['2026-10-01']);
    assert.deepEqual(dayProgress(input, '2026-10-02').partner, { answer: true, moment: true, mood: false });
  });

  it('lays out the week Monday first', () => {
    const week = weekStrip(days, '2026-10-13'); // a Tuesday
    assert.equal(week[0].key, '2026-10-12');
    assert.equal(week[0].active, true);
    assert.equal(week[1].isToday, true);
    assert.equal(week.length, 7);
  });
});
