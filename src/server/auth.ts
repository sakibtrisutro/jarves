import crypto from 'node:crypto';
import { getDb } from './database.ts';

/**
 * Secure password hashing using PBKDF2 with random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Initializes default users Sakib & Sanjida if not present
 */
export function initDefaultUsers() {
  const db = getDb();
  if (!db) return;

  const users = [
    { username: 'Sakib', role: 'admin', voice: 'Male' },
    { username: 'Sanjida', role: 'user', voice: 'Female' },
  ];

  for (const u of users) {
    const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(u.username);
    if (!existing) {
      const initialHash = hashPassword('1234');
      db.prepare(`
        INSERT INTO users (username, password_hash, role, voice_personality, must_change_password, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(u.username, initialHash, u.role, u.voice);
      console.log(`[AUTH] Created default user account: ${u.username} (temp password: 1234)`);
    }
  }
}
