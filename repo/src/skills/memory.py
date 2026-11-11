"""Skill 3: Personal Memory Management.

Persists user-approved preferences, instructions, and facts in SQLite.
Enables retrieval, inspection, manual editing, and deletion.
Formats approved memories for automatic injection into LLM context.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.database import get_connection, row_to_dict


def save_memory(
    category: str,
    key: str,
    content: str,
    is_verified: bool = True,
) -> Dict[str, Any]:
    """Save or update a persistent user preference or fact."""
    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_cat = category.strip().lower()
    clean_key = key.strip()
    clean_content = content.strip()

    # Check if key in category already exists
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM memories WHERE category = ? AND key = ?",
        (clean_cat, clean_key)
    )
    existing = cursor.fetchone()

    if existing:
        memory_id = existing["id"]
        cursor.execute(
            """
            UPDATE memories
            SET content = ?, is_verified = ?, updated_at = ?
            WHERE id = ?
            """,
            (clean_content, 1 if is_verified else 0, now_iso, memory_id)
        )
    else:
        memory_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO memories (id, category, key, content, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (memory_id, clean_cat, clean_key, clean_content, 1 if is_verified else 0, now_iso, now_iso)
        )

    conn.commit()
    cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)


def get_memories(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all stored memories, optionally filtered by category."""
    conn = get_connection()
    cursor = conn.cursor()
    if category:
        cursor.execute(
            "SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC",
            (category.strip().lower(),)
        )
    else:
        cursor.execute("SELECT * FROM memories ORDER BY category ASC, updated_at DESC")

    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def search_memories(query: str) -> List[Dict[str, Any]]:
    """Search stored memories by keyword across key, content, and category."""
    conn = get_connection()
    cursor = conn.cursor()
    like_query = f"%{query.strip()}%"
    cursor.execute(
        """
        SELECT * FROM memories
        WHERE key LIKE ? OR content LIKE ? OR category LIKE ?
        ORDER BY updated_at DESC
        """,
        (like_query, like_query, like_query)
    )
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def delete_memory(memory_id: str) -> bool:
    """Delete a specific memory entry."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def format_memories_for_prompt() -> str:
    """Format stored memories into a prompt block for the AI Assistant."""
    memories = get_memories()
    if not memories:
        return "No specific long-term user preferences recorded yet."

    lines = ["Stored User Preferences & Knowledge:"]
    for m in memories:
        lines.append(f"- [{m['category'].upper()}] {m['key']}: {m['content']}")
    return "\n".join(lines)
