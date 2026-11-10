import crypto from 'node:crypto';
import { getDb } from './database.ts';
import { logEvent } from './logger.ts';

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
 * Session Management
 */
export function createSession(username: string, persistent: boolean = false) {
  const db = getDb();
  if (!db) return null;

  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Normal session: 2 hours. Persistent: 30 days.
  const durationDays = persistent ? 30 : 0.083; // ~2 hours
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    db.prepare(`
      INSERT INTO sessions (id, username, token_hash, expires_at, last_active, created_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(sessionId, username, tokenHash, expiresAt);

    return { sessionId, token, expiresAt };
  } catch (err) {
    console.error('Failed to create session:', err);
    return null;
  }
}

export function verifySession(token: string) {
  const db = getDb();
  if (!db || !token) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = new Date().toISOString();
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash, now) as any;
    if (!session) return null;

    // Update last active
    db.prepare('UPDATE sessions SET last_active = ? WHERE id = ?').run(now, session.id);
    
    return session;
  } catch {
    return null;
  }
}

export function revokeSession(token: string) {
  const db = getDb();
  if (!db) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
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
