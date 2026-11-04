import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { generateKeyPairSync, sign } from 'node:crypto';

import { createApp, verifyFirebaseIdToken } from '../src/app.ts';
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
  // Stands in for Firebase: a token "email:<name>" signs in as <name>@mail.com.
  const verifyFirebase = async (idToken: string, projectId: string) => {
    assert.equal(projectId, 'love-project');
    const name = idToken.replace(/^email:/, '');
    return { subject: `uid-${name}`, email: `${name}@mail.com` };
  };
  server = createServer(
    createApp(openDb(join(dataDir, 'test.db')), dataDir, {
      googleClientId: 'web-client',
      verifyGoogle,
      firebaseProjectId: 'love-project',
      verifyFirebase,
      signInAttempts: 1000,
      maxCouples: 1000,
      spacesPerAddressPerDay: 1000,
      requestsPerAddress: 100_000,
      requestsPerPhone: 100_000,
    }),
  );
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

  it('forgets the link on sign out', async () => {
    const restored = (await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:alex' } })).body;
    await call('/api/account/google/unlink', { method: 'POST', token: restored.token, json: {} });
    const again = await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:alex' } });
    assert.equal(again.status, 404);
  });
});

describe('email sign-in', () => {
  it('links an email and restores with it', async () => {
    assert.equal((await call('/api/config')).body.emailSignIn, true);
    const mia = (await call('/api/couples', { method: 'POST', json: { name: 'Mia' } })).body;
    const linked = await call('/api/account/email', { method: 'POST', token: mia.token, json: { idToken: 'email:mia' } });
    assert.equal(linked.body.email, 'mia@mail.com');
    await call('/api/backup', { method: 'POST', token: mia.token, json: { data: { names: { me: 'Mia', partner: '' } } } });

    const restored = await call('/api/account/email/restore', { method: 'POST', json: { idToken: 'email:mia' } });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.memberId, mia.memberId);
    assert.equal(restored.body.provider, 'email');
    assert.equal(restored.body.backup.names.me, 'Mia');
    const viaGoogle = await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:mia' } });
    assert.equal(viaGoogle.status, 404, 'an email account is not a Google one');
  });

  it('checks Firebase tokens against Google keys', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ keys: [jwk] }))) as typeof fetch;
    const token = (claims: Record<string, unknown>, kid = 'k1') => {
      const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
      const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
      return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')}`;
    };
    const t = Math.floor(Date.now() / 1000);
    const good = {
      iss: 'https://securetoken.google.com/p1',
      aud: 'p1',
      sub: 'u1',
      email: 'a@b.c',
      iat: t,
      exp: t + 3600,
      firebase: { sign_in_provider: 'password' },
    };
    try {
      assert.deepEqual(await verifyFirebaseIdToken(token(good), 'p1'), { subject: 'u1', email: 'a@b.c' });
      await assert.rejects(verifyFirebaseIdToken(token(good), 'other-project'));
      await assert.rejects(verifyFirebaseIdToken(token({ ...good, exp: t - 10 }), 'p1'));
      await assert.rejects(verifyFirebaseIdToken(token(good, 'unknown'), 'p1'));
      await assert.rejects(
        verifyFirebaseIdToken(token({ ...good, firebase: { sign_in_provider: 'anonymous' } }), 'p1'),
        'only email and password sign-ins',
      );
      const forged = token(good).split('.');
      forged[1] = Buffer.from(JSON.stringify({ ...good, sub: 'someone-else' })).toString('base64url');
      await assert.rejects(verifyFirebaseIdToken(forged.join('.'), 'p1'));
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('restoring your partner', () => {
  it('gives a one-time code that brings your partner back with their backup', async () => {
    const a = (await call('/api/couples', { method: 'POST', json: { name: 'Malc' } })).body;
    const lonely = await call('/api/partner/restore-code', { method: 'POST', token: a.token, json: {} });
    assert.equal(lonely.status, 404, 'no partner yet');
    const b = (await call('/api/couples/join', { method: 'POST', json: { name: 'Hobi', code: a.pairCode } })).body;
    const backup = { names: { me: 'Hobi', partner: 'Malc' }, cycle: { logs: { '2026-11-01': { flow: 'light' } } } };
    await call('/api/backup', { method: 'POST', token: b.token, json: { data: backup } });

    const made = await call('/api/partner/restore-code', { method: 'POST', token: a.token, json: {} });
    assert.equal(made.status, 201);
    assert.match(made.body.code, /^[A-Z2-9]{8}$/);
    assert.equal(made.body.partner, 'Hobi');

    const typed = `${made.body.code.slice(0, 4).toLowerCase()}-${made.body.code.slice(4)}`;
    const restored = await call('/api/restore/code', { method: 'POST', json: { code: typed } });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.memberId, b.memberId);
    assert.equal(restored.body.name, 'Hobi');
    assert.deepEqual(restored.body.backup, backup);
    assert.equal(restored.body.partner.name, 'Malc');
    assert.equal((await call('/api/me', { token: restored.body.token })).status, 200);

    const old = await call('/api/me', { token: b.token });
    assert.equal(old.status, 401, 'the old phone is signed out');
    assert.match(old.body.error, /Your partner signed you in on another phone/, 'and told why');
    const wipe = await call('/api/leave', { method: 'POST', token: restored.body.token, json: {} });
    assert.equal(wipe.status, 403, 'a phone signed in by the partner cannot delete everything straight away');

    const again = await call('/api/restore/code', { method: 'POST', json: { code: made.body.code } });
    assert.equal(again.status, 404, 'a code works once');
    const nonsense = await call('/api/restore/code', { method: 'POST', json: { code: 'AAAAAAAA' } });
    assert.equal(nonsense.status, 404);
  });

  it('works both ways and replaces older codes', async () => {
    const a = (await call('/api/couples', { method: 'POST', json: { name: 'One' } })).body;
    const b = (await call('/api/couples/join', { method: 'POST', json: { name: 'Two', code: a.pairCode } })).body;
    const first = (await call('/api/partner/restore-code', { method: 'POST', token: b.token, json: {} })).body.code;
    const second = (await call('/api/partner/restore-code', { method: 'POST', token: b.token, json: {} })).body.code;
    assert.equal((await call('/api/restore/code', { method: 'POST', json: { code: first } })).status, 404);
    const restored = (await call('/api/restore/code', { method: 'POST', json: { code: second } })).body;
    assert.equal(restored.memberId, a.memberId);
  });

  it('is not offered for a partner who has their own sign-in', async () => {
    const a = (await call('/api/couples', { method: 'POST', json: { name: 'Kai' } })).body;
    const b = (await call('/api/couples/join', { method: 'POST', json: { name: 'Lou', code: a.pairCode } })).body;
    await call('/api/account/google', { method: 'POST', token: b.token, json: { idToken: 'google:lou' } });
    const made = await call('/api/partner/restore-code', { method: 'POST', token: a.token, json: {} });
    assert.equal(made.status, 409);
    assert.equal((await call('/api/me', { token: b.token })).status, 200);
  });
});

