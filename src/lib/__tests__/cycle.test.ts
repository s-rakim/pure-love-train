/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addPeriodDay,
  averageCycleLength,
  averagePeriodLength,
  calendarMap,
  cycleHistory,
  editPeriod,
  endPeriod,
  normalize,
  openPeriod,
  overlapsAnother,
  predict,
  removePeriodDay,
  stagesOf,
  startPeriod,
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

describe('irregular cycles', () => {
  // Cycles of 26, 35 and 30 days: more than a week apart, so irregular.
  const history = [
    { start: '2026-06-01', end: '2026-06-05', ended: true },
    { start: '2026-06-27', end: '2026-07-02', ended: true },
    { start: '2026-08-01', end: '2026-08-04', ended: true },
    { start: '2026-08-31', end: '2026-09-04', ended: true },
  ];

  it('gives the next period as a window from the shortest and longest cycle', () => {
    const p = predict(history, settings, '2026-09-10')!;
    assert.equal(p.irregular, true);
    assert.equal(p.cycleLength, 30);
    assert.equal(p.shortestCycle, 26);
    assert.equal(p.longestCycle, 35);
    assert.equal(p.nextPeriod, '2026-09-30');
    assert.equal(p.nextEarliest, '2026-09-26');
    assert.equal(p.nextLatest, '2026-10-05');
  });

  it('widens the fertile window to cover early and late ovulation', () => {
    const p = predict(history, settings, '2026-09-10')!;
    // Earliest ovulation is day 12 of a 26-day cycle; latest is day 21 of a 35-day one.
    assert.equal(p.fertileStart, '2026-09-07');
    assert.equal(p.fertileEnd, '2026-09-22');
    assert.equal(p.ovulation, '2026-09-16');
    assert.equal(p.phase, 'fertile');
  });

  it('uses a confirmed period length as it is, even when shorter than usual', () => {
    const periods = [...history.slice(0, 3), { start: '2026-08-31', end: '2026-09-02', ended: true }];
    const p = predict(periods, settings, '2026-09-10')!;
    assert.equal(p.periodEnd, '2026-09-02');
    assert.equal(p.periodEndConfirmed, true);
  });

  it('averages only periods whose length is known', () => {
    // A start logged on its own says nothing about how long it lasted.
    const periods = [
      { start: '2026-07-01', end: '2026-07-06', ended: true },
      { start: '2026-08-01', end: '2026-08-01' },
      { start: '2026-09-01', end: '2026-09-04' },
    ];
    assert.equal(averagePeriodLength(periods, 5, '2026-10-01'), 5);
    assert.equal(predict(periods, settings, '2026-09-02')!.periodEndConfirmed, false, 'still open');
  });
});

describe('confirming dates', () => {
  it('starts a period on an earlier day and fills the days up to today', () => {
    assert.deepEqual(startPeriod([], '2026-10-28', '2026-10-30'), [{ start: '2026-10-28', end: '2026-10-30' }]);
  });

  it('keeps a period open until its last day is confirmed', () => {
    let periods = startPeriod([], '2026-10-28', '2026-10-28');
    assert.deepEqual(openPeriod(periods, '2026-10-30'), { start: '2026-10-28', end: '2026-10-28' });
    periods = endPeriod(periods, '2026-11-02');
    assert.deepEqual(periods, [{ start: '2026-10-28', end: '2026-11-02', ended: true }]);
    assert.equal(openPeriod(periods, '2026-11-03'), null);
  });

  it('stops asking about a period after two weeks', () => {
    assert.equal(openPeriod([{ start: '2026-10-01', end: '2026-10-01' }], '2026-10-20'), null);
  });

  it('corrects or removes a logged period', () => {
    const periods = [
      { start: '2026-09-01', end: '2026-09-05', ended: true },
      { start: '2026-10-01', end: '2026-10-01' },
    ];
    assert.deepEqual(editPeriod(periods, periods[1], { start: '2026-09-30', end: '2026-10-04' }), [
      periods[0],
      { start: '2026-09-30', end: '2026-10-04', ended: true },
    ]);
    assert.deepEqual(editPeriod(periods, periods[0], null), [periods[1]]);
  });

  it('spots dates that would run into another period', () => {
    const periods = [{ start: '2026-09-01', end: '2026-09-05', ended: true }];
    assert.equal(overlapsAnother(periods, { start: '2026-09-06', end: '2026-09-08' }), true);
    assert.equal(overlapsAnother(periods, { start: '2026-09-07', end: '2026-09-08' }), false);
    assert.equal(overlapsAnother(periods, { start: '2026-09-02', end: '2026-09-04' }, periods[0]), false);
  });

  it('lays out each phase of the cycle with its dates and length', () => {
    const history = [
      { start: '2026-08-02', end: '2026-08-06', ended: true },
      { start: '2026-08-30', end: '2026-09-03', ended: true },
    ];
    const p = predict(history, settings, '2026-09-10')!;
    assert.deepEqual(
      stagesOf(p, '2026-09-10').map((s) => [s.phase, s.start, s.end, s.days, s.estimated]),
      [
        ['period', '2026-08-30', '2026-09-03', 5, false],
        ['follicular', '2026-09-04', '2026-09-12', 9, true],
        ['ovulation', '2026-09-13', '2026-09-13', 1, true],
        ['luteal', '2026-09-14', '2026-09-26', 13, true],
      ],
    );
  });

  it('lists past cycles newest first with their lengths', () => {
    const history = cycleHistory(
      [
        { start: '2026-08-02', end: '2026-08-06', ended: true },
        { start: '2026-08-30', end: '2026-08-30' },
      ],
      '2026-10-30',
    );
    assert.deepEqual(
      history.map((h) => [h.period.start, h.periodDays, h.cycleDays]),
      [
        ['2026-08-30', null, null],
        ['2026-08-02', 5, 28],
      ],
    );
  });
});
