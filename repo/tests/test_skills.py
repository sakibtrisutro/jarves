"""Unit tests for the 6 Core JARVIS Skills."""

import asyncio
import pytest
from src.database import init_db
from src.skills.memory import delete_memory, format_memories_for_prompt, get_memories, save_memory, search_memories
from src.skills.notes import create_note, delete_note, search_notes
from src.skills.research import search_web
from src.skills.status import get_system_status
from src.skills.tasks import create_task, delete_task, list_tasks, update_task_status


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Ensure database schema is ready before testing skills."""
    init_db()


def test_skill_3_personal_memory():
    """Verify memory saving, retrieval, search, prompt formatting, and deletion."""
    mem = save_memory(
        category="preference",
        key="test_theme",
        content="Prefers midnight dark theme with cyan accents"
    )
    assert mem["key"] == "test_theme"
    assert mem["category"] == "preference"

    # Retrieval
    all_mems = get_memories(category="preference")
    assert any(m["key"] == "test_theme" for m in all_mems)

    # Search
    search_hits = search_memories("midnight")
    assert len(search_hits) >= 1

    # Prompt formatting
    prompt_str = format_memories_for_prompt()
    assert "test_theme" in prompt_str
    assert "midnight dark theme" in prompt_str

    # Deletion
    assert delete_memory(mem["id"]) is True


def test_skill_4_task_manager():
    """Verify task creation, priority sorting, status updates, and completion."""
    task = create_task(title="Audit TRISUTRO checkout conversion", priority="high")
    assert task["title"] == "Audit TRISUTRO checkout conversion"
    assert task["status"] == "pending"
    assert task["priority"] == "high"

    # List tasks
    pending = list_tasks(status="pending")
    assert any(t["id"] == task["id"] for t in pending)

    # Update to completed
    updated = update_task_status(task["id"], "completed")
    assert updated["status"] == "completed"
    assert updated["completed_at"] is not None

    # Delete
    assert delete_task(task["id"]) is True


def test_skill_5_notes_and_knowledge():
    """Verify note creation, categorization, search, and deletion."""
    note = create_note(
        title="Architecture Decision",
        content="We chose SQLite in WAL mode for zero idle RAM and ACID reliability.",
        category="Engineering",
        tags="database,sqlite,architecture"
    )
    assert note["title"] == "Architecture Decision"

    # Search
    hits = search_notes("WAL mode")
    assert len(hits) >= 1
    assert hits[0]["category"] == "Engineering"

    # Delete
    assert delete_note(note["id"]) is True


def test_skill_2_web_research():
    """Verify web research returns structured sources, verified facts, and assumptions."""
    result = asyncio.run(search_web("Python programming language"))
    assert result["query"] == "Python programming language"
    assert isinstance(result["sources"], list)
    assert "summary" in result
    assert isinstance(result["verified_facts"], list)
    assert isinstance(result["assumptions"], list)


def test_skill_6_system_status():
    """Verify telemetry returns host hardware, provider state, and 6 active skills."""
    status = get_system_status()
    assert status["status"] == "HEALTHY"
    assert "host" in status
    assert status["host"]["cpu_cores"] >= 1
    assert "ai_provider" in status
    assert len(status["skills"]) == 7
    assert all(s["is_operational"] for s in status["skills"])
