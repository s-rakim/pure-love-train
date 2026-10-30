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
    // How many spaces the server holds, and how much room each gets for photos and videos.
    maxCouples: Number(process.env.MAX_SPACES) || undefined,
    storageLimitBytes: Number(process.env.STORAGE_LIMIT_GB) * 1e9 || undefined,
  }),
);

server.listen(port, () => {
  console.log(`Pure Love sync server listening on port ${port}, data in ${dataDir}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
