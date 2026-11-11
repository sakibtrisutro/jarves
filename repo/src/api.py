"""JARVIS AI System - REST API Endpoints.

FastAPI router exposing endpoints for Chat, Memory, Tasks, Notes, Research, and Telemetry.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from src.config import settings
from src.database import backup_database
from src.skills.assistant import get_conversation_history, get_or_create_conversation, handle_user_message
from src.skills.github_skill import get_repository_info, search_repositories
from src.skills.memory import delete_memory, get_memories, save_memory
from src.skills.notes import create_note, delete_note, list_notes, search_notes
from src.skills.research import search_web
from src.skills.status import get_system_status
from src.skills.tasks import create_task, delete_task, list_tasks, update_task_status

api_router = APIRouter(prefix="/api")


# Request schemas
class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[str] = None


class MemoryRequest(BaseModel):
    category: str = "preference"
    key: str
    content: str


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None


class TaskUpdateRequest(BaseModel):
    status: str


class NoteCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    content: str
    category: str = "General"
    tags: str = ""


class ResearchRequest(BaseModel):
    query: str = Field(min_length=1)


class GitHubSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: Optional[int] = 5


class KeyUpdateRequest(BaseModel):
    provider: str
    api_key: str


# Endpoints
@api_router.post("/chat")
async def chat_endpoint(req: ChatRequest) -> Dict[str, Any]:
    """Send a message to JARVIS and receive an AI or skill response."""
    return await handle_user_message(req.message, req.conversation_id)


@api_router.get("/chat/history")
def get_chat_history_endpoint(conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve message history for the active conversation."""
    cid = get_or_create_conversation(conversation_id)
    history = get_conversation_history(cid, limit=50)
    return {
        "conversation_id": cid,
        "messages": [{"role": m.role, "content": m.content} for m in history],
    }


@api_router.get("/status")
def status_endpoint() -> Dict[str, Any]:
    """Retrieve operational telemetry and health metrics."""
    return get_system_status()


@api_router.get("/memories")
def get_memories_endpoint(category: Optional[str] = None):
    """List persistent user memories."""
    return get_memories(category)


@api_router.post("/memories")
def create_memory_endpoint(req: MemoryRequest):
    """Save a new user memory or preference."""
    return save_memory(req.category, req.key, req.content)


@api_router.delete("/memories/{memory_id}")
def delete_memory_endpoint(memory_id: str):
    """Remove a stored memory."""
    if not delete_memory(memory_id):
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True, "deleted_id": memory_id}


@api_router.get("/tasks")
def list_tasks_endpoint(status: Optional[str] = None):
    """List user tasks filtered by status."""
    return list_tasks(status)


@api_router.post("/tasks")
def create_task_endpoint(req: TaskCreateRequest):
    """Create a new task."""
    return create_task(req.title, req.description, req.priority, req.due_date)


@api_router.patch("/tasks/{task_id}")
def update_task_endpoint(task_id: str, req: TaskUpdateRequest):
    """Update task completion status."""
    updated = update_task_status(task_id, req.status)
    if not updated:
        raise HTTPException(status_code=400, detail="Invalid task ID or status")
    return updated


@api_router.delete("/tasks/{task_id}")
def delete_task_endpoint(task_id: str):
    """Delete a task."""
    if not delete_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "deleted_id": task_id}


@api_router.get("/notes")
def list_notes_endpoint(category: Optional[str] = None, search: Optional[str] = None):
    """List notes, optionally filtered by category or search query."""
    if search:
        return search_notes(search)
    return list_notes(category)


@api_router.post("/notes")
def create_note_endpoint(req: NoteCreateRequest):
    """Create a new note."""
    return create_note(req.title, req.content, req.category, req.tags)


@api_router.delete("/notes/{note_id}")
def delete_note_endpoint(note_id: str):
    """Delete a note."""
    if not delete_note(note_id):
        raise HTTPException(status_code=404, detail="Note not found")
    return {"success": True, "deleted_id": note_id}


@api_router.post("/research")
async def research_endpoint(req: ResearchRequest):
    """Trigger the web research skill."""
    return await search_web(req.query)


@api_router.post("/github/search")
async def github_search_endpoint(req: GitHubSearchRequest):
    """Search public GitHub repositories."""
    return await search_repositories(req.query, req.limit or 5)


@api_router.get("/github/repo/{owner}/{repo}")
async def github_repo_endpoint(owner: str, repo: str):
    """Get repository info, README, and file tree."""
    res = await get_repository_info(owner, repo)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@api_router.post("/backup")
def backup_endpoint():
    """Trigger an instant database snapshot backup."""
    backup_file = backup_database()
    return {"success": True, "backup_file": backup_file}


@api_router.post("/config/key")
def update_api_key_endpoint(req: KeyUpdateRequest):
    """Save an API key into .env and memory safely."""
    provider = req.provider.lower().strip()
    key = req.api_key.strip()
    if len(key) < 5:
        raise HTTPException(status_code=400, detail="Invalid API key length")

    # Update runtime config
    if provider == "gemini":
        settings.GEMINI_API_KEY = key
        settings.AI_PROVIDER = "gemini"
    elif provider == "openai":
        settings.OPENAI_API_KEY = key
        settings.AI_PROVIDER = "openai"
    elif provider == "groq":
        settings.GROQ_API_KEY = key
        settings.AI_PROVIDER = "groq"
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Update .env file on disk safely
    try:
        env_lines = []
        key_var = f"{provider.upper()}_API_KEY"
        provider_set = False
        key_set = False

        try:
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith(f"{key_var}="):
                        env_lines.append(f"{key_var}={key}\n")
                        key_set = True
                    elif line.startswith("AI_PROVIDER="):
                        env_lines.append(f"AI_PROVIDER={provider}\n")
                        provider_set = True
                    else:
                        env_lines.append(line)
        except FileNotFoundError:
            pass

        if not key_set:
            env_lines.append(f"{key_var}={key}\n")
        if not provider_set:
            env_lines.append(f"AI_PROVIDER={provider}\n")

        with open(".env", "w", encoding="utf-8") as f:
            f.writelines(env_lines)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write .env: {exc}")

    return {
        "success": True,
        "provider": provider,
        "masked_key": settings.active_key_masked,
        "is_cloud_active": settings.is_cloud_ai_configured,
    }
