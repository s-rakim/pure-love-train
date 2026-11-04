import { createHash, createPublicKey, randomBytes, randomUUID, verify, type JsonWebKey } from 'node:crypto';
import { createReadStream, createWriteStream, mkdirSync, rmSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';

import { contentFor } from './content.ts';
import type { RecordRow } from './db.ts';

/** Records each partner owns; only their author may change them. */
const OWNED_KINDS = new Set(['profile', 'mood', 'answer', 'note', 'moment', 'cycle', 'pick', 'seen']);
/** Records either partner may change; the latest write wins. */
const SHARED_KINDS = new Set(['dateIdea', 'couple', 'coupon', 'letter']);

const MAX_JSON_BYTES = 1_000_000;
const MAX_PHOTO_BYTES = 15_000_000;
const MAX_VIDEO_BYTES = 105_000_000;
const PHOTO_TYPES = /^image\/(jpeg|png|webp|heic|heif|gif)$/;
const VIDEO_TYPES = /^video\/(mp4|quicktime|3gpp|webm)$/;
const MAX_RECORD_BYTES = 20_000;
const PAGE_SIZE = 500;
/** A pairing code that nobody has used for this long is swapped for a new one. */
const PAIR_CODE_MS = 24 * 60 * 60_000;
/** A phone that hasn't been heard from for this long has to sign in again. */
const TOKEN_IDLE_MS = 180 * 24 * 60 * 60_000;
/** How long a restore code from your partner works for. */
const RESTORE_CODE_MS = 30 * 60_000;
/** A phone your partner signed in for you can't delete your things for this long. */
const PARTNER_RESTORE_HOLD_MS = 7 * 24 * 60 * 60_000;
/** How long a cut-off phone is still told why it was signed out. */
const REVOKED_KEEP_MS = 30 * 24 * 60 * 60_000;
/** Owned records whose id is the author's member id, and those whose id starts with it. */
const ID_IS_MEMBER = new Set(['profile', 'mood', 'cycle']);
const ID_STARTS_WITH_MEMBER = new Set(['answer', 'pick', 'seen']);
/** Shared records with a writer: the other partner may only change these fields. */
const WRITER_FIELD: Record<string, { writer: string; partnerMay: string }> = {
  coupon: { writer: 'giver', partnerMay: 'redeemedAt' },
  letter: { writer: 'writer', partnerMay: 'openedAt' },
};

type Member = { id: string; couple_id: string; name: string };

/** Who Google (or Firebase) says signed in, after the ID token has been checked. */
export type GoogleIdentity = { subject: string; email: string };

/** How someone can sign in again on a new phone. */
type Provider = 'google' | 'email';

export type AppOptions = {
  /** The OAuth web client ID Google sign-in tokens must be issued for. */
  googleClientId?: string;
  /** How many spaces this server will hold. */
  maxCouples?: number;
  /** How many bytes of photos and videos each space may keep. */
  storageLimitBytes?: number;
  /** Tries a minute from one address at creating, joining or restoring a space. */
  signInAttempts?: number;
  /** Tries a minute from everyone together, so many addresses can't guess codes either. */
  signInAttemptsTotal?: number;
  /** Behind a reverse proxy (like Caddy): take the caller's address from X-Forwarded-For. */
  trustProxy?: boolean;
  /** Checks a Google ID token; swapped out in tests. */
  verifyGoogle?: (idToken: string, clientId: string) => Promise<GoogleIdentity>;
  /** The Firebase project whose email and password sign-ins this server trusts. */
  firebaseProjectId?: string;
  /** Checks a Firebase ID token; swapped out in tests. */
  verifyFirebase?: (idToken: string, projectId: string) => Promise<GoogleIdentity>;
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

// Firebase signs its ID tokens with Google keys that change every few days.
const FIREBASE_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let firebaseKeys: { keys: (JsonWebKey & { kid?: string })[]; fetchedAt: number } | null = null;

async function firebaseKey(kid: string) {
  const age = firebaseKeys ? Date.now() - firebaseKeys.fetchedAt : Infinity;
  const known = firebaseKeys?.keys.some((k) => k.kid === kid);
  // Fetch hourly, or sooner for a key we haven't seen, but not more than once a minute,
  // so made-up key ids can't make the server hammer Google.
  if (age > 60 * 60_000 || (!known && age > 60_000)) {
    try {
      const res = await fetch(FIREBASE_KEYS);
      if (res.ok) firebaseKeys = { keys: ((await res.json()) as { keys: JsonWebKey[] }).keys, fetchedAt: Date.now() };
    } catch {
      throw new HttpError(502, "Couldn't reach Google to check the sign-in");
    }
  }
  const jwk = firebaseKeys?.keys.find((k) => k.kid === kid);
  return jwk ? createPublicKey({ key: jwk, format: 'jwk' }) : null;
}

/** Checks a Firebase ID token (from email and password sign-in) is genuine and for this project. */
export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<GoogleIdentity> {
  const fail = () => new HttpError(401, 'Email sign-in could not be verified');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw fail();
  let header: { alg?: string; kid?: string };
  let claims: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw fail();
  }
  if (header.alg !== 'RS256' || !header.kid) throw fail();
  const key = await firebaseKey(header.kid);
  if (!key) throw fail();
  const signed = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
  const nowSec = Date.now() / 1000;
  if (
    !signed ||
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    Number(claims.exp ?? 0) < nowSec ||
    Number(claims.iat ?? Infinity) > nowSec + 300 ||
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    typeof claims.email !== 'string' ||
    // Only email and password sign-ins; not anonymous or any other kind Firebase may allow later.
    (claims.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider !== 'password'
  ) {
    throw fail();
  }
  return { subject: claims.sub, email: claims.email };
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

function makePairCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// The app talks to the server from phones and, during development, from a browser.
const CORS = {
  'x-content-type-options': 'nosniff',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, range',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-expose-headers': 'content-range, content-length, accept-ranges',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

function send(res: ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    ...CORS,
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(json),
    // Answers carry sign-in tokens and private backups; nothing in between may keep a copy.
    'cache-control': 'no-store',
  });
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

/** Streams a request body into a file, giving up (and removing the file) past `limit` bytes. */
async function saveBody(req: IncomingMessage, path: string, limit: number): Promise<number> {
  let size = 0;
  try {
    await pipeline(
      req,
      async function* (source: AsyncIterable<Buffer>) {
        for await (const chunk of source) {
          size += chunk.length;
          if (size > limit) throw new HttpError(413, 'That file is too large');
          yield chunk;
        }
      },
      createWriteStream(path),
    );
    return size;
  } catch (err) {
    rmSync(path, { force: true });
    throw err;
  }
}

async function readJson(req: IncomingMessage): Promise<any> {
  const body = await readBody(req, MAX_JSON_BYTES);
  try {
    return body.length ? JSON.parse(body.toString('utf8')) : {};
  } catch {
    throw new HttpError(400, 'Body must be JSON');
  }
}

/** True when the latest write only changes `field` of what's already stored. */
function onlyChanges(before: Record<string, unknown>, after: unknown, field: string): boolean {
  if (!after || typeof after !== 'object') return false;
  const next = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(next)]);
  keys.delete(field);
  return [...keys].every((k) => JSON.stringify(before[k] ?? null) === JSON.stringify(next[k] ?? null));
}

/** The photo and video ids a moment record points at. */
function mediaOf(data: string | null): string[] {
  if (!data) return [];
  const parsed = JSON.parse(data) as { photoId?: unknown; videoId?: unknown } | null;
  return [parsed?.photoId, parsed?.videoId].filter((id): id is string => typeof id === 'string');
}

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().slice(0, 60) : '';
  if (!name) throw new HttpError(400, 'A name is required');
  return name;
}

