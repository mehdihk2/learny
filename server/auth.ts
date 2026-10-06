import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from './db';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

/** Only a hash of the token is stored, so a leaked database can't be used to log in. */
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(db: Db, userId: string): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)').run(tokenHash(token), userId, new Date().toISOString());
  return token;
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

export function createUser(db: Db, email: string, password: string, name?: string): AuthUser {
  const user = { id: randomUUID(), email: email.trim().toLowerCase(), name: name?.trim() || null };
  db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    user.email,
    user.name,
    hashPassword(password),
    new Date().toISOString(),
  );
  return user;
}

export function findUserByEmail(db: Db, email: string) {
  return db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | (AuthUser & { password_hash: string })
    | undefined;
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export function requireAuth(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    const user = token
      ? (db
          .prepare('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
          .get(tokenHash(token)) as AuthUser | undefined)
      : undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    req.user = { ...user };
    next();
  };
}
