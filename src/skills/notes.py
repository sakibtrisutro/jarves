"""Skill 5: Notes and Knowledge Base.

Captures, categorizes, searches, and organizes user knowledge and documents.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.database import get_connection, row_to_dict


def create_note(
    title: str,
    content: str,
    category: str = "General",
    tags: str = "",
) -> Dict[str, Any]:
    """Create and persist a new note."""
    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO notes (id, title, category, content, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (note_id, title.strip(), category.strip(), content.strip(), tags.strip(), now_iso, now_iso)
    )
    conn.commit()

    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)


def list_notes(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """List stored notes, optionally filtered by category."""
    conn = get_connection()
    cursor = conn.cursor()

    if category:
        cursor.execute(
            "SELECT * FROM notes WHERE category = ? ORDER BY updated_at DESC",
            (category.strip(),)
        )
    else:
        cursor.execute("SELECT * FROM notes ORDER BY category ASC, updated_at DESC")

    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def search_notes(query: str) -> List[Dict[str, Any]]:
    """Search notes by keyword in title, content, category, or tags."""
    conn = get_connection()
    cursor = conn.cursor()
    like = f"%{query.strip()}%"

    cursor.execute(
        """
        SELECT * FROM notes
        WHERE title LIKE ? OR content LIKE ? OR category LIKE ? OR tags LIKE ?
        ORDER BY updated_at DESC
        """,
        (like, like, like, like)
    )
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def delete_note(note_id: str) -> bool:
    """Delete a note permanently."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