export function createApp(db: DatabaseSync, dataDir: string, options: AppOptions = {}) {
  const googleClientId = options.googleClientId || null;
  const verifyGoogle = options.verifyGoogle ?? verifyGoogleIdToken;
  const firebaseProjectId = options.firebaseProjectId || null;
  const verifyFirebase = options.verifyFirebase ?? verifyFirebaseIdToken;
  const maxCouples = options.maxCouples ?? 10;
  const storageLimit = options.storageLimitBytes ?? 5_000_000_000;
  const signInAttempts = options.signInAttempts ?? 10;
  const signInAttemptsTotal = options.signInAttemptsTotal ?? Math.max(signInAttempts, 300);
  const trustProxy = options.trustProxy ?? false;
  const photoDir = join(dataDir, 'photos');
  mkdirSync(photoDir, { recursive: true });

  const findMemberByToken = db.prepare(`
    SELECT m.id, m.couple_id, m.name, t.last_used_at, t.via, t.created_at FROM member_tokens t
    JOIN members m ON m.id = t.member_id WHERE t.token_hash = ?
  `);
  const otherTokensOf = db.prepare('SELECT token_hash FROM member_tokens WHERE member_id = ? AND token_hash != ?');
  const insertRevoked = db.prepare('INSERT OR REPLACE INTO revoked_tokens (token_hash, reason, revoked_at) VALUES (?, ?, ?)');
  const findRevoked = db.prepare('SELECT reason FROM revoked_tokens WHERE token_hash = ?');
  const deleteOldRevoked = db.prepare('DELETE FROM revoked_tokens WHERE revoked_at < ?');
  const touchToken = db.prepare('UPDATE member_tokens SET last_used_at = ? WHERE token_hash = ?');
  const deleteToken = db.prepare('DELETE FROM member_tokens WHERE token_hash = ?');
  const deleteOtherTokens = db.prepare('DELETE FROM member_tokens WHERE member_id = ? AND token_hash != ?');
  const deleteIdleTokens = db.prepare('DELETE FROM member_tokens WHERE coalesce(last_used_at, created_at) < ?');
  const insertToken = db.prepare(
    'INSERT INTO member_tokens (token_hash, member_id, created_at, last_used_at, via) VALUES (?, ?, ?, ?, ?)',
  );
  const deleteMember = db.prepare('DELETE FROM members WHERE id = ?');
  const deleteCouple = db.prepare('DELETE FROM couples WHERE id = ?');
  const countCouples = db.prepare('SELECT COUNT(*) AS n FROM couples');
  const getMember = db.prepare('SELECT id, couple_id, name FROM members WHERE id = ?');
  const findAccount = db.prepare('SELECT member_id, email FROM accounts WHERE provider = ? AND subject = ?');
  const accountOfMember = db.prepare('SELECT provider, email FROM accounts WHERE member_id = ?');
  const deleteAccountsOfMember = db.prepare('DELETE FROM accounts WHERE member_id = ?');
  const insertAccount = db.prepare(
    'INSERT INTO accounts (provider, subject, member_id, email, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const insertRestoreCode = db.prepare(
    'INSERT INTO restore_codes (code_hash, member_id, created_by, expires_at) VALUES (?, ?, ?, ?)',
  );
  const deleteRestoreCodesOf = db.prepare('DELETE FROM restore_codes WHERE member_id = ?');
  const takeRestoreCode = db.prepare('DELETE FROM restore_codes WHERE code_hash = ? AND expires_at > ? RETURNING member_id');
  const deleteOldRestoreCodes = db.prepare('DELETE FROM restore_codes WHERE expires_at <= ?');
  const getBackup = db.prepare('SELECT data FROM backups WHERE member_id = ?');
  const upsertBackup = db.prepare(`
    INSERT INTO backups (member_id, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (member_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const insertCouple = db.prepare('INSERT INTO couples (id, pair_code, created_at, pair_code_at) VALUES (?, ?, ?, ?)');
  const insertMember = db.prepare(
    'INSERT INTO members (id, couple_id, name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const findCoupleByCode = db.prepare('SELECT id, pair_code_at FROM couples WHERE pair_code = ?');
  const countMembers = db.prepare('SELECT COUNT(*) AS n FROM members WHERE couple_id = ?');
  const clearPairCode = db.prepare('UPDATE couples SET pair_code = NULL WHERE id = ?');
  const getCouple = db.prepare('SELECT id, pair_code, pair_code_at FROM couples WHERE id = ?');
  const getCoupleStart = db.prepare('SELECT created_at FROM couples WHERE id = ?');
  const setPairCode = db.prepare('UPDATE couples SET pair_code = ?, pair_code_at = ? WHERE id = ?');
  const getPartner = db.prepare('SELECT id, name FROM members WHERE couple_id = ? AND id != ?');
  const bumpSeq = db.prepare('UPDATE couples SET seq = seq + 1 WHERE id = ? RETURNING seq');
  const getRecord = db.prepare('SELECT author, data FROM records WHERE couple_id = ? AND kind = ? AND id = ?');
  const ownedRecordsOf = db.prepare('SELECT kind, id FROM records WHERE couple_id = ? AND author = ? AND deleted = 0');
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
  const getPhoto = db.prepare('SELECT id, couple_id, member_id, mime, size FROM photos WHERE id = ?');
  const deletePhotoRow = db.prepare('DELETE FROM photos WHERE id = ?');
  const photosOfMember = db.prepare('SELECT id FROM photos WHERE member_id = ?');
  const photosOfCouple = db.prepare('SELECT id FROM photos WHERE couple_id = ?');
  const storageUsed = db.prepare('SELECT coalesce(sum(size), 0) AS bytes FROM photos WHERE couple_id = ?');

  // A few tries a minute is plenty for people; it stops anyone guessing pairing codes.
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const total = { count: 0, resetAt: 0 };
  function clientAddress(req: IncomingMessage): string {
    // Caddy adds the address it saw to the end of X-Forwarded-For; anything before it came from the caller.
    if (trustProxy) {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').pop()?.trim();
      if (forwarded) return forwarded;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }
  function limitAttempts(req: IncomingMessage) {
    const tooMany = () => new HttpError(429, 'Too many tries. Wait a minute and try again.');
    const nowMs = Date.now();
    if (total.resetAt <= nowMs) Object.assign(total, { count: 0, resetAt: nowMs + 60_000 });
    if (++total.count > signInAttemptsTotal) throw tooMany();
    const key = clientAddress(req);
    const entry = attempts.get(key);
    if (!entry || entry.resetAt <= nowMs) {
      if (attempts.size > 10_000) attempts.clear();
      attempts.set(key, { count: 1, resetAt: nowMs + 60_000 });
      return;
    }
    entry.count += 1;
    if (entry.count > signInAttempts) throw tooMany();
  }

  function removeFile(id: string) {
    deletePhotoRow.run(id);
    rmSync(join(photoDir, id), { force: true });
  }

  function bearer(req: IncomingMessage): string {
    const header = req.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice(7) : '';
  }

  type SignedIn = Member & { last_used_at: string | null; via: string | null; created_at: string };

  function signedIn(req: IncomingMessage): SignedIn {
    const token = bearer(req);
    const hash = token ? hashToken(token) : '';
    const found = hash ? (findMemberByToken.get(hash) as SignedIn | undefined) : undefined;
    if (!found) {
      const revoked = hash ? (findRevoked.get(hash) as { reason: string } | undefined) : undefined;
      throw new HttpError(401, revoked?.reason ?? 'Not signed in');
    }
    // Note the day each phone was last seen, so phones gone quiet for months can be signed out.
    const stamp = now();
    if (!found.last_used_at || found.last_used_at.slice(0, 10) !== stamp.slice(0, 10)) touchToken.run(stamp, hash);
    return found;
  }

  function authenticate(req: IncomingMessage): Member {
    const found = signedIn(req);
    return { id: found.id, couple_id: found.couple_id, name: found.name };
  }

  /** Signs in one more phone as this member and returns its token. */
  function newToken(memberId: string, via: string | null = null): string {
    const token = randomBytes(32).toString('hex');
    insertToken.run(hashToken(token), memberId, now(), now(), via);
    return token;
  }

  /** Signs out every phone of this member except `keepHash`, and remembers why for each. */
  function revokeOthers(memberId: string, keepHash: string, reason: string): number {
    const hashes = otherTokensOf.all(memberId, keepHash) as { token_hash: string }[];
    for (const { token_hash } of hashes) insertRevoked.run(token_hash, reason, now());
    return Number(deleteOtherTokens.run(memberId, keepHash).changes);
  }

  function newMember(coupleId: string, name: string) {
    const id = randomUUID();
    insertMember.run(id, coupleId, name, `moved:${id}`, now());
    return { id, token: newToken(id) };
  }

  function freshPairCode(): string {
    let code = makePairCode();
    while (findCoupleByCode.get(code)) code = makePairCode();
    return code;
  }

  function describe(member: Member) {
    const couple = getCouple.get(member.couple_id) as { id: string; pair_code: string | null; pair_code_at: string | null };
    // An old code that nobody used is swapped for a new one, so it can't be guessed at forever.
    if (couple.pair_code && Date.parse(couple.pair_code_at ?? '') < Date.now() - PAIR_CODE_MS) {
      couple.pair_code = freshPairCode();
      setPairCode.run(couple.pair_code, now(), couple.id);
    }
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
    limitAttempts(req);
    const body = await readJson(req);
    const name = cleanName(body.name);
    const { n: couples } = countCouples.get() as { n: number };
    if (couples >= maxCouples) throw new HttpError(403, 'This server is full. Raise MAX_SPACES on the server to add more.');
    const coupleId = randomUUID();
    const code = freshPairCode();
    insertCouple.run(coupleId, code, now(), now());
    const member = newMember(coupleId, name);
    send(res, 201, { token: member.token, coupleId, memberId: member.id, pairCode: code, partner: null });
  }

  async function joinCouple(req: IncomingMessage, res: ServerResponse) {
    limitAttempts(req);
    const body = await readJson(req);
    const name = cleanName(body.name);
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const couple = code ? (findCoupleByCode.get(code) as { id: string; pair_code_at: string | null } | undefined) : undefined;
    const expired = couple && Date.parse(couple.pair_code_at ?? '') < Date.now() - PAIR_CODE_MS;
    if (!couple || expired) throw new HttpError(404, 'That code was not found. Codes last a day; ask for the new one.');
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
        const existing = getRecord.get(member.couple_id, kind, id) as { author: string; data: string | null } | undefined;
        const deleted = r.deleted === true;
        const refusal = checkWrite(member, kind, id, existing, deleted, r.data);
        if (refusal) {
          results.push({ kind, id, ok: false, error: refusal });
          continue;
        }
        const data = deleted ? null : JSON.stringify(r.data ?? null);
        if (data && data.length > MAX_RECORD_BYTES) {
          results.push({ kind, id, ok: false, error: 'Record is too large' });
          continue;
        }
        const { seq } = bumpSeq.get(member.couple_id) as { seq: number };
        upsertRecord.run(member.couple_id, kind, id, member.id, data, deleted ? 1 : 0, seq, now());
        // A deleted or changed moment no longer needs its old photo or video.
        if (kind === 'moment' && existing) {
          const kept = new Set(mediaOf(data));
          for (const old of mediaOf(existing.data)) if (!kept.has(old)) removeOwnFile(member, old);
        }
        results.push({ kind, id, ok: true, seq });
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    send(res, 200, { results });
  }

  /** Why a write isn't allowed, or null when it is. */
  function checkWrite(
    member: Member,
    kind: string,
    id: string,
    existing: { author: string; data: string | null } | undefined,
    deleted: boolean,
    data: unknown,
  ): string | null {
    if (OWNED_KINDS.has(kind)) {
      if (existing && existing.author !== member.id) return 'Belongs to your partner';
      if (ID_IS_MEMBER.has(kind) && id !== member.id) return 'Belongs to your partner';
      if (ID_STARTS_WITH_MEMBER.has(kind) && !id.startsWith(`${member.id}:`)) return 'Belongs to your partner';
      return null;
    }
    const rule = WRITER_FIELD[kind];
    if (!rule) return null;
    const before = existing?.data ? (JSON.parse(existing.data) as Record<string, unknown>) : null;
    // Only the writer takes back a letter or coupon.
    if (deleted) return !before || before[rule.writer] === member.id ? null : 'Belongs to your partner';
    const writer = (data as Record<string, unknown> | null)?.[rule.writer];
    // New ones are written by whoever sends them; after that the other partner only ticks them off.
    if (!before) return writer === member.id ? null : 'Belongs to your partner';
    if (before[rule.writer] === member.id) return writer === member.id ? null : 'Belongs to your partner';
    return onlyChanges(before, data, rule.partnerMay) ? null : 'Belongs to your partner';
  }

  function removeOwnFile(member: Member, id: string) {
    const photo = getPhoto.get(id) as { couple_id: string; member_id: string } | undefined;
    if (photo && photo.couple_id === member.couple_id && photo.member_id === member.id) removeFile(id);
  }

  /** The daily question and this fortnight's date ideas, from the banks in content/. */
  function getContent(req: IncomingMessage, res: ServerResponse, url: URL) {
    const member = authenticate(req);
    const date = url.searchParams.get('date') ?? now().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, 'date must be YYYY-MM-DD');
    const { created_at } = getCoupleStart.get(member.couple_id) as { created_at: string };
    send(res, 200, contentFor(created_at, date));
  }

  /** Signs this phone out: its token stops working straight away. */
  function logout(req: IncomingMessage, res: ServerResponse) {
    authenticate(req);
    deleteToken.run(hashToken(bearer(req)));
    send(res, 200, { ok: true });
  }

  /** Signs out every other phone of this member, such as a lost one. */
  function logoutOthers(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const signedOut = revokeOthers(member.id, hashToken(bearer(req)), 'This phone was signed out from your other phone.');
    send(res, 200, { ok: true, signedOut });
  }

  /**
   * Leaves the space for good: removes this member's own records (the partner's phone
   * sees them go), their photos and videos, their Google link and backup, and every
   * sign-in. The last one out takes the whole space with them.
   */
  function leave(req: IncomingMessage, res: ServerResponse) {
    const found = signedIn(req);
    // Someone your partner signed in as you can't wipe out your things straight away.
    if (found.via === 'partner' && Date.parse(found.created_at) > Date.now() - PARTNER_RESTORE_HOLD_MS) {
      throw new HttpError(403, 'This phone was signed in with a code from your partner, so it can only leave the space after a week.');
    }
    const member: Member = { id: found.id, couple_id: found.couple_id, name: found.name };
    const files: string[] = [];
    db.exec('BEGIN');
    try {
      for (const r of ownedRecordsOf.all(member.couple_id, member.id) as { kind: string; id: string }[]) {
        if (!OWNED_KINDS.has(r.kind)) continue;
        const { seq } = bumpSeq.get(member.couple_id) as { seq: number };
        upsertRecord.run(member.couple_id, r.kind, r.id, member.id, null, 1, seq, now());
      }
      for (const p of photosOfMember.all(member.id) as { id: string }[]) files.push(p.id);
      deleteMember.run(member.id);
      const { n } = countMembers.get(member.couple_id) as { n: number };
      if (n === 0) {
        for (const p of photosOfCouple.all(member.couple_id) as { id: string }[]) files.push(p.id);
        deleteCouple.run(member.couple_id);
      }
      for (const id of files) deletePhotoRow.run(id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    for (const id of files) rmSync(join(photoDir, id), { force: true });
    send(res, 200, { ok: true });
  }

  /** Checks the sign-in token the phone got from Google or from Firebase (email and password). */
  async function identityOf(provider: Provider, req: IncomingMessage): Promise<GoogleIdentity> {
    if (provider === 'google' && !googleClientId) throw new HttpError(501, 'Google sign-in is not set up on this server');
    if (provider === 'email' && !firebaseProjectId) throw new HttpError(501, 'Email sign-in is not set up on this server');
    const body = await readJson(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) throw new HttpError(400, 'idToken is required');
    return provider === 'google' ? verifyGoogle(idToken, googleClientId!) : verifyFirebase(idToken, firebaseProjectId!);
  }

  /** Links the signed-in member to a Google or email account (replacing any earlier one). */
  async function linkAccount(provider: Provider, req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const identity = await identityOf(provider, req);
    const existing = findAccount.get(provider, identity.subject) as { member_id: string } | undefined;
    if (existing && existing.member_id !== member.id) {
      throw new HttpError(409, `That ${provider === 'google' ? 'Google account' : 'email'} is already linked to someone else`);
    }
    db.exec('BEGIN');
    try {
      deleteAccountsOfMember.run(member.id);
      insertAccount.run(provider, identity.subject, member.id, identity.email, now());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    send(res, 200, { email: identity.email });
  }

  /** Signs a new phone in as `member` and hands back everything it needs to carry on. */
  function sendRestored(res: ServerResponse, member: Member, token = newToken(member.id)) {
    const backup = getBackup.get(member.id) as { data: string } | undefined;
    const account = accountOfMember.get(member.id) as { provider: Provider; email: string } | undefined;
    send(res, 200, {
      token,
      name: member.name,
      email: account?.email ?? null,
      provider: account?.provider ?? null,
      backup: backup ? JSON.parse(backup.data) : null,
      ...describe(member),
    });
  }

  /** On a new phone: signs back in as the linked member and hands back their backup. */
  async function restoreAccount(provider: Provider, req: IncomingMessage, res: ServerResponse) {
    limitAttempts(req);
    const identity = await identityOf(provider, req);
    const account = findAccount.get(provider, identity.subject) as { member_id: string } | undefined;
    const member = account ? (getMember.get(account.member_id) as Member | undefined) : undefined;
    if (!member) {
      const how = provider === 'google' ? 'with Google' : 'with this email';
      throw new HttpError(404, `Nothing is linked to this account yet. Sign in ${how} on your old phone first, or ask your partner for a restore code.`);
    }
    sendRestored(res, member);
  }

  /** Stops the account restoring this member. The backup stays, so your partner can still help you back in. */
  function unlinkAccount(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    deleteAccountsOfMember.run(member.id);
    send(res, 200, { ok: true });
  }

  /**
   * Makes a one-time code that signs a new phone in as your partner, with their backup,
   * for when they've lost their phone. It works once, for 30 minutes.
   */
  function partnerRestoreCode(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const partner = getPartner.get(member.couple_id, member.id) as { id: string; name: string } | undefined;
    if (!partner) throw new HttpError(404, "Your partner hasn't joined your space yet");
    // Someone with their own Google or email sign-in gets back in with it, so nobody else can.
    const account = accountOfMember.get(partner.id) as { provider: Provider } | undefined;
    if (account) {
      const how = account.provider === 'google' ? 'Restore with Google' : 'Restore with email';
      throw new HttpError(409, `${partner.name} has their own sign-in, so they can use ${how} on their new phone.`);
    }
    const code = makePairCode(8);
    const expiresAt = new Date(Date.now() + RESTORE_CODE_MS).toISOString();
    deleteOldRestoreCodes.run(now());
    deleteRestoreCodesOf.run(partner.id);
    insertRestoreCode.run(hashToken(code), partner.id, member.id, expiresAt);
    send(res, 201, { code, expiresAt, partner: partner.name });
  }

  /** On your new phone: uses the code your partner gave you. */
  async function restoreWithCode(req: IncomingMessage, res: ServerResponse) {
    limitAttempts(req);
    const body = await readJson(req);
    const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const found = code ? (takeRestoreCode.get(hashToken(code), now()) as { member_id: string } | undefined) : undefined;
    const member = found ? (getMember.get(found.member_id) as Member | undefined) : undefined;
    if (!member) throw new HttpError(404, "That code didn't work. Codes work once, for 30 minutes. Ask for a new one.");
    // Only one phone at a time comes back this way: any other phone signed in as this member
    // (a lost one, or the real you if someone else used the code) is signed out and told why.
    const token = newToken(member.id, 'partner');
    const at = new Date().toISOString().slice(0, 16).replace('T', ' ');
    revokeOthers(
      member.id,
      hashToken(token),
      `Your partner signed you in on another phone (${at} UTC), so this one was signed out. If that wasn't you, talk to them, then sign in with Google or email to keep your place.`,
    );
    sendRestored(res, member, token);
  }

  async function saveBackup(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const body = await readJson(req);
    if (!body.data || typeof body.data !== 'object') throw new HttpError(400, 'data must be an object');
    upsertBackup.run(member.id, JSON.stringify(body.data), now());
    send(res, 200, { ok: true });
  }

  // Photos and videos share one store; a video moment is a still frame plus the clip.
  async function uploadPhoto(req: IncomingMessage, res: ServerResponse) {
    const member = authenticate(req);
    const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    const limit = PHOTO_TYPES.test(mime) ? MAX_PHOTO_BYTES : VIDEO_TYPES.test(mime) ? MAX_VIDEO_BYTES : 0;
    if (!limit) throw new HttpError(415, 'Only photos and videos are accepted');
    const { bytes } = storageUsed.get(member.couple_id) as { bytes: number };
    const declared = Number(req.headers['content-length'] ?? 0);
    if (bytes + declared > storageLimit) {
      throw new HttpError(507, 'Your space is out of room on the server. Delete some old videos or raise STORAGE_LIMIT_GB.');
    }
    const id = randomUUID();
    const path = join(photoDir, id);
    const size = await saveBody(req, path, limit);
    if (!size) {
      rmSync(path, { force: true });
      throw new HttpError(400, 'The file is empty');
    }
    // A file sent without a length (or several at once) is only measured now.
    const after = storageUsed.get(member.couple_id) as { bytes: number };
    if (after.bytes + size > storageLimit) {
      rmSync(path, { force: true });
      throw new HttpError(507, 'Your space is out of room on the server. Delete some old videos or raise STORAGE_LIMIT_GB.');
    }
    insertPhoto.run(id, member.couple_id, member.id, mime, size, now());
    send(res, 201, { photoId: id });
  }

  function downloadPhoto(req: IncomingMessage, res: ServerResponse, id: string) {
    const member = authenticate(req);
    const photo = getPhoto.get(id) as { id: string; couple_id: string; mime: string; size: number } | undefined;
    if (!photo || photo.couple_id !== member.couple_id) throw new HttpError(404, 'Photo not found');
    const path = join(photoDir, photo.id);
    let size: number;
    try {
      size = statSync(path).size;
    } catch {
      throw new HttpError(404, 'Photo not found');
    }
    const headers = {
      ...CORS,
      'content-type': photo.mime,
      'accept-ranges': 'bytes',
      'cache-control': 'private, max-age=31536000, immutable',
    };
    // Players ask for videos a piece at a time, so they can start (and skip ahead) straight away.
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end) {
        res.writeHead(416, { ...CORS, 'content-range': `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      return createReadStream(path, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'content-length': size });
    createReadStream(path).pipe(res);
  }

  // Phones that haven't synced for months are signed out; they can pair or restore again.
  const sweepIdle = () => {
    deleteIdleTokens.run(new Date(Date.now() - TOKEN_IDLE_MS).toISOString());
    deleteOldRevoked.run(new Date(Date.now() - REVOKED_KEEP_MS).toISOString());
  };
  sweepIdle();
  setInterval(sweepIdle, 24 * 60 * 60_000).unref();

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
      if (route === 'GET /api/config') return send(res, 200, { googleClientId, emailSignIn: Boolean(firebaseProjectId) });
      if (route === 'POST /api/account/google') return await linkAccount('google', req, res);
      if (route === 'POST /api/account/google/restore') return await restoreAccount('google', req, res);
      if (route === 'POST /api/account/email') return await linkAccount('email', req, res);
      if (route === 'POST /api/account/email/restore') return await restoreAccount('email', req, res);
      if (route === 'POST /api/account/google/unlink' || route === 'POST /api/account/unlink') return unlinkAccount(req, res);
      if (route === 'POST /api/partner/restore-code') return partnerRestoreCode(req, res);
      if (route === 'POST /api/restore/code') return await restoreWithCode(req, res);
      if (route === 'POST /api/backup') return await saveBackup(req, res);
      if (route === 'POST /api/logout') return logout(req, res);
      if (route === 'POST /api/logout/others') return logoutOthers(req, res);
      if (route === 'POST /api/leave') return leave(req, res);
      if (route === 'GET /api/content') return getContent(req, res, url);
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
