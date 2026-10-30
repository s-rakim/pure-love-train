import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';

let server: Server;
let base: string;
let dataDir: string;

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'pure-love-'));
  // Stands in for Google: a token "google:<name>" signs in as <name>@gmail.com.
  const verifyGoogle = async (idToken: string, clientId: string) => {
    assert.equal(clientId, 'web-client');
    const name = idToken.replace(/^google:/, '');
    return { subject: `sub-${name}`, email: `${name}@gmail.com` };
  };
  server = createServer(createApp(openDb(join(dataDir, 'test.db')), dataDir, { googleClientId: 'web-client', verifyGoogle }));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(path: string, init: RequestInit & { token?: string; json?: unknown } = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(base + path, { ...init, headers, body });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
}

describe('pairing and sync', () => {
  let a: any;
  let b: any;

  it('creates a space and lets the partner join once', async () => {
    const created = await call('/api/couples', { method: 'POST', json: { name: 'Alex' } });
    assert.equal(created.status, 201);
    a = created.body;
    assert.match(a.pairCode, /^[A-Z2-9]{6}$/);

    const joined = await call('/api/couples/join', { method: 'POST', json: { name: 'Sam', code: a.pairCode.toLowerCase() } });
    assert.equal(joined.status, 201);
    b = joined.body;
    assert.equal(b.partner.name, 'Alex');

    const again = await call('/api/couples/join', { method: 'POST', json: { name: 'Eve', code: a.pairCode } });
    assert.equal(again.status, 404, 'the code is single use');

    const me = await call('/api/me', { token: a.token });
    assert.equal(me.body.partner.name, 'Sam');
    assert.equal(me.body.pairCode, null);
  });

  it('rejects requests without a valid token', async () => {
    assert.equal((await call('/api/sync')).status, 401);
    assert.equal((await call('/api/sync', { token: 'nope' })).status, 401);
  });

  it('delivers records to the partner after a cursor', async () => {
    const pushed = await call('/api/sync', {
      method: 'POST',
      token: a.token,
      json: {
        records: [
          { kind: 'mood', id: a.memberId, data: { emoji: '🥰', label: 'Loved' } },
          { kind: 'note', id: 'n1', data: { text: 'hi' } },
          { kind: 'bogus', id: 'x', data: {} },
        ],
      },
    });
    assert.deepEqual(pushed.body.results.map((r: any) => r.ok), [true, true, false]);

    const pulled = await call('/api/sync?since=0', { token: b.token });
    assert.equal(pulled.body.records.length, 2);
    assert.equal(pulled.body.records[0].author, a.memberId);
    const cursor = pulled.body.cursor;

    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'note', id: 'n1', deleted: true }] } });
    const next = await call(`/api/sync?since=${cursor}`, { token: b.token });
    assert.equal(next.body.records.length, 1);
    assert.equal(next.body.records[0].deleted, true);
  });

  it('stops a partner from overwriting records they do not own', async () => {
    const res = await call('/api/sync', {
      method: 'POST',
      token: b.token,
      json: { records: [{ kind: 'mood', id: a.memberId, data: { emoji: '😤' } }, { kind: 'dateIdea', id: 'd1', data: { text: 'picnic' } }] },
    });
    assert.deepEqual(res.body.results.map((r: any) => r.ok), [false, true]);
    const edit = await call('/api/sync', {
      method: 'POST',
      token: a.token,
      json: { records: [{ kind: 'dateIdea', id: 'd1', data: { text: 'picnic', done: true } }] },
    });
    assert.equal(edit.body.results[0].ok, true, 'shared records can be edited by either partner');

    const gift = { emoji: '🍳', text: 'Breakfast in bed', giver: a.memberId, createdAt: '2026-10-30T10:00:00Z', redeemedAt: null };
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'coupon', id: 'c1', data: gift }] } });
    const redeemed = await call('/api/sync', {
      method: 'POST',
      token: b.token,
      json: { records: [{ kind: 'coupon', id: 'c1', data: { ...gift, redeemedAt: '2026-10-30T12:00:00Z' } }] },
    });
    assert.equal(redeemed.body.results[0].ok, true, 'the partner can redeem a coupon they were given');

    const letter = { when: 'Open when you miss me', text: 'Look up.', writer: a.memberId, createdAt: '2026-10-30T10:00:00Z', openedAt: null };
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'letter', id: 'l1', data: letter }] } });
    const opened = await call('/api/sync', {
      method: 'POST',
      token: b.token,
      json: { records: [{ kind: 'letter', id: 'l1', data: { ...letter, openedAt: '2026-10-30T12:00:00Z' } }] },
    });
    assert.equal(opened.body.results[0].ok, true, 'the reader can mark a letter opened');

    const pick = { kind: 'pick', id: `${a.memberId}:coffee-tea`, data: { pair: 'coffee-tea', choice: 'a' } };
    assert.equal((await call('/api/sync', { method: 'POST', token: a.token, json: { records: [pick] } })).body.results[0].ok, true);
    const changed = await call('/api/sync', { method: 'POST', token: b.token, json: { records: [{ ...pick, data: { pair: 'coffee-tea', choice: 'b' } }] } });
    assert.equal(changed.body.results[0].ok, false, 'a pick belongs to whoever made it');
  });

  it('stores photos privately for the couple', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const up = await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'image/jpeg' }, body: bytes });
    assert.equal(up.status, 201);
    const down = await call(`/api/photos/${up.body.photoId}`, { token: b.token });
    assert.equal(down.status, 200);
    assert.deepEqual(new Uint8Array(down.body as ArrayBuffer), bytes);

    const outsider = (await call('/api/couples', { method: 'POST', json: { name: 'Eve' } })).body;
    assert.equal((await call(`/api/photos/${up.body.photoId}`, { token: outsider.token })).status, 404);
    const text = await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'text/plain' }, body: 'x' });
    assert.equal(text.status, 415);
  });

  it('stores videos and serves them in pieces for the player', async () => {
    const bytes = new Uint8Array(1000).map((_, i) => i % 251);
    const up = await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'video/mp4' }, body: bytes });
    assert.equal(up.status, 201);
    const url = `/api/photos/${up.body.photoId}`;

    const whole = await fetch(base + url, { headers: { authorization: `Bearer ${b.token}` } });
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get('content-type'), 'video/mp4');
    assert.equal(whole.headers.get('accept-ranges'), 'bytes');
    assert.deepEqual(new Uint8Array(await whole.arrayBuffer()), bytes);

    const piece = await fetch(base + url, { headers: { authorization: `Bearer ${b.token}`, range: 'bytes=100-199' } });
    assert.equal(piece.status, 206);
    assert.equal(piece.headers.get('content-range'), 'bytes 100-199/1000');
    assert.deepEqual(new Uint8Array(await piece.arrayBuffer()), bytes.slice(100, 200));

    const rest = await fetch(base + url, { headers: { authorization: `Bearer ${b.token}`, range: 'bytes=900-' } });
    assert.deepEqual(new Uint8Array(await rest.arrayBuffer()), bytes.slice(900));
    const tail = await fetch(base + url, { headers: { authorization: `Bearer ${b.token}`, range: 'bytes=-10' } });
    assert.deepEqual(new Uint8Array(await tail.arrayBuffer()), bytes.slice(990));

    const past = await fetch(base + url, { headers: { authorization: `Bearer ${b.token}`, range: 'bytes=5000-' } });
    assert.equal(past.status, 416);
    await past.arrayBuffer();

    const empty = await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'video/mp4' }, body: new Uint8Array(0) });
    assert.equal(empty.status, 400);
  });
});