describe('cutting off phones and deleting data', () => {
  async function pair() {
    const a = (await call('/api/couples', { method: 'POST', json: { name: 'Ana' } })).body;
    const b = (await call('/api/couples/join', { method: 'POST', json: { name: 'Ben', code: a.pairCode } })).body;
    return { a, b };
  }

  it('signs a phone out, or every other phone', async () => {
    const { a } = await pair();
    assert.equal((await call('/api/logout', { method: 'POST', token: a.token, json: {} })).status, 200);
    assert.equal((await call('/api/me', { token: a.token })).status, 401, 'a signed-out token stops working');

    const alex = (await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:carol' } })).status;
    assert.equal(alex, 404);
    const { b } = await pair();
    await call('/api/account/google', { method: 'POST', token: b.token, json: { idToken: 'google:ben' } });
    const second = (await call('/api/account/google/restore', { method: 'POST', json: { idToken: 'google:ben' } })).body;
    const out = await call('/api/logout/others', { method: 'POST', token: second.token, json: {} });
    assert.equal(out.body.signedOut, 1);
    assert.equal((await call('/api/me', { token: b.token })).status, 401, 'the old phone is signed out');
    assert.equal((await call('/api/me', { token: second.token })).status, 200);
  });

  it('deletes a moment’s photo when the moment is deleted', async () => {
    const { a, b } = await pair();
    const photo = (await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'image/jpeg' }, body: new Uint8Array([1, 2]) })).body;
    const moment = { kind: 'moment', id: 'm1', data: { photoId: photo.photoId, caption: '', createdAt: '2026-10-30' } };
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [moment] } });
    assert.equal((await call(`/api/photos/${photo.photoId}`, { token: b.token })).status, 200);
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'moment', id: 'm1', deleted: true }] } });
    assert.equal((await call(`/api/photos/${photo.photoId}`, { token: b.token })).status, 404);
  });

  it('removes everything of a member who leaves, and the space with the last one', async () => {
    const { a, b } = await pair();
    const photo = (await call('/api/photos', { method: 'POST', token: a.token, headers: { 'content-type': 'image/jpeg' }, body: new Uint8Array([1]) })).body;
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'note', id: 'n9', data: { text: 'bye' } }] } });
    const cursor = (await call('/api/sync?since=0', { token: b.token })).body.cursor;

    assert.equal((await call('/api/leave', { method: 'POST', token: a.token, json: {} })).status, 200);
    assert.equal((await call('/api/me', { token: a.token })).status, 401);
    const seen = (await call(`/api/sync?since=${cursor}`, { token: b.token })).body;
    assert.deepEqual(seen.records.map((r: any) => [r.id, r.deleted]), [['n9', true]], 'the partner sees the notes go');
    assert.equal(seen.partner, null);
    assert.equal((await call(`/api/photos/${photo.photoId}`, { token: b.token })).status, 404);

    assert.equal((await call('/api/leave', { method: 'POST', token: b.token, json: {} })).status, 200);
    assert.equal((await call('/api/me', { token: b.token })).status, 401);
  });

  it('keeps records to their owner and letters to their writer', async () => {
    const { a, b } = await pair();
    const squat = await call('/api/sync', {
      method: 'POST',
      token: b.token,
      json: { records: [{ kind: 'profile', id: a.memberId, data: { name: 'x' } }, { kind: 'answer', id: `${a.memberId}:2026-10-30`, data: {} }] },
    });
    assert.deepEqual(squat.body.results.map((r: any) => r.ok), [false, false]);

    const letter = { when: 'Open when sad', text: 'Hug.', writer: a.memberId, createdAt: '2026-10-30', openedAt: null };
    await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'letter', id: 'l9', data: letter }] } });
    const rewrite = await call('/api/sync', { method: 'POST', token: b.token, json: { records: [{ kind: 'letter', id: 'l9', data: { ...letter, text: 'Nope.' } }] } });
    assert.equal(rewrite.body.results[0].ok, false, 'the reader cannot change the words');
    const forged = await call('/api/sync', { method: 'POST', token: b.token, json: { records: [{ kind: 'letter', id: 'l10', data: letter }] } });
    assert.equal(forged.body.results[0].ok, false, 'nobody writes a letter in the other’s name');
    const removed = await call('/api/sync', { method: 'POST', token: b.token, json: { records: [{ kind: 'letter', id: 'l9', deleted: true }] } });
    assert.equal(removed.body.results[0].ok, false, 'only the writer takes a letter back');
    const takenBack = await call('/api/sync', { method: 'POST', token: a.token, json: { records: [{ kind: 'letter', id: 'l9', deleted: true }] } });
    assert.equal(takenBack.body.results[0].ok, true);
  });
});

