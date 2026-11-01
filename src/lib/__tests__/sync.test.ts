/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { State } from '../store';
import { applyRecords, backupOf, fingerprint, isPrivateHttp, outgoingRecords, pendingChanges, type PulledRecord } from '../syncCore.ts';

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
    coupons: [],
    picks: {},
    letters: [],
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
    assert.deepEqual(Object.keys(cycle).sort(), [
      'fertileEnd', 'fertileStart', 'nextLatest', 'nextPeriod', 'ovulation', 'periodEnd', 'periodStart',
    ]);
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
    assert.deepEqual(next.moods.partner, { emoji: '😌', label: 'Calm', at: 'x' });
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

describe('video moments', () => {
  const clip = { id: 'v1', uri: 'file:///v1.jpg', videoUri: 'file:///v1.mp4', videoExt: 'mp4', caption: 'waves', from: 'me' as const, createdAt: '2026-10-30T10:00:00Z' };

  it('go out only once both the still frame and the video are uploaded', () => {
    const s = baseState();
    s.moments = [{ ...clip, photoId: 'p1' }];
    assert.ok(!outgoingRecords(s).has('moment:v1'), 'not before the video itself is up');
    s.moments = [{ ...clip, photoId: 'p1', videoId: 'vid1' }];
    assert.deepEqual(outgoingRecords(s).get('moment:v1')?.data, {
      photoId: 'p1', caption: 'waves', createdAt: clip.createdAt, videoId: 'vid1', videoExt: 'mp4',
    });
  });

  it('arrive as a still frame with the video to fetch, keeping a copy already downloaded', () => {
    const data = { photoId: 'p9', caption: 'hi', createdAt: '2026-10-30T11:00:00Z', videoId: 'vid9', videoExt: 'mov' };
    const pulled = { kind: 'moment', id: 'v9', data, author: PARTNER, seq: 1 };
    let s = applyRecords(baseState(), [pulled], { v9: 'file:///v9.jpg' });
    const v9 = s.moments.find((m) => m.id === 'v9')!;
    assert.equal(v9.uri, 'file:///v9.jpg');
    assert.equal(v9.videoId, 'vid9');
    assert.equal(v9.videoExt, 'mov');
    assert.equal(v9.videoUri, undefined, 'downloaded separately');

    s = { ...s, moments: s.moments.map((m) => (m.id === 'v9' ? { ...m, videoUri: 'file:///v9.mov' } : m)) };
    s = applyRecords(s, [{ ...pulled, seq: 2 }], { v9: 'file:///v9.jpg' });
    assert.equal(s.moments.find((m) => m.id === 'v9')?.videoUri, 'file:///v9.mov');
  });

  it('leave photo moments exactly as before', () => {
    assert.deepEqual(outgoingRecords(baseState()).get('moment:m1')?.data, { photoId: 'p1', caption: 'hi', createdAt: '2026-10-10T10:00:00Z' });
  });
});

describe('love coupons', () => {
  const gift = { emoji: '🍳', text: 'Breakfast in bed', giver: PARTNER, createdAt: '2026-10-30T10:00:00Z', redeemedAt: null };

  it('arrive from the partner and are not echoed back', () => {
    const s = applyRecords(baseState(), [{ kind: 'coupon', id: 'c1', data: gift, author: PARTNER, seq: 1 }]);
    assert.equal(s.coupons[0].from, 'partner');
    assert.equal(s.coupons[0].redeemedAt, undefined);
    assert.ok(!pendingChanges(s, '2026-10-13').some((c) => c.kind === 'coupon'));
  });

  it('go back to the giver once redeemed', () => {
    const s = applyRecords(baseState(), [{ kind: 'coupon', id: 'c1', data: gift, author: PARTNER, seq: 1 }]);
    s.coupons = s.coupons.map((c) => ({ ...c, redeemedAt: '2026-10-30T12:00:00Z' }));
    const change = pendingChanges(s, '2026-10-13').find((c) => c.kind === 'coupon');
    assert.deepEqual(change?.data, { ...gift, redeemedAt: '2026-10-30T12:00:00Z' });
  });
});

describe('mood days for the streak', () => {
  it('travel with the mood so a missed sync still counts the day', () => {
    const s = baseState();
    s.moodDays = { me: ['2026-10-12', '2026-10-13'] };
    assert.deepEqual((outgoingRecords(s, '2026-10-13').get(`mood:${ME}`)?.data as any).days, ['2026-10-12', '2026-10-13']);

    const data = { emoji: '😌', label: 'Calm', at: new Date(2026, 9, 13, 9).toISOString(), days: ['2026-10-11', '2026-10-12'] };
    const next = applyRecords(s, [{ kind: 'mood', id: PARTNER, data, author: PARTNER, seq: 1 }]);
    assert.deepEqual(next.moodDays?.partner, ['2026-10-11', '2026-10-12', '2026-10-13']);
  });
});

