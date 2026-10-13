/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addPeriodDay,
  averageCycleLength,
  calendarMap,
  normalize,
  predict,
  removePeriodDay,
} from '../cycle.ts';
import { addDays, diffDays, monthGrid } from '../dates.ts';

const settings = { cycleLength: 28, periodLength: 5 };

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    assert.equal(addDays('2026-01-30', 3), '2026-02-02');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('counts whole days regardless of DST', () => {
    assert.equal(diffDays('2026-03-01', '2026-04-01'), 31);
    assert.equal(diffDays('2026-11-05', '2026-11-01'), -4);
  });

  it('builds a padded month grid', () => {
    const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
    assert.equal(grid.length % 7, 0);
    assert.equal(grid.indexOf('2026-10-01'), 4);
  });
});

describe('period days', () => {
  it('extends a period when the next day is logged', () => {
    let periods = addPeriodDay([], '2026-10-01');
    periods = addPeriodDay(periods, '2026-10-02');
    assert.deepEqual(periods, [{ start: '2026-10-01', end: '2026-10-02' }]);
  });

  it('bridges two periods separated by a single day', () => {
    const periods = addPeriodDay(
      [{ start: '2026-10-01', end: '2026-10-02' }, { start: '2026-10-04', end: '2026-10-05' }],
      '2026-10-03',
    );
    assert.deepEqual(periods, [{ start: '2026-10-01', end: '2026-10-05' }]);
  });

  it('splits a period when a middle day is removed', () => {
    const periods = removePeriodDay([{ start: '2026-10-01', end: '2026-10-05' }], '2026-10-03');
    assert.deepEqual(periods, [
      { start: '2026-10-01', end: '2026-10-02' },
      { start: '2026-10-04', end: '2026-10-05' },
    ]);
  });

  it('removes a one-day period entirely', () => {
    assert.deepEqual(removePeriodDay([{ start: '2026-10-01', end: '2026-10-01' }], '2026-10-01'), []);
  });

  it('merges overlapping input', () => {
    assert.deepEqual(
      normalize([{ start: '2026-10-03', end: '2026-10-06' }, { start: '2026-10-01', end: '2026-10-04' }]),
      [{ start: '2026-10-01', end: '2026-10-06' }],
    );
  });
});

describe('predictions', () => {
  const history = [
    { start: '2026-07-01', end: '2026-07-05' },
    { start: '2026-07-31', end: '2026-08-04' },
    { start: '2026-08-30', end: '2026-09-03' },
  ];

  it('averages recent cycle gaps and ignores implausible ones', () => {
    assert.equal(averageCycleLength(history, 28), 30);
    assert.equal(averageCycleLength([...history, { start: '2026-09-05', end: '2026-09-05' }], 28), 30);
    assert.equal(averageCycleLength(history.slice(0, 1), 28), 28);
  });

  it('predicts the next period, ovulation and fertile window', () => {
    const p = predict(history, settings, '2026-09-10')!;
    assert.equal(p.cycleDay, 12);
    assert.equal(p.nextPeriod, '2026-09-29');
    assert.equal(p.daysUntilNext, 19);
    assert.equal(p.ovulation, '2026-09-15');
    assert.equal(p.fertileStart, '2026-09-10');
    assert.equal(p.phase, 'fertile');
  });

  it('reports a late period as negative days', () => {
    const p = predict(history, settings, '2026-10-02')!;
    assert.equal(p.daysUntilNext, -3);
  });

  it('returns null with no history', () => {
    assert.equal(predict([], settings, '2026-10-02'), null);
  });

  it('marks logged and predicted days on the calendar', () => {
    const map = calendarMap(history, settings, '2026-09-10');
    assert.equal(map['2026-09-01'], 'period');
    assert.equal(map['2026-09-15'], 'ovulation');
    assert.equal(map['2026-09-12'], 'fertile');
    assert.equal(map['2026-09-29'], 'predicted');
    assert.equal(map['2026-09-09'], undefined);
    // Fertile days already passed in the current cycle still show.
    assert.equal(calendarMap(history, settings, '2026-09-13')['2026-09-11'], 'fertile');
  });
});
