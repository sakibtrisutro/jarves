"""JARVIS AI System - Persistent Database & Storage Layer.

Uses SQLite with Write-Ahead Logging (WAL) mode for ACID transactions,
concurrent read access, and zero idle RAM footprint.
Includes automated backup capability using the SQLite Online Backup API.
"""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from src.config import settings


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Create and return a configured SQLite connection."""
    target_path = db_path or settings.DB_PATH
    Path(target_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    # Enforce SQLite performance and safety pragmas
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize relational tables and indices if they do not exist."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    -- 1. Conversations & Context
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant', 'system'
        content TEXT NOT NULL,
        metadata_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    -- 2. Personal Memory
    CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL, -- 'preference', 'instruction', 'project', 'fact'
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        is_verified INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(category, key)
    );

    -- 3. Task Manager
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
        priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
        due_date TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- 4. Notes & Knowledge Base
    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- 5. Audit & System Telemetry Logs
    CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL
    );

    -- Indices for query performance
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_memories_cat ON memories(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_notes_cat ON notes(category);
    """)

    conn.commit()
    conn.close()


def backup_database(destination_path: Optional[str] = None) -> str:
    """Create a hot snapshot of the SQLite database using the native Backup API."""
    source_conn = get_connection()
    if not destination_path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        destination_path = str(Path(settings.DATA_DIR) / "backups" / f"jarvis_backup_{timestamp}.db")

    Path(destination_path).parent.mkdir(parents=True, exist_ok=True)
    dest_conn = sqlite3.connect(destination_path)

    with dest_conn:
        source_conn.backup(dest_conn)

    dest_conn.close()
    source_conn.close()
    return destination_path


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert an sqlite3.Row instance into a Python dictionary."""
    return {key: row[key] for key in row.keys()}
