import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

import { createApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), 'data');

mkdirSync(dataDir, { recursive: true });
const db = openDb(join(dataDir, 'pure-love.db'));
const server = createServer(createApp(db, dataDir));

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