describe('this or that', () => {
  it('sends only my side and fills in the partner\'s', () => {
    const s = baseState();
    s.picks = { 'coffee-tea': { me: 'a', partner: 'b' }, 'cats-dogs': { partner: 'a' } };
    const out = outgoingRecords(s, '2026-10-13');
    assert.deepEqual(out.get(`pick:${ME}:coffee-tea`)?.data, { pair: 'coffee-tea', choice: 'a' });
    assert.ok(![...out.keys()].some((k) => k.includes('cats-dogs')), 'the partner\'s picks are theirs to send');

    const next = applyRecords(s, [
      { kind: 'pick', id: `${PARTNER}:beach-mountains`, data: { pair: 'beach-mountains', choice: 'b' }, author: PARTNER, seq: 1 },
      { kind: 'pick', id: `${PARTNER}:coffee-tea`, data: null, deleted: true, author: PARTNER, seq: 2 },
    ]);
    assert.deepEqual(next.picks['beach-mountains'], { partner: 'b' });
    assert.deepEqual(next.picks['coffee-tea'], { me: 'a' });
  });
});

describe('open when letters', () => {
  const letter = { when: 'Open when you miss me', text: 'Look up, I am too.', writer: PARTNER, createdAt: '2026-10-30T10:00:00Z', openedAt: null };

  it('arrive sealed and go back to the writer once opened', () => {
    const s = applyRecords(baseState(), [{ kind: 'letter', id: 'l1', data: letter, author: PARTNER, seq: 1 }]);
    assert.equal(s.letters[0].from, 'partner');
    assert.equal(s.letters[0].openedAt, undefined);
    assert.ok(!pendingChanges(s, '2026-10-13').some((c) => c.kind === 'letter'), 'not echoed back');

    s.letters = s.letters.map((l) => ({ ...l, openedAt: '2026-10-30T12:00:00Z' }));
    const change = pendingChanges(s, '2026-10-13').find((c) => c.kind === 'letter');
    assert.deepEqual(change?.data, { ...letter, openedAt: '2026-10-30T12:00:00Z' });
  });

  it('are sent with me as the writer and taken back with a deletion', () => {
    const s = baseState();
    s.letters = [{ id: 'l2', when: 'Open on your birthday', text: 'Happy birthday!', from: 'me', createdAt: '2026-10-30T09:00:00Z' }];
    const out = outgoingRecords(s, '2026-10-13').get('letter:l2');
    assert.deepEqual(out?.data, { when: 'Open on your birthday', text: 'Happy birthday!', writer: ME, createdAt: '2026-10-30T09:00:00Z', openedAt: null });

    s.sync!.pushed['letter:l2'] = fingerprint(out!.data);
    s.letters = [];
    assert.deepEqual(pendingChanges(s, '2026-10-13').filter((c) => c.kind === 'letter'), [{ kind: 'letter', id: 'l2', deleted: true }]);
  });
});

describe('next date', () => {
  it('is shared both ways without echoing, and clears on both phones', () => {
    const plan = { date: '2026-11-07', label: 'Dinner at Luigi\'s' };
    const s = baseState();
    s.nextDate = plan;
    assert.deepEqual(outgoingRecords(s, '2026-10-13').get('couple:next')?.data, plan);

    let theirs = applyRecords(baseState(), [{ kind: 'couple', id: 'next', data: plan, author: PARTNER, seq: 1 }]);
    assert.deepEqual(theirs.nextDate, plan);
    assert.equal(theirs.togetherSince, '2025-02-14', 'the anniversary is left alone');
    assert.ok(!pendingChanges(theirs, '2026-10-13').some((c) => c.id === 'next'));

    theirs = applyRecords(theirs, [{ kind: 'couple', id: 'next', data: null, deleted: true, author: PARTNER, seq: 2 }]);
    assert.equal(theirs.nextDate, undefined);
    assert.ok(!pendingChanges(theirs, '2026-10-13').some((c) => c.id === 'next'));
  });
});

