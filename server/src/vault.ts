import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { Transform } from 'node:stream';

/**
 * Encrypts what the server keeps on disk, with the key in DATA_KEY (kept outside the data
 * volume, so a copied disk or backup can't be read without it). Without a key it stores
 * things as they are, and it always reads older, unencrypted values.
 */
export type Vault = {
  /** True when a key is set. */
  on: boolean;
  /** Encrypts a value for the database. */
  seal(text: string): string;
  seal(text: string | null): string | null;
  /** Decrypts a value from the database (plain values pass through). */
  open(stored: string): string;
  open(stored: string | null): string | null;
  /** True when a stored value is encrypted. */
  sealed(stored: string | null): boolean;
  /** A fresh nonce for a new file. */
  fileNonce(): Buffer;
  /** Encrypts or decrypts a file's bytes from `offset` on (AES-CTR, so any range can be read). */
  fileStream(nonce: Buffer, offset?: number): Transform;
};

const PREFIX = 'enc1:';

function deriveKey(secret: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), 'you-and-i', purpose, 32));
}

/** The counter block for `blocks` 16-byte blocks after `nonce`. */
function counterAt(nonce: Buffer, blocks: number): Buffer {
  const out = Buffer.from(nonce);
  let carry = blocks;
  for (let i = 15; i >= 0 && carry > 0; i--) {
    const sum = out[i] + (carry % 256);
    out[i] = sum % 256;
    carry = Math.floor(carry / 256) + Math.floor(sum / 256);
  }
  return out;
}

export function makeVault(secret: string | undefined): Vault {
  if (secret && secret.length < 32) throw new Error('DATA_KEY must be at least 32 characters (use: openssl rand -hex 32)');
  const recordKey = secret ? deriveKey(secret, 'records') : null;
  const fileKey = secret ? deriveKey(secret, 'files') : null;

  function seal(text: string | null): string | null {
    if (text === null || !recordKey) return text;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', recordKey, iv);
    const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
  }

  function open(stored: string | null): string | null {
    if (stored === null || !stored.startsWith(PREFIX)) return stored;
    if (!recordKey) throw new Error('This data is encrypted and DATA_KEY is not set');
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', recordKey, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  }

  return {
    on: Boolean(secret),
    seal: seal as Vault['seal'],
    open: open as Vault['open'],
    sealed: (stored) => Boolean(stored?.startsWith(PREFIX)),
    fileNonce: () => randomBytes(16),
    fileStream(nonce, offset = 0) {
      if (!fileKey) throw new Error('DATA_KEY is not set');
      const block = Math.floor(offset / 16);
      const stream = createCipheriv('aes-256-ctr', fileKey, counterAt(nonce, block));
      // Line the keystream up with `offset` inside its block.
      const skip = offset - block * 16;
      if (skip) stream.update(Buffer.alloc(skip));
      return stream;
    },
  };
}
