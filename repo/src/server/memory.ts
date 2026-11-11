import { getDb } from './database.ts';
import { logEvent } from './logger.ts';

export function initMemorySystem() {
  // Database tables are initialized in database.ts runMigrations
}

/**
 * Semantic Memory (Stable Facts & Preferences)
 */
export function getSemanticMemories(username: string, category?: string) {
  const db = getDb();
  if (!db) return [];
  try {
    if (category) {
      return db.prepare('SELECT * FROM semantic_memory WHERE username = ? AND category = ? ORDER BY updated_at DESC').all(username, category);
    }
    return db.prepare('SELECT * FROM semantic_memory WHERE username = ? ORDER BY updated_at DESC').all(username);
  } catch { return []; }
}

export function saveSemanticMemory(username: string, category: string, key: string, content: string) {
  const db = getDb();
  if (!db) return;
  const id = `sem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    db.prepare(`
      INSERT INTO semantic_memory (id, username, category, key, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(username, category, key) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
    `).run(id, username, category, key, content);
  } catch (err) { console.error('Memory error:', err); }
}

/**
 * Episodic Memory (Event History)
 */
export function recordEvent(username: string, type: string, title: string, content: string, refId?: string) {
  const db = getDb();
  if (!db) return;
  const id = `epi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    db.prepare(`
      INSERT INTO episodic_memory (id, username, event_type, title, content, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, username, type, title, content, refId || null);
  } catch (err) { console.error('Episodic error:', err); }
}

export function getEpisodicMemories(username: string, limit: number = 50) {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM episodic_memory WHERE username = ? ORDER BY created_at DESC LIMIT ?').all(username, limit);
  } catch { return []; }
}

/**
 * Backward compatibility helper
 */
export function getUserMemories(username: string, category?: string) {
  return getSemanticMemories(username, category);
}

export function saveUserMemory(username: string, category: string, key: string, content: string) {
  saveSemanticMemory(username, category, key, content);
}

export function deleteUserMemory(username: string, memoryId: string) {
  const db = getDb();
  if (!db) return false;
  try {
    db.prepare('DELETE FROM semantic_memory WHERE id = ? AND username = ?').run(memoryId, username);
    return true;
  } catch { return false; }
}
