"""Unit tests for the SQLite persistent database and backup engine."""

import os
import sqlite3
import tempfile
import pytest
from src.database import backup_database, get_connection, init_db


@pytest.fixture
def temp_db():
    """Create a clean temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass


def test_database_initialization(temp_db):
    """Verify all 5 tables are created with proper schema."""
    conn = get_connection(temp_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cursor.fetchall()}
    conn.close()

    expected_tables = {"conversations", "messages", "memories", "tasks", "notes", "system_logs"}
    assert expected_tables.issubset(tables)


def test_wal_mode_enabled(temp_db):
    """Verify Write-Ahead Logging mode is active."""
    conn = get_connection(temp_db)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode")
    mode = cursor.fetchone()[0]
    conn.close()
    assert mode.lower() == "wal"


def test_online_backup(temp_db):
    """Verify live snapshot backup creates a valid, readable SQLite file."""
    fd, backup_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    created_backup = backup_database(backup_path)
    assert os.path.exists(created_backup)
    assert os.path.getsize(created_backup) > 0

    # Verify integrity of the backup file
    conn = sqlite3.connect(created_backup)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check")
    status = cursor.fetchone()[0]
    conn.close()
    assert status.lower() == "ok"

    try:
        os.remove(backup_path)
    except Exception:
        pass
