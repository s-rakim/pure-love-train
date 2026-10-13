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
  server = createServer(createApp(openDb(join(dataDir, 'test.db')), dataDir));
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
});
