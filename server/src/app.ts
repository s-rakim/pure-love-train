import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { RecordRow } from './db.ts';

/** Records each partner owns; only their author may change them. */
const OWNED_KINDS = new Set(['profile', 'mood', 'answer', 'note', 'moment', 'cycle']);
/** Records either partner may change; the latest write wins. */
const SHARED_KINDS = new Set(['dateIdea', 'couple']);

const MAX_JSON_BYTES = 1_000_000;
const MAX_PHOTO_BYTES = 15_000_000;
const MAX_RECORD_BYTES = 20_000;
const PAGE_SIZE = 500;

type Member = { id: string; couple_id: string; name: string };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function makePairCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// The app talks to the server from phones and, during development, from a browser.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function send(res: ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'content-type': 'application/json', 'content-length': Buffer.byteLength(json) });
  res.end(json);
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Request is too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function readJson(req: IncomingMessage): Promise<any> {
  const body = await readBody(req, MAX_JSON_BYTES);
  try {
    return body.length ? JSON.parse(body.toString('utf8')) : {};
  } catch {
    throw new HttpError(400, 'Body must be JSON');
  }
}

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().slice(0, 60) : '';
  if (!name) throw new HttpError(400, 'A name is required');
  return name;
}

export function createApp(db: DatabaseSync, dataDir: string) {
  const photoDir = join(dataDir, 'photos');
  mkdirSync(photoDir, { recursive: true });

  const findMemberByToken = db.prepare('SELECT id, couple_id, name FROM members WHERE token_hash = ?');
  const insertCouple = db.prepare('INSERT INTO couples (id, pair_code, created_at) VALUES (?, ?, ?)');
  const insertMember = db.prepare(
    'INSERT INTO members (id, couple_id, name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const findCoupleByCode = db.prepare('SELECT id FROM couples WHERE pair_code = ?');
  const countMembers = db.prepare('SELECT COUNT(*) AS n FROM members WHERE couple_id = ?');
  const clearPairCode = db.prepare('UPDATE couples SET pair_code = NULL WHERE id = ?');
  const getCouple = db.prepare('SELECT id, pair_code FROM couples WHERE id = ?');
  const getPartner = db.prepare('SELECT id, name FROM members WHERE couple_id = ? AND id != ?');
  const bumpSeq = db.prepare('UPDATE couples SET seq = seq + 1 WHERE id = ? RETURNING seq');
  const getRecord = db.prepare('SELECT author FROM records WHERE couple_id = ? AND kind = ? AND id = ?');
  const upsertRecord = db.prepare(`
    INSERT INTO records (couple_id, kind, id, author, data, deleted, seq, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (couple_id, kind, id) DO UPDATE SET
      author = excluded.author, data = excluded.data, deleted = excluded.deleted,
      seq = excluded.seq, updated_at = excluded.updated_at
  `);
  const recordsSince = db.prepare(
    'SELECT kind, id, author, data, deleted, seq, updated_at FROM records WHERE couple_id = ? AND seq > ? ORDER BY seq LIMIT ?',
  );
  const insertPhoto = db.prepare(
    'INSERT INTO photos (id, couple_id, member_id, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const getPhoto = db.prepare('SELECT id, couple_id, mime, size FROM photos WHERE id = ?');

  function authenticate(req: IncomingMessage): Member {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const member = token ? (findMemberByToken.get(hashToken(token)) as Member | undefined) : undefined;
    if (!member) throw new HttpError(401, 'Not signed in');
    return member;
  }

  function newMember(coupleId: string, name: string) {
    const token = randomBytes(32).toString('hex');
    const id = randomUUID();
    insertMember.run(id, coupleId, name, hashToken(token), now());
    return { id, token };
  }

  function describe(member: Member) {
    const couple = getCouple.get(member.couple_id) as { id: string; pair_code: string | null };
    const partner = getPartner.get(member.couple_id, member.id) as { id: string; name: string } | undefined;
    return {
      coupleId: couple.id,
      memberId: member.id,
      pairCode: couple.pair_code,
      partner: partner ? { id: partner.id, name: partner.name } : null,
    };
  }

  /** Starts a new space for two and returns the code the partner types in. */
  async function createCouple(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req);
    const name = cleanName(body.name);
    const coupleId = randomUUID();
    let code = makePairCode();
    while (findCoupleByCode.get(code)) code = makePairCode();
    insertCouple.run(coupleId, code, now());
    const member = newMember(coupleId, name);
    send(res, 201, { token: member.token, coupleId, memberId: member.id, pairCode: code, partner: null });
  }

  async function joinCouple(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req);
    const name = cleanName(body.name);
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const couple = code ? (findCoupleByCode.get(code) as { id: string } | undefined) : undefined;
    if (!couple) throw new HttpError(404, 'That code was not found');
    const { n } = countMembers.get(couple.id) as { n: number };
    if (n >= 2) throw new HttpError(409, 'This space already has two people');
    const member = newMember(couple.id, name);
    clearPairCode.run(couple.id);
    send(res, 201, { token: member.token, ...describe({ id: member.id, couple_id: couple.id, name }) });
  }

  function getSync(req: IncomingMessage, res: ServerResponse, url: URL) {
    const member = authenticate(req);
    const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
    const rows = recordsSince.all(member.couple_id, since, PAGE_SIZE) as RecordRow[];
    const records = rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      author: r.author,
      data: r.data ? JSON.parse(r.data) : null,
      deleted: r.deleted === 1,
      seq: r.seq,
      updatedAt: r.updated_at,
    }));
    const cursor = rows.length ? rows[rows.length - 1].seq : since;
    send(res, 200, { ...describe(member), records, cursor, more: rows.length === PAGE_SIZE });
  }

  async function postSync(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const body = await readJson(req);
    if (!Array.isArray(body.records)) throw new HttpError(400, 'records must be a list');

    const results: { kind: string; id: string; ok: boolean; seq?: number; error?: string }[] = [];
    db.exec('BEGIN');
    try {
      for (const r of body.records) {
        const kind = String(r?.kind ?? '');
        const id = String(r?.id ?? '').slice(0, 120);
        if (!id || (!OWNED_KINDS.has(kind) && !SHARED_KINDS.has(kind))) {
          results.push({ kind, id, ok: false, error: 'Unknown record' });
          continue;
        }
        const existing = getRecord.get(member.couple_id, kind, id) as { author: string } | undefined;
        if (existing && OWNED_KINDS.has(kind) && existing.author !== member.id) {
          results.push({ kind, id, ok: false, error: 'Belongs to your partner' });
          continue;
        }
        const deleted = r.deleted === true;
        const data = deleted ? null : JSON.stringify(r.data ?? null);
        if (data && data.length > MAX_RECORD_BYTES) {
          results.push({ kind, id, ok: false, error: 'Record is too large' });
          continue;
        }
        const { seq } = bumpSeq.get(member.couple_id) as { seq: number };
        upsertRecord.run(member.couple_id, kind, id, member.id, data, deleted ? 1 : 0, seq, now());
        results.push({ kind, id, ok: true, seq });
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    send(res, 200, { results });
  }

  async function uploadPhoto(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(mime)) throw new HttpError(415, 'Only images are accepted');
    const bytes = await readBody(req, MAX_PHOTO_BYTES);
    if (!bytes.length) throw new HttpError(400, 'The photo is empty');
    const id = randomUUID();
    writeFileSync(join(photoDir, id), bytes);
    insertPhoto.run(id, member.couple_id, member.id, mime, bytes.length, now());
    send(res, 201, { photoId: id });
  }

  function downloadPhoto(req: IncomingMessage, res: ServerResponse, id: string) {
    const member = authenticate(req);
    const photo = getPhoto.get(id) as { id: string; couple_id: string; mime: string; size: number } | undefined;
    if (!photo || photo.couple_id !== member.couple_id) throw new HttpError(404, 'Photo not found');
    const path = join(photoDir, photo.id);
    res.writeHead(200, {
      ...CORS,
      'content-type': photo.mime,
      'content-length': statSync(path).size,
      'cache-control': 'private, max-age=31536000, immutable',
    });
    createReadStream(path).pipe(res);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://local');
    const route = `${req.method} ${url.pathname}`;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      return res.end();
    }
    try {
      if (route === 'GET /health') return send(res, 200, { ok: true });
      if (route === 'POST /api/couples') return await createCouple(req, res);
      if (route === 'POST /api/couples/join') return await joinCouple(req, res);
      if (route === 'GET /api/me') return send(res, 200, describe(authenticate(req)));
      if (route === 'GET /api/sync') return getSync(req, res, url);
      if (route === 'POST /api/sync') return await postSync(req, res);
      if (route === 'POST /api/photos') return await uploadPhoto(req, res);
      const photo = url.pathname.match(/^\/api\/photos\/([0-9a-f-]{36})$/);
      if (req.method === 'GET' && photo) return downloadPhoto(req, res, photo[1]);
      throw new HttpError(404, 'Not found');
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'Something went wrong' });
      else res.destroy();
    }
  };
}
