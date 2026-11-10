import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

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

    // Run table schema migrations
    runMigrations(dbInstance);

    console.log(`[DATABASE] SQLite operational database initialized at: ${DB_PATH} (WAL mode)`);
    return dbInstance;
  } catch (err) {
    console.warn('[DATABASE] Native node:sqlite not available or failed:', err);
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

    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON system_events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_events_category ON system_events(category);
    CREATE INDEX IF NOT EXISTS idx_events_level ON system_events(level);

    -- 2. Conversations & Context History
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

    -- 3. Structured Tasks (DAG Queue)
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      assigned_agent TEXT DEFAULT 'JARVIS_CORE',
      input_json TEXT,
      output_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 4. Centralized Settings Table (Key-Value)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 5. Approval Requests Table (Two-Tier Security Gateway)
    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      action_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- 6. Token Usage & Cost Tracking Table
    CREATE TABLE IF NOT EXISTS token_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0.0,
      created_at TEXT NOT NULL
    );
  `);
}
