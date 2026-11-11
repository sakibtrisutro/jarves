import crypto from 'node:crypto';
import { getDb } from './database.ts';
import { logEvent } from './logger.ts';

/**
 * Secure password hashing using Node.js scrypt with memory-hard parameters
 * Format: scrypt:<saltHex>:<derivedKeyHex>
 * Backward compatible with existing PBKDF2 hashes (salt:hash)
 */
export function hashPassword(password: string | number): string {
  const passStr = String(password != null ? password : '');
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(passStr, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  }).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string | number, storedHash: string): boolean {
  try {
    if (!storedHash || password == null) return false;
    const passStr = String(password);

    // Modern scrypt format
    if (storedHash.startsWith('scrypt:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 3) return false;
      const [, salt, originalKeyHex] = parts;
      const derivedKey = crypto.scryptSync(passStr, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 32 * 1024 * 1024,
      }).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(originalKeyHex, 'hex'));
    }

    // Backward compatibility for legacy PBKDF2 hashes (salt:hash)
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(passStr, salt, 10000, 64, 'sha512').toString('hex');
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
  
  // Normal session: 30 minutes (0.0208 days). Persistent Remember Me: 30 days.
  const durationDays = persistent ? 30 : (30 / 1440);
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

export function revokeUserSessions(username: string, exceptSessionId?: string) {
  const db = getDb();
  if (!db) return;
  if (exceptSessionId) {
    db.prepare('DELETE FROM sessions WHERE username = ? AND id != ?').run(username, exceptSessionId);
  } else {
    db.prepare('DELETE FROM sessions WHERE username = ?').run(username);
  }
}

export function getUserActiveSessions(username: string) {
  const db = getDb();
  if (!db) return [];
  const now = new Date().toISOString();
  return db.prepare('SELECT id, username, expires_at, last_active, created_at FROM sessions WHERE username = ? AND expires_at > ? ORDER BY last_active DESC').all(username, now);
}

/**
 * Cookie parsing & formatting utilities for HttpOnly SameSite=Lax sessions
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(c => {
    const idx = c.indexOf('=');
    if (idx > -1) {
      const key = c.slice(0, idx).trim();
      const val = c.slice(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  });
  return cookies;
}

export function formatSessionCookie(token: string, persistent: boolean, isSecure: boolean = false): string {
  const maxAge = persistent ? 30 * 24 * 60 * 60 : 30 * 60; // 30 days vs 30 mins
  const secureFlag = isSecure ? '; Secure' : '';
  return `jarvis_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
}

export function formatClearCookie(): string {
  return 'jarvis_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

/**
 * Initializes default users Sakib & Sanjida if not present,
 * or verifies and restores the temporary password if must_change_password is 1.
 */
export function initDefaultUsers() {
  const db = getDb();
  if (!db) return;

  const defaultUsers = [
    { username: 'Sakib', role: 'admin', voice: 'Male' },
    { username: 'Sanjida', role: 'user', voice: 'Female' },
  ];

  for (const u of defaultUsers) {
    try {
      const existing = db.prepare('SELECT username, password_hash, must_change_password FROM users WHERE LOWER(TRIM(username)) = LOWER(?)').get(u.username) as any;
      if (!existing) {
        const initialHash = hashPassword('1234');
        db.prepare(`
          INSERT INTO users (username, password_hash, role, voice_personality, must_change_password, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(u.username, initialHash, u.role, u.voice);
        console.log(`[AUTH] Created default user account: ${u.username} (temp password initialized)`);
      } else if (existing.must_change_password === 1) {
        // If must_change_password is 1, verify that the hash verifies against '1234' and uses scrypt format
        const isValid = verifyPassword('1234', existing.password_hash);
        const isScrypt = existing.password_hash?.startsWith('scrypt:');
        if (!isValid || !isScrypt) {
          const freshHash = hashPassword('1234');
          db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE LOWER(TRIM(username)) = LOWER(?)").run(freshHash, u.username);
          console.log(`[AUTH] Upgraded/restored valid scrypt hash for default user: ${u.username} with temporary password`);
        }
      }
    } catch (err) {
      console.error(`[AUTH] Error initializing default user ${u.username}:`, err);
    }
  }
}
