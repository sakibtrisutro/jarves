import { getDb } from './database.ts';
import { logEvent } from './logger.ts';

export function initMemorySystem() {
  const db = getDb();
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_memories (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      category TEXT NOT NULL, -- 'preference', 'instruction', 'project', 'fact'
      key TEXT NOT NULL,
      content TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(username, category);
  `);
}

export function getUserMemories(username: string, category?: string) {
  const db = getDb();
  if (!db) return [];

  try {
    if (category) {
      return db.prepare('SELECT * FROM user_memories WHERE username = ? AND category = ? ORDER BY updated_at DESC').all(username, category);
    }
    return db.prepare('SELECT * FROM user_memories WHERE username = ? ORDER BY updated_at DESC').all(username);
  } catch (err) {
    console.error('Error fetching user memories:', err);
    return [];
  }
}

export function saveUserMemory(username: string, category: string, key: string, content: string) {
  const db = getDb();
  if (!db) return;

  const memId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    db.prepare(`
      INSERT INTO user_memories (id, username, category, key, content, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(username, category, key) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
    `).run(memId, username, category, key, content);

    logEvent({
      level: 'INFO',
      category: 'MEMORY',
      component: 'PersistentMemory',
      message: `Saved long-term memory for user "${username}" [${category}]: ${key}`,
    });
  } catch (err: any) {
    logEvent({
      level: 'ERROR',
      category: 'MEMORY',
      component: 'PersistentMemory',
      message: `Failed to save memory: ${err.message}`,
      error_code: 'MEMORY_SAVE_FAILED',
    });
  }
}

export function deleteUserMemory(username: string, memoryId: string) {
  const db = getDb();
  if (!db) return false;

  try {
    db.prepare('DELETE FROM user_memories WHERE id = ? AND username = ?').run(memoryId, username);
    return true;
  } catch {
    return false;
  }
}
