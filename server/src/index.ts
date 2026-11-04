import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { createApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), 'data');

mkdirSync(dataDir, { recursive: true });
const db = openDb(join(dataDir, 'pure-love.db'));
// The OAuth web client ID from Google Cloud; leave unset to keep Google sign-in off.
const server = createServer(
  createApp(db, dataDir, {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    // The Firebase project for email and password sign-in; leave unset to keep it off.
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    // How many spaces the server holds, and how much room each gets for photos and videos.
    maxCouples: Number(process.env.MAX_SPACES) || undefined,
    storageLimitBytes: Number(process.env.STORAGE_LIMIT_GB) * 1e9 || undefined,
    // Set when Caddy (or another reverse proxy) sits in front, so limits count each caller.
    trustProxy: process.env.TRUST_PROXY === 'cloudflare' ? 'cloudflare' : process.env.TRUST_PROXY === '1',
    // Encrypts what's kept on disk. Keep a copy somewhere safe: without it the data can't be read.
    dataKey: process.env.DATA_KEY || undefined,
    // Requests a minute from one address and from one phone, and new spaces per address a day.
    requestsPerAddress: Number(process.env.REQUESTS_PER_MINUTE) || undefined,
    spacesPerAddressPerDay: Number(process.env.SPACES_PER_ADDRESS_PER_DAY) || undefined,
  }),
);

// Slow or stalled requests shouldn't hold connections open for long.
server.headersTimeout = 20_000;
server.requestTimeout = 10 * 60_000;
server.keepAliveTimeout = 5_000;
server.maxConnections = Number(process.env.MAX_CONNECTIONS) || 2_000;
// Bad or half-open connections are dropped instead of left hanging.
server.on('clientError', (_err, socket) => socket.destroy());

server.listen(port, () => {
  console.log(`Pure Love sync server listening on port ${port}, data in ${dataDir}`);
  if (!process.env.DATA_KEY) console.warn('DATA_KEY is not set, so data on disk is not encrypted.');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
