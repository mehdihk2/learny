import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { openDb } from './db';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 3001);
const dbPath = process.env.DATABASE_PATH ?? join(root, 'data', 'levelup.db');

const db = openDb(dbPath);
const app = createApp(db);

// In production (`npm start` after `npm run build`), also serve the web app.
const dist = join(root, 'dist');
if (existsSync(join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(port, () => {
  console.log(`LevelUp API listening on http://localhost:${port}  (database: ${dbPath})`);
});
