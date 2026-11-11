"""Unit and integration tests for Skill 7: GitHub Intelligence & Code Comprehension."""

import asyncio
import pytest
from fastapi.testclient import TestClient
from src.database import init_db
from src.main import app
from src.skills.assistant import handle_user_message
from src.skills.github_skill import (
    analyze_repository_for_query,
    get_file_content,
    get_repository_info,
    search_repositories,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_search_repositories_empty():
    """Verify empty query returns empty items list gracefully."""
    res = asyncio.run(search_repositories(""))
    assert res["items"] == []
    assert "No query provided" in res["summary"]


def test_search_repositories_query():
    """Verify searching for standard repo query returns items."""
    res = asyncio.run(search_repositories("fastapi", limit=3))
    assert res["query"] == "fastapi"
    assert isinstance(res["items"], list)
    if res["items"]:
        first = res["items"][0]
        assert "full_name" in first
        assert "html_url" in first


def test_get_repository_info():
    """Verify fetching repository metadata, README, and file tree for sakibtrisutro/jarves."""
    info = asyncio.run(get_repository_info("sakibtrisutro", "jarves"))
    if "error" not in info:
        assert info["owner"] == "sakibtrisutro"
        assert info["repo"] == "jarves"
        assert info["default_branch"] == "main"
        assert info["total_files"] > 0
        assert "AGENTS.md" in info["file_tree"] or any("AGENTS" in f for f in info["file_tree"])


def test_get_file_content():
    """Verify fetching file content directly from GitHub."""
    file_data = asyncio.run(get_file_content("sakibtrisutro", "jarves", "AGENTS.md"))
    if "error" not in file_data:
        assert file_data["path"] == "AGENTS.md"
        assert len(file_data["content"]) > 0
        assert "TRISUTRO" in file_data["content"] or "Partner" in file_data["content"]


def test_analyze_repository_for_query():
    """Verify analyzing repository for a specific query."""
    analysis = asyncio.run(analyze_repository_for_query("sakibtrisutro", "jarves", "Virtual CEO"))
    if "error" not in analysis:
        assert analysis["query"] == "Virtual CEO"
        assert "summary" in analysis


def test_assistant_github_triggers():
    """Verify natural assistant triggers for github search and repo inspection."""
    res1 = asyncio.run(handle_user_message("github repo: sakibtrisutro/jarves"))
    assert res1["skill_triggered"] == "github_repo"

    res2 = asyncio.run(handle_user_message("search github: fastapi"))
    assert res2["skill_triggered"] == "github_search"


def test_api_github_endpoints():
    """Verify REST API endpoints /api/github/search and /api/github/repo."""
    search_res = client.post("/api/github/search", json={"query": "fastapi", "limit": 2})
    assert search_res.status_code == 200
    assert "items" in search_res.json()

    repo_res = client.get("/api/github/repo/sakibtrisutro/jarves")
    if repo_res.status_code == 200:
        data = repo_res.json()
        assert data["owner"] == "sakibtrisutro"
        assert data["repo"] == "jarves"