describe('google sign-in and backups', () => {
  it('brings a member back on a new phone', async () => {
    assert.equal((await call('/api/config')).body.googleClientId, 'web-client');
    const alex = (await call('/api/couples', { method: 'POST', json: { name: 'Alex' } })).body;

    const linked = await call('/api/account/google', { method: 'POST', token: alex.token, json: { idToken: 'google:alex' } });
    assert.equal(linked.body.email, 'alex@gmail.com');
    const backup = { names: { me: 'Alex', partner: 'Sam' }, cycle: { logs: { '2026-10-02': { symptoms: ['Cramps'] } } } };
    assert.equal((await call('/api/backup', { method: 'POST', token: alex.token, json: { data: backup } })).status, 200);

    const restored = await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:alex' } });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.memberId, alex.memberId);
    assert.equal(restored.body.name, 'Alex');
    assert.deepEqual(restored.body.backup, backup);
    assert.equal((await call('/api/me', { token: restored.body.token })).status, 200, 'the new phone is signed in');
    assert.equal((await call('/api/me', { token: alex.token })).status, 200, 'the old phone keeps working');
  });

  it('keeps each Google account to one person', async () => {
    const eve = (await call('/api/couples', { method: 'POST', json: { name: 'Eve' } })).body;
    const taken = await call('/api/account/google', { method: 'POST', token: eve.token, json: { idToken: 'google:alex' } });
    assert.equal(taken.status, 409);
    const unknown = await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:nobody' } });
    assert.equal(unknown.status, 404);
  });

  it('forgets the link and the backup on sign out', async () => {
    const restored = (await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:alex' } })).body;
    await call('/api/account/google/unlink', { method: 'POST', token: restored.token, json: {} });
    const again = await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:alex' } });
    assert.equal(again.status, 404);
  });
});
