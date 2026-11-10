import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initDefaultUsers } from './auth.ts';
import { initModelRegistry } from './model_registry.ts';
import { initMemorySystem } from './memory.ts';

let dbInstance: any = null;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, 'jarvis_operational.db');

export function initDatabase() {
  if (dbInstance) return dbInstance;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Enforce WAL mode and safety pragmas
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');

    runMigrations(dbInstance);
    initDefaultUsers();
    initModelRegistry();
    initMemorySystem();

    console.log(`[DATABASE] SQLite operational database initialized at: ${DB_PATH} (WAL mode)`);
    return dbInstance;
  } catch (err) {
    console.warn('[DATABASE] Native node:sqlite failed:', err);
    return null;
  }
}

export function getDb() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

function runMigrations(db: any) {
  db.exec(`
    -- 1. System Diagnostic Events Table
    CREATE TABLE IF NOT EXISTS system_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE NOT NULL,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      component TEXT NOT NULL,
      message TEXT NOT NULL,
      error_code TEXT,
      correlation_id TEXT,
      task_id TEXT,
      agent_id TEXT,
      provider_id TEXT,
      metadata_json TEXT,
      stack_trace TEXT,
      troubleshooting TEXT
    );

    -- 2. Multi-User Accounts Table
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      voice_personality TEXT NOT NULL DEFAULT 'Male',
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 3. Conversations & Context History
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      audio_url TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- 4. Centralized Settings Table (Key-Value)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
