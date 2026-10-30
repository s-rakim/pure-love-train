import { DatabaseSync } from 'node:sqlite';

export type RecordRow = {
  kind: string;
  id: string;
  author: string;
  data: string | null;
  deleted: number;
  seq: number;
  updated_at: string;
};

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      pair_code TEXT UNIQUE,
      seq INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      author TEXT NOT NULL,
      data TEXT,
      deleted INTEGER NOT NULL DEFAULT 0,
      seq INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (couple_id, kind, id)
    );
    CREATE INDEX IF NOT EXISTS records_by_seq ON records (couple_id, seq);

    -- Extra sign-ins for a member, such as a new phone restored with Google.
    CREATE TABLE IF NOT EXISTS member_tokens (
      token_hash TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    -- A Google account linked to a member, so they can sign in again on a new phone.
    CREATE TABLE IF NOT EXISTS accounts (
      provider TEXT NOT NULL,
      subject TEXT NOT NULL,
      member_id TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (provider, subject)
    );

    -- Each member's private backup (names, anniversary, cycle logs). Only they can read it.
    CREATE TABLE IF NOT EXISTS backups (
      member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
