"""Integration tests for JARVIS FastAPI Endpoints."""

import pytest
from fastapi.testclient import TestClient
from src.database import init_db
from src.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def test_home_page_serves_html():
    """Verify that the home route serves the JARVIS chat interface."""
    response = client.get("/")
    assert response.status_code == 200
    assert "JARVIS — Personal AI Assistant" in response.text
    assert "<form id=\"chat-input-bar\"" in response.text


def test_status_endpoint():
    """Verify /api/status returns 200 and healthy telemetry."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["jarvis_name"] == "JARVIS"
    assert len(data["skills"]) == 7


def test_chat_endpoint_interaction():
    """Verify sending a message via /api/chat returns a response."""
    response = client.post("/api/chat", json={"message": "System status"})
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "conversation_id" in data


def test_memories_crud_endpoints():
    """Verify /api/memories endpoints: list, create, and delete."""
    # Create
    post_res = client.post(
        "/api/memories",
        json={"category": "project", "key": "ecom_brand", "content": "TRISUTRO clothing"}
    )
    assert post_res.status_code == 200
    mem_id = post_res.json()["id"]

    # List
    list_res = client.get("/api/memories")
    assert list_res.status_code == 200
    assert any(m["id"] == mem_id for m in list_res.json())

    # Delete
    del_res = client.delete(f"/api/memories/{mem_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_tasks_crud_endpoints():
    """Verify /api/tasks endpoints: create, update status, and delete."""
    # Create
    post_res = client.post(
        "/api/tasks",
        json={"title": "Setup local testing", "priority": "high"}
    )
    assert post_res.status_code == 200
    task_id = post_res.json()["id"]

    # Update
    patch_res = client.patch(
        f"/api/tasks/{task_id}",
        json={"status": "completed"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"

    # Delete
    del_res = client.delete(f"/api/tasks/{task_id}")
    assert del_res.status_code == 200


def test_backup_endpoint():
    """Verify /api/backup triggers an online backup."""
    response = client.post("/api/backup")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "backup_file" in response.json()