describe('restoring on a new phone', () => {
  it('takes back my own records without sending them again', () => {
    const fresh = { ...baseState(), names: { me: 'Alex', partner: 'Sam' }, moments: [], notes: [], answers: {}, moods: {}, dateIdeas: [] };
    const mine = (kind: string, id: string, data: unknown): PulledRecord => ({ kind, id, data, author: ME, seq: 1 });
    const s = applyRecords(
      fresh,
      [
        mine('note', 'n1', { text: 'Love you', createdAt: '2026-10-12T09:00:00Z' }),
        mine('moment', 'm1', { photoId: 'p1', caption: 'hi', createdAt: '2026-10-10T10:00:00Z' }),
        mine('answer', `${ME}:2026-10-13`, { date: '2026-10-13', text: 'Voice notes' }),
        mine('mood', ME, { emoji: '🥰', label: 'Loved', at: '2026-10-13T08:00:00Z', days: ['2026-10-13'] }),
      ],
      { m1: 'file:///new-phone/m1.jpg' },
      true,
    );
    assert.equal(s.notes[0].from, 'me');
    assert.equal(s.moments[0].from, 'me');
    assert.equal(s.moments[0].uri, 'file:///new-phone/m1.jpg');
    assert.equal(s.answers['2026-10-13'].me, 'Voice notes');
    assert.equal(s.moods.me?.label, 'Loved');
    const resent = pendingChanges(s, '2026-10-13').map((c) => c.kind);
    assert.ok(!resent.some((k) => ['note', 'moment', 'answer', 'mood'].includes(k)), `resent ${resent}`);
  });

  it('backs up only what never leaves the phone otherwise', () => {
    const backup = backupOf(baseState());
    assert.deepEqual(Object.keys(backup).sort(), ['appearance', 'cycle', 'font', 'names', 'togetherSince']);
    assert.equal(backup.cycle.logs['2026-10-02'].note, 'private');
  });
});

describe('server addresses', () => {
  it('only trusts plain http inside the tailnet', () => {
    assert.equal(isPrivateHttp('http://100.101.102.103:8787'), true);
    assert.equal(isPrivateHttp('http://my-server:8787'), true);
    assert.equal(isPrivateHttp('http://my-server.tail1234.ts.net:8787'), true);
    assert.equal(isPrivateHttp('https://example.com'), true, 'https is always fine');
    assert.equal(isPrivateHttp('http://192.168.1.20:8787'), false);
    assert.equal(isPrivateHttp('http://100.200.1.1:8787'), false);
    assert.equal(isPrivateHttp('http://example.com:8787'), false);
  });
});

describe('view-once moments', () => {
  const rec = (kind: string, id: string, data: unknown, author = PARTNER): PulledRecord => ({ kind, id, data, author, seq: 1 });

  it('arrives locked, tells the sender once opened, then drops its photo from the server', () => {
    // Sam sends a view-once photo.
    let mine = baseState();
    mine = applyRecords(mine, [rec('moment', 'v1', { photoId: 'p9', caption: '', createdAt: '2026-10-14T10:00:00Z', viewOnce: true })], { v1: 'file:///v.jpg' });
    const got = mine.moments.find((m) => m.id === 'v1')!;
    assert.equal(got.viewOnce, true);
    assert.equal(got.openedAt, undefined);

    // Alex opens it: a seen record goes out under Alex's own id.
    mine.moments = mine.moments.map((m) => (m.id === 'v1' ? { ...m, uri: '', openedAt: '2026-10-14T12:00:00Z' } : m));
    const seen = outgoingRecords(mine, '2026-10-14').get(`seen:${ME}:v1`);
    assert.deepEqual(seen?.data, { at: '2026-10-14T12:00:00Z' });

    // On Sam's phone the seen record marks the moment opened, and the moment goes back out without its photo.
    let theirs = baseState();
    theirs.moments = [{ id: 'v1', uri: 'file:///v.jpg', caption: '', from: 'me', createdAt: '2026-10-14T10:00:00Z', photoId: 'p9', viewOnce: true }];
    theirs = applyRecords(theirs, [rec('seen', `${PARTNER}:v1`, { at: '2026-10-14T12:00:00Z' })]);
    const out = outgoingRecords(theirs, '2026-10-14').get('moment:v1')!.data as Record<string, unknown>;
    assert.equal(out.photoId, undefined);
    assert.equal(out.openedAt, '2026-10-14T12:00:00Z');

    // That stripped record leaves an "Opened" tile on Alex's phone.
    mine = applyRecords(mine, [rec('moment', 'v1', out)]);
    const tile = mine.moments.find((m) => m.id === 'v1')!;
    assert.equal(tile.uri, '');
    assert.equal(tile.openedAt, '2026-10-14T12:00:00Z');
  });

  it('merges streak restores from both phones', () => {
    let s = baseState();
    s.restores = ['2026-10-03'];
    s = applyRecords(s, [rec('couple', 'restores', { days: ['2026-10-09'] })]);
    assert.deepEqual(s.restores, ['2026-10-03', '2026-10-09']);
    assert.ok(pendingChanges(s, '2026-10-13').some((c) => c.id === 'restores'));
  });
});
