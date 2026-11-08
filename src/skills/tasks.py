"""Skill 4: Task Manager.

Creates, organizes, tracks, and updates user tasks with priorities and status.
Maintains persistent records in SQLite.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.database import get_connection, row_to_dict


VALID_STATUSES = {"pending", "in_progress", "completed", "cancelled"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}


def create_task(
    title: str,
    description: str = "",
    priority: str = "medium",
    due_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Create and persist a new task."""
    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_prio = priority.lower().strip()
    if clean_prio not in VALID_PRIORITIES:
        clean_prio = "medium"

    task_id = str(uuid.uuid4())
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO tasks (id, title, description, status, priority, due_date, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, NULL, ?, ?)
        """,
        (task_id, title.strip(), description.strip(), clean_prio, due_date, now_iso, now_iso)
    )
    conn.commit()

    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)


def list_tasks(status: Optional[str] = None) -> List[Dict[str, Any]]:
    """List tasks, optionally filtered by status ('pending', 'completed', etc.)."""
    conn = get_connection()
    cursor = conn.cursor()

    if status and status.lower().strip() in VALID_STATUSES:
        cursor.execute(
            """
            SELECT * FROM tasks
            WHERE status = ?
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                created_at DESC
            """,
            (status.lower().strip(),)
        )
    else:
        cursor.execute(
            """
            SELECT * FROM tasks
            ORDER BY
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'completed' THEN 3
                    WHEN 'cancelled' THEN 4
                    ELSE 5
                END,
                created_at DESC
            """
        )

    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def update_task_status(task_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    """Update task status and set completion timestamp if finished."""
    clean_status = new_status.lower().strip()
    if clean_status not in VALID_STATUSES:
        return None

    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    completed_at = now_iso if clean_status == "completed" else None

    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE tasks
        SET status = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (clean_status, completed_at, now_iso, task_id)
    )
    conn.commit()

    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row) if row else None


def delete_task(task_id: str) -> bool:
    """Delete a task permanently."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
