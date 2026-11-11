"""Unit tests for Skill 1: Personal AI Assistant & Orchestration."""

import asyncio
import pytest
from src.database import init_db
from src.skills.assistant import (
    get_conversation_history,
    get_or_create_conversation,
    handle_user_message,
    save_message,
)
from src.skills.memory import save_memory


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_conversation_context_and_history():
    """Verify conversation creation, message persistence, and history loading."""
    cid = get_or_create_conversation()
    assert cid is not None

    save_message(cid, "user", "What is my active project?")
    save_message(cid, "assistant", "Your active project is TRISUTRO.")

    history = get_conversation_history(cid, limit=5)
    assert len(history) >= 2
    assert history[-2].role == "user"
    assert history[-1].role == "assistant"


def test_assistant_direct_task_creation():
    """Verify natural command 'create task: ...' triggers Task Manager skill."""
    res = asyncio.run(handle_user_message("create task: Test automated checkout flow"))
    assert res["skill_triggered"] == "tasks"
    assert "Task Created!" in res["response"]
    assert res["data"]["title"] == "Test automated checkout flow"


def test_assistant_direct_memory_creation():
    """Verify natural command 'remember that ...' triggers Personal Memory skill."""
    res = asyncio.run(handle_user_message("remember that I prefer daily summaries at 9 AM"))
    assert res["skill_triggered"] == "memory"
    assert "Memory Saved Successfully!" in res["response"]


def test_assistant_direct_web_research():
    """Verify natural command 'search for ...' triggers Web Research skill."""
    res = asyncio.run(handle_user_message("search for SQLite WAL mode advantages"))
    assert res["skill_triggered"] == "web_research"
    assert "summary" in res["data"]


def test_assistant_direct_system_status():
    """Verify natural command 'system status' returns operational telemetry."""
    res = asyncio.run(handle_user_message("system status"))
    assert res["skill_triggered"] == "status"
    assert "JARVIS System Telemetry" in res["response"]


def test_assistant_general_conversation():
    """Verify general conversation returns a structured, non-empty response."""
    # Seed a memory
    save_memory("preference", "preferred_style", "concise and direct bullet points")

    res = asyncio.run(handle_user_message("Hello JARVIS, are you ready to assist?"))
    assert "response" in res
    assert len(res["response"]) > 0
    assert "conversation_id" in res