describe('limits', () => {
  let small: Server;
  let url: string;
  let dir: string;
  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'pure-love-limits-'));
    small = createServer(
      createApp(openDb(join(dir, 'test.db')), dir, { maxCouples: 3, storageLimitBytes: 10, spacesPerAddressPerDay: 2, requestsPerPhone: 5 }),
    );
    await new Promise<void>((resolve) => small.listen(0, resolve));
    url = `http://127.0.0.1:${(small.address() as AddressInfo).port}`;
  });
  after(() => {
    small.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const post = (path: string, body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
    fetch(url + path, { method: 'POST', headers, body: (body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit });

  it('caps the number of spaces and the room each one has', async () => {
    const first = await (await post('/api/couples', { name: 'A' })).json();
    assert.equal((await post('/api/couples', { name: 'B' })).status, 201);
    assert.equal((await post('/api/couples', { name: 'C' })).status, 429, 'one address starts only so many spaces a day');
    const bytes = new Uint8Array(20);
    const big = await post('/api/photos', bytes, { authorization: `Bearer ${first.token}`, 'content-type': 'image/jpeg' });
    assert.equal(big.status, 507);
    // Sent in pieces with no length up front, it is still measured.
    const chunked = new ReadableStream({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
    const sneaky = await fetch(url + '/api/photos', {
      method: 'POST',
      headers: { authorization: `Bearer ${first.token}`, 'content-type': 'image/jpeg' },
      body: chunked,
      duplex: 'half',
    } as RequestInit);
    assert.equal(sneaky.status, 507);

    let status = 0;
    for (let i = 0; i < 6 && status !== 429; i++) {
      status = (await fetch(url + '/api/me', { headers: { authorization: `Bearer ${first.token}` } })).status;
    }
    assert.equal(status, 429, 'one phone sending too much is slowed down');
  });

  it('stops guessing pairing codes', async () => {
    let status = 0;
    for (let i = 0; i < 15 && status !== 429; i++) {
      status = (await post('/api/couples/join', { name: 'Eve', code: 'AAAAAA' })).status;
    }
    assert.equal(status, 429);
  });
});

describe('daily content', () => {
  it('has two years of questions and date ideas, none repeated', async () => {
    const { QUESTIONS, DATE_IDEAS } = await import('../src/content.ts');
    assert.ok(QUESTIONS.length >= 730, `only ${QUESTIONS.length} questions`);
    assert.equal(new Set(QUESTIONS.map((q) => q.toLowerCase())).size, QUESTIONS.length, 'a question repeats');
    assert.ok(DATE_IDEAS.length >= 156, 'needs 3 ideas a fortnight for two years');
    assert.equal(new Set(DATE_IDEAS.map((q) => q.toLowerCase())).size, DATE_IDEAS.length, 'a date idea repeats');
  });

  it('gives both partners the same question, a new one each day', async () => {
    const alex = (await call('/api/couples', { method: 'POST', json: { name: 'Alex' } })).body;
    const sam = (await call('/api/couples/join', { method: 'POST', json: { name: 'Sam', code: alex.pairCode } })).body;
    const today = new Date().toISOString().slice(0, 10);
    const first = await call(`/api/content?date=${today}`, { token: alex.token });
    assert.equal(first.status, 200);
    assert.equal(first.body.question.number, 1);
    assert.equal(first.body.dateIdeas.length, 3);
    const partner = await call(`/api/content?date=${today}`, { token: sam.token });
    assert.deepEqual(partner.body, first.body);

    const later = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
    const next = await call(`/api/content?date=${later}`, { token: alex.token });
    assert.equal(next.body.question.number, 16);
    assert.notEqual(next.body.question.text, first.body.question.text);
    assert.notDeepEqual(next.body.dateIdeas, first.body.dateIdeas, 'ideas change each fortnight');

    assert.equal((await call('/api/content?date=nope', { token: alex.token })).status, 400);
    assert.equal((await call('/api/content')).status, 401);
  });

  it('lets each partner mark a view-once moment as seen, only under their own id', async () => {
    const alex = (await call('/api/couples', { method: 'POST', json: { name: 'Alex' } })).body;
    const sam = (await call('/api/couples/join', { method: 'POST', json: { name: 'Sam', code: alex.pairCode } })).body;
    const mine = await call('/api/sync', { method: 'POST', token: sam.token, json: { records: [{ kind: 'seen', id: `${sam.memberId}:m1`, data: { at: 'x' } }] } });
    assert.equal(mine.body.results[0].ok, true);
    const theirs = await call('/api/sync', { method: 'POST', token: sam.token, json: { records: [{ kind: 'seen', id: `${alex.memberId}:m1`, data: { at: 'x' } }] } });
    assert.equal(theirs.body.results[0].ok, false);
  });
});
