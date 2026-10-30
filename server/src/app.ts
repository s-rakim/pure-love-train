import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { RecordRow } from './db.ts';

/** Records each partner owns; only their author may change them. */
const OWNED_KINDS = new Set(['profile', 'mood', 'answer', 'note', 'moment', 'cycle']);
/** Records either partner may change; the latest write wins. */
const SHARED_KINDS = new Set(['dateIdea', 'couple', 'coupon']);

const MAX_JSON_BYTES = 1_000_000;
const MAX_PHOTO_BYTES = 15_000_000;
const MAX_RECORD_BYTES = 20_000;
const PAGE_SIZE = 500;

type Member = { id: string; couple_id: string; name: string };

/** Who Google says signed in, after the ID token has been checked. */
export type GoogleIdentity = { subject: string; email: string };

export type AppOptions = {
  /** The OAuth web client ID Google sign-in tokens must be issued for. */
  googleClientId?: string;
  /** Checks a Google ID token; swapped out in tests. */
  verifyGoogle?: (idToken: string, clientId: string) => Promise<GoogleIdentity>;
};

/** Asks Google whether an ID token is genuine and meant for this server's client. */
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
  let res: Response;
  try {
    res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  } catch {
    throw new HttpError(502, "Couldn't reach Google to check the sign-in");
  }
  const info = (await res.json().catch(() => ({}))) as Record<string, string | undefined>;
  const issuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (
    !res.ok ||
    info.aud !== clientId ||
    !issuers.includes(info.iss ?? '') ||
    Number(info.exp ?? 0) * 1000 < Date.now() ||
    !info.sub ||
    !info.email ||
    String(info.email_verified) !== 'true'
  ) {
    throw new HttpError(401, 'Google sign-in could not be verified');
  }
  return { subject: info.sub, email: info.email };
}

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

export function createApp(db: DatabaseSync, dataDir: string, options: AppOptions = {}) {
  const googleClientId = options.googleClientId || null;
  const verifyGoogle = options.verifyGoogle ?? verifyGoogleIdToken;
  const photoDir = join(dataDir, 'photos');
  mkdirSync(photoDir, { recursive: true });

  const findMemberByToken = db.prepare(`
    SELECT id, couple_id, name FROM members WHERE token_hash = ?1
    UNION SELECT m.id, m.couple_id, m.name FROM member_tokens t JOIN members m ON m.id = t.member_id WHERE t.token_hash = ?1
  `);
  const insertToken = db.prepare('INSERT INTO member_tokens (token_hash, member_id, created_at) VALUES (?, ?, ?)');
  const getMember = db.prepare('SELECT id, couple_id, name FROM members WHERE id = ?');
  const findAccount = db.prepare("SELECT member_id, email FROM accounts WHERE provider = 'google' AND subject = ?");
  const deleteAccountsOfMember = db.prepare('DELETE FROM accounts WHERE member_id = ?');
  const insertAccount = db.prepare(
    "INSERT INTO accounts (provider, subject, member_id, email, created_at) VALUES ('google', ?, ?, ?, ?)",
  );
  const getBackup = db.prepare('SELECT data FROM backups WHERE member_id = ?');
  const upsertBackup = db.prepare(`
    INSERT INTO backups (member_id, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (member_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const deleteBackup = db.prepare('DELETE FROM backups WHERE member_id = ?');
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

  async function googleIdentity(req: IncomingMessage): Promise<GoogleIdentity> {
    if (!googleClientId) throw new HttpError(501, 'Google sign-in is not set up on this server');
    const body = await readJson(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) throw new HttpError(400, 'idToken is required');
    return verifyGoogle(idToken, googleClientId);
  }

  /** Links the signed-in member to a Google account (replacing any earlier one). */
  async function linkGoogle(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const identity = await googleIdentity(req);
    const existing = findAccount.get(identity.subject) as { member_id: string } | undefined;
    if (existing && existing.member_id !== member.id) {
      throw new HttpError(409, 'That Google account is already linked to someone else');
    }
    db.exec('BEGIN');
    try {
      deleteAccountsOfMember.run(member.id);
      insertAccount.run(identity.subject, member.id, identity.email, now());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    send(res, 200, { email: identity.email });
  }

  /** On a new phone: signs back in as the linked member and hands back their backup. */
  async function restoreGoogle(req: IncomingMessage, res: ServerResponse) {
    const identity = await googleIdentity(req);
    const account = findAccount.get(identity.subject) as { member_id: string } | undefined;
    const member = account ? (getMember.get(account.member_id) as Member | undefined) : undefined;
    if (!member) {
      throw new HttpError(404, 'Nothing is linked to this Google account yet. Sign in with Google on your old phone first.');
    }
    const token = randomBytes(32).toString('hex');
    insertToken.run(hashToken(token), member.id, now());
    const backup = getBackup.get(member.id) as { data: string } | undefined;
    send(res, 200, {
      token,
      name: member.name,
      email: identity.email,
      backup: backup ? JSON.parse(backup.data) : null,
      ...describe(member),
    });
  }

  function unlinkGoogle(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    deleteAccountsOfMember.run(member.id);
    deleteBackup.run(member.id);
    send(res, 200, { ok: true });
  }

  async function saveBackup(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const body = await readJson(req);
    if (!body.data || typeof body.data !== 'object') throw new HttpError(400, 'data must be an object');
    upsertBackup.run(member.id, JSON.stringify(body.data), now());
    send(res, 200, { ok: true });
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
      if (route === 'GET /api/config') return send(res, 200, { googleClientId });
      if (route === 'POST /api/account/google') return await linkGoogle(req, res);
      if (route === 'POST /api/account/google/restore') return await restoreGoogle(req, res);
      if (route === 'POST /api/account/google/unlink') return unlinkGoogle(req, res);
      if (route === 'POST /api/backup') return await saveBackup(req, res);
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
