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
      username TEXT PRIMARY KEY COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      recovery_email TEXT,
      is_email_verified INTEGER DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      voice_personality TEXT NOT NULL DEFAULT 'Male',
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 3. Sessions & Tokens (Remember Me support)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    -- 4. Password Recovery Tokens
    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 5. Conversations & Context History
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL DEFAULT 'Sakib',
      title TEXT NOT NULL,
      summary TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT 'Sakib',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      audio_url TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    -- 6. Semantic Memory (Stable Preferences)
    CREATE TABLE IF NOT EXISTS semantic_memory (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      content TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(username, category, key)
    );

    -- 7. Episodic Memory (Action/Event History)
    CREATE TABLE IF NOT EXISTS episodic_memory (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      event_type TEXT NOT NULL, -- 'task_completed', 'decision_made', 'conversation_finished'
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      reference_id TEXT, -- ID of the task or conversation
      created_at TEXT NOT NULL
    );

    -- 8. Centralized Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 9. Tasks & Scheduler
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL DEFAULT 'Sakib',
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'draft', 'pending', 'scheduled', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled'
      priority TEXT NOT NULL DEFAULT 'normal',
      schedule_type TEXT DEFAULT 'once', -- 'once', 'recurring'
      scheduled_at TEXT,
      recurrence_rule TEXT,
      assignee TEXT,
      due_date TEXT,
      result_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    -- 10. Notification Center
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      type TEXT NOT NULL, -- 'task', 'system', 'agent', 'security'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    -- 11. Model Failover & Activity History
    CREATE TABLE IF NOT EXISTS model_failover_history (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      previous_provider TEXT,
      previous_model TEXT,
      new_provider TEXT,
      new_model TEXT,
      failure_reason TEXT,
      status TEXT NOT NULL,
      switch_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // Migrations for existing tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  const tableNames = tables.map(t => t.name);

  // Migrate user_memories to semantic_memory if it exists
  if (tableNames.includes('user_memories')) {
    try {
      db.exec('INSERT OR IGNORE INTO semantic_memory SELECT * FROM user_memories');
      db.exec('DROP TABLE user_memories');
    } catch (e) { console.warn('Memory migration failed:', e); }
  }

  // Add columns if missing
  const addColumn = (table: string, col: string, def: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch {}
  };

  addColumn('users', 'email', 'TEXT UNIQUE');
  addColumn('users', 'recovery_email', 'TEXT');
  addColumn('users', 'is_email_verified', 'INTEGER DEFAULT 0');
  
  addColumn('conversations', 'username', "TEXT NOT NULL DEFAULT 'Sakib'");
  addColumn('conversations', 'summary', 'TEXT');
  addColumn('conversations', 'is_archived', 'INTEGER DEFAULT 0');
  
  addColumn('messages', 'username', "TEXT NOT NULL DEFAULT 'Sakib'");
  
  addColumn('tasks', 'username', "TEXT NOT NULL DEFAULT 'Sakib'");
  addColumn('tasks', 'schedule_type', "TEXT DEFAULT 'once'");
  addColumn('tasks', 'scheduled_at', 'TEXT');
  addColumn('tasks', 'recurrence_rule', 'TEXT');
  addColumn('tasks', 'result_json', 'TEXT');
  addColumn('tasks', 'error_json', 'TEXT');
}
