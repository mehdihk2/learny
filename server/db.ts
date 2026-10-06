import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite via Node's built-in `node:sqlite` (Node ≥ 22.13): no native module
 * to compile and no database server to install — handy on Windows.
 */
export type Db = DatabaseSync;

const MIGRATIONS = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     name TEXT,
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL
   );
   CREATE TABLE user_data (
     user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     profile TEXT,
     plan TEXT,
     progress TEXT,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE exercise_attempts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     exercise_id TEXT NOT NULL,
     task_id TEXT,
     skill TEXT NOT NULL,
     level TEXT NOT NULL,
     score REAL NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE INDEX idx_attempts_user ON exercise_attempts(user_id, created_at);`,
];

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
  let version = row?.version ?? 0;
  if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  for (; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[version]);
      db.prepare('UPDATE schema_version SET version = ?').run(version + 1);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  return db;
}
