/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { State } from '../store';
import { applyRecords, fingerprint, outgoingRecords, pendingChanges, type PulledRecord } from '../syncCore.ts';

const ME = 'me-id';
const PARTNER = 'partner-id';

function baseState(): State {
  return {
    onboarded: true,
    names: { me: 'Alex', partner: 'Sam' },
    togetherSince: '2025-02-14',
    cycle: {
      tracking: true,
      shareWithPartner: true,
      settings: { cycleLength: 28, periodLength: 5 },
      periods: [{ start: '2026-10-01', end: '2026-10-05' }],
      logs: { '2026-10-02': { flow: 'heavy', symptoms: ['Cramps'], note: 'private' } },
    },
    moments: [
      { id: 'm1', uri: 'file:///a.jpg', caption: 'hi', from: 'me', createdAt: '2026-10-10T10:00:00Z', photoId: 'p1' },
      { id: 'm2', uri: 'file:///b.jpg', caption: '', from: 'me', createdAt: '2026-10-10T11:00:00Z' },
    ],
    answers: { '2026-10-13': { me: 'Voice notes' } },
    notes: [{ id: 'n1', text: 'Love you', from: 'me', createdAt: '2026-10-12T09:00:00Z' }],
    moods: { me: { emoji: '🥰', label: 'Loved', at: '2026-10-13T08:00:00Z' } },
    dateIdeas: [{ id: 'd1', text: 'Picnic', done: false }],
    sync: { serverUrl: 'http://x', token: 't', memberId: ME, pairCode: null, cursor: 0, pushed: {} },
  };
}

describe('outgoing records', () => {
  it('publishes my things and a cycle summary, never raw logs', () => {
    const out = outgoingRecords(baseState(), '2026-10-13');
    assert.deepEqual([...out.keys()].sort(), [
      'answer:me-id:2026-10-13',
      'couple:settings',
      'cycle:me-id',
      'dateIdea:d1',
      'moment:m1',
      'mood:me-id',
      'note:n1',
      'profile:me-id',
    ]);
    const cycle = out.get('cycle:me-id')!.data as Record<string, string>;
    assert.deepEqual(Object.keys(cycle).sort(), ['nextPeriod', 'ovulation', 'periodEnd', 'periodStart']);
    assert.ok(!JSON.stringify([...out.values()]).includes('private'));
  });

  it('stops sharing the cycle when sharing is off', () => {
    const s = baseState();
    s.cycle.shareWithPartner = false;
    assert.equal(outgoingRecords(s, '2026-10-13').has('cycle:me-id'), false);
  });

  it('only sends what changed and sends deletions', () => {
    const s = baseState();
    const all = outgoingRecords(s, '2026-10-13');
    s.sync!.pushed = Object.fromEntries([...all].map(([k, r]) => [k, fingerprint(r.data)]));
    assert.deepEqual(pendingChanges(s, '2026-10-13'), []);

    s.notes = [];
    s.moods = { me: { emoji: '😴', label: 'Tired', at: '2026-10-13T09:00:00Z' } };
    const changes = pendingChanges(s, '2026-10-13');
    assert.deepEqual(
      changes.map((c) => [c.kind, c.id, !!c.deleted]),
      [['mood', ME, false], ['note', 'n1', true]],
    );
  });
});

describe('applying partner records', () => {
  const rec = (kind: string, id: string, data: unknown, extra: Partial<PulledRecord> = {}): PulledRecord => ({
    kind, id, data, author: PARTNER, seq: 1, ...extra,
  });

  it('fills in the partner side of each feature', () => {
    const next = applyRecords(
      baseState(),
      [
        rec('profile', PARTNER, { name: 'Samantha' }),
        rec('mood', PARTNER, { emoji: '😌', label: 'Calm', at: 'x' }),
        rec('answer', `${PARTNER}:2026-10-13`, { date: '2026-10-13', text: 'Morning coffee' }),
        rec('note', 'n9', { text: 'Dinner?', createdAt: '2026-10-13T10:00:00Z' }),
        rec('moment', 'm9', { photoId: 'p9', caption: 'sky', createdAt: '2026-10-13T10:00:00Z' }),
        rec('cycle', PARTNER, { periodStart: '2026-10-01', periodEnd: '2026-10-05', nextPeriod: '2026-10-29', ovulation: '2026-10-15' }),
        rec('dateIdea', 'd2', { text: 'Stargazing', done: false }),
        rec('mood', ME, { emoji: '?' }, { author: ME }),
      ],
      { m9: 'file:///m9.jpg' },
    );
    assert.equal(next.names.partner, 'Samantha');
    assert.equal(next.moods.partner?.label, 'Calm');
    assert.equal(next.moods.me?.label, 'Loved', 'my own records are ignored');
    assert.deepEqual(next.answers['2026-10-13'], { me: 'Voice notes', partner: 'Morning coffee' });
    assert.equal(next.notes[0].id, 'n9');
    assert.equal(next.notes[0].from, 'partner');
    assert.equal(next.moments[0].uri, 'file:///m9.jpg');
    assert.equal(next.partnerCycle?.nextPeriod, '2026-10-29');
    assert.equal(next.dateIdeas[0].text, 'Stargazing');
    assert.equal(next.sync!.pushed['dateIdea:d2'], fingerprint({ text: 'Stargazing', done: false }));
    assert.ok(!pendingChanges(next, '2026-10-13').some((c) => c.id === 'd2'), 'shared records are not echoed back');
  });

  it('removes things the partner deleted', () => {
    let s = applyRecords(baseState(), [rec('note', 'n9', { text: 'x', createdAt: 'y' })]);
    s = applyRecords(s, [rec('note', 'n9', null, { deleted: true }), rec('dateIdea', 'd1', null, { deleted: true })]);
    assert.ok(!s.notes.some((n) => n.id === 'n9'));
    assert.deepEqual(s.dateIdeas, []);
  });

  it('keeps our anniversary when the partner has none', () => {
    const s = applyRecords(baseState(), [rec('couple', 'settings', { togetherSince: null })]);
    assert.equal(s.togetherSince, '2025-02-14');
  });
});
