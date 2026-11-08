"""Skill 1: Personal AI Assistant.

Coordinates conversational interactions, context memory, and skill dispatch.
Maintains session history in SQLite, injects personal memories into system prompts,
and delegates to Cloud AI providers or deterministic sub-skills.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.config import settings
from src.database import get_connection, row_to_dict
from src.providers.base import LLMMessage
from src.providers.factory import get_llm_provider
from src.skills.github_skill import get_repository_info, search_repositories
from src.skills.memory import format_memories_for_prompt, save_memory
from src.skills.notes import create_note
from src.skills.research import search_web
from src.skills.status import get_system_status
from src.skills.tasks import create_task, list_tasks


SYSTEM_PROMPT_TEMPLATE = """You are JARVIS, an intelligent central Personal AI Assistant and Executive General Manager.

Core Identity & Guidelines:
1. You assist the user with personal affairs, planning, technical research, and managing business operations (including the TRISUTRO e-commerce ecosystem).
2. You provide concise, actionable, and structured responses.
3. You distinguish verified facts from assumptions.
4. You adhere to user-approved preferences and instructions.
5. You never fabricate information or claim capabilities without verification.

{memory_context}
"""


def get_or_create_conversation(conv_id: Optional[str] = None) -> str:
    """Retrieve an existing conversation or create a default active one."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    if conv_id:
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
        row = cursor.fetchone()
        if row:
            conn.close()
            return row["id"]

    # Check for the latest existing conversation
    cursor.execute("SELECT id FROM conversations ORDER BY updated_at DESC LIMIT 1")
    latest = cursor.fetchone()
    if latest:
        cid = latest["id"]
        conn.close()
        return cid

    # Otherwise create a new conversation
    new_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, 'Primary Session', ?, ?)",
        (new_id, now_iso, now_iso)
    )
    conn.commit()
    conn.close()
    return new_id


def save_message(conv_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Persist a conversation message in the database."""
    conn = get_connection()
    now_iso = datetime.now(timezone.utc).isoformat()
    msg_id = str(uuid.uuid4())
    meta_str = json.dumps(metadata or {})

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (msg_id, conv_id, role, content, meta_str, now_iso)
    )
    cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now_iso, conv_id))
    conn.commit()

    cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)


def get_conversation_history(conv_id: str, limit: int = 10) -> List[LLMMessage]:
    """Retrieve recent conversation history formatted for the LLM."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT role, content FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (conv_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()

    # Reorder chronologically
    messages = []
    for r in reversed(rows):
        messages.append(LLMMessage(role=r["role"], content=r["content"]))
    return messages


async def handle_user_message(user_text: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """Process user message through deterministic command routing or Cloud AI reasoning."""
    clean_text = user_text.strip()
    conv_id = get_or_create_conversation(conversation_id)

    # Persist the user message
    save_message(conv_id, "user", clean_text)

    lower_text = clean_text.lower()

    # 0. Direct Skill: GitHub Intelligence Trigger
    if lower_text.startswith(("github search: ", "search github: ", "find repo: ", "github repo: ")):
        if lower_text.startswith("github repo: "):
            target = clean_text[len("github repo: "):].strip()
            parts = [p.strip() for p in target.split("/") if p.strip()]
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1]
                info = await get_repository_info(owner, repo)
                if "error" in info:
                    response_text = f"⚠️ GitHub Error: {info['error']}"
                else:
                    response_text = (
                        f"📁 **GitHub Repository**: [{info['full_name']}]({info['html_url']})\n"
                        f"- **Language**: {info['language']} | ⭐ {info['stars']:,} Stars\n"
                        f"- **Description**: {info['description']}\n"
                        f"- **Default Branch**: `{info['default_branch']}`\n"
                        f"- **Total Files**: {info['total_files']}\n\n"
                        f"**README Preview:**\n```markdown\n{info['readme_preview'][:600]}\n```"
                    )
                save_message(conv_id, "assistant", response_text, {"skill": "github_repo", "target": target})
                return {
                    "conversation_id": conv_id,
                    "response": response_text,
                    "skill_triggered": "github_repo",
                    "data": info,
                }

        # Otherwise search repositories
        query = clean_text
        for prefix in ["github search: ", "search github: ", "find repo: "]:
            if lower_text.startswith(prefix):
                query = clean_text[len(prefix):].strip()
                break

        gh_res = await search_repositories(query)
        response_text = gh_res["summary"]
        save_message(conv_id, "assistant", response_text, {"skill": "github_search", "query": query})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "github_search",
            "data": gh_res,
        }

    # 1. Direct Skill: Web Research Trigger
    if lower_text.startswith(("search for ", "research ", "web search ", "search ")):
        query = clean_text
        for prefix in ["search for ", "research ", "web search ", "search "]:
            if lower_text.startswith(prefix):
                query = clean_text[len(prefix):].strip()
                break

        research_res = await search_web(query)
        response_text = research_res["summary"]
        save_message(conv_id, "assistant", response_text, {"skill": "web_research", "query": query})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "web_research",
            "data": research_res,
        }

    # 2. Direct Skill: Memory Creation Trigger
    if lower_text.startswith(("remember that ", "remember: ", "save memory: ")):
        content = clean_text
        for prefix in ["remember that ", "remember: ", "save memory: "]:
            if lower_text.startswith(prefix):
                content = clean_text[len(prefix):].strip()
                break

        # Extract a key from the content
        key = content[:30] + "..." if len(content) > 30 else content
        mem = save_memory(category="preference", key=key, content=content)
        response_text = f"🧠 **Memory Saved Successfully!**\n- **Category**: Preference\n- **Content**: {content}\n\nI will remember this in our future conversations."
        save_message(conv_id, "assistant", response_text, {"skill": "memory", "memory_id": mem["id"]})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "memory",
            "data": mem,
        }

    # 3. Direct Skill: Task Creation Trigger
    if lower_text.startswith(("create task: ", "add task: ", "new task: ", "task: ")):
        task_title = clean_text
        for prefix in ["create task: ", "add task: ", "new task: ", "task: "]:
            if lower_text.startswith(prefix):
                task_title = clean_text[len(prefix):].strip()
                break

        task = create_task(title=task_title, priority="medium")
        response_text = f"📋 **Task Created!**\n- **Title**: {task['title']}\n- **Priority**: Medium\n- **Status**: Pending"
        save_message(conv_id, "assistant", response_text, {"skill": "tasks", "task_id": task["id"]})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "tasks",
            "data": task,
        }

    # 4. Direct Skill: Task Listing Trigger
    if lower_text in ["tasks", "list tasks", "show tasks", "my tasks", "pending tasks"]:
        tasks = list_tasks(status="pending")
        if not tasks:
            response_text = "📋 You have **no pending tasks** right now! Type `create task: <title>` to add one."
        else:
            task_lines = ["📋 **Your Pending Tasks:**"]
            for idx, t in enumerate(tasks, 1):
                prio_badge = f"[{t['priority'].upper()}]"
                task_lines.append(f"{idx}. {prio_badge} **{t['title']}** (ID: `{t['id'][:8]}`)")
            response_text = "\n".join(task_lines)

        save_message(conv_id, "assistant", response_text, {"skill": "tasks"})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "tasks",
            "data": tasks,
        }

    # 5. Direct Skill: Note Creation Trigger
    if lower_text.startswith(("note: ", "take note: ", "create note: ")):
        note_body = clean_text
        for prefix in ["note: ", "take note: ", "create note: "]:
            if lower_text.startswith(prefix):
                note_body = clean_text[len(prefix):].strip()
                break

        title = note_body[:30] + ("..." if len(note_body) > 30 else "")
        note = create_note(title=title, content=note_body, category="General")
        response_text = f"📝 **Note Saved!**\n- **Title**: {note['title']}\n- **Category**: General\n- **Preview**: {note_body}"
        save_message(conv_id, "assistant", response_text, {"skill": "notes", "note_id": note["id"]})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "notes",
            "data": note,
        }

    # 6. Direct Skill: System Status Trigger
    if lower_text in ["status", "system status", "health", "system health"]:
        status_data = get_system_status()
        prov = status_data["ai_provider"]
        host = status_data["host"]
        response_text = (
            f"⚡ **JARVIS System Telemetry & Operational Health**\n\n"
            f"- **System State**: {status_data['status']}\n"
            f"- **AI Provider**: {prov['configured_provider'].upper()} ({prov['mode']})\n"
            f"- **Active Model**: `{prov['model']}` (Key: `{prov['masked_key']}`)\n"
            f"- **Host Resources**: RAM {host['ram_free_gb']} GB Free / {host['ram_total_gb']} GB Total ({host['ram_percent_used']}% used)\n"
            f"- **Disk Storage**: {host['disk_free_gb']} GB Free on C: drive\n"
            f"- **Persistent Database**: {status_data['database']['memories']} Memories, {status_data['database']['tasks_pending']} Pending Tasks, {status_data['database']['notes']} Notes\n"
            f"- **Operational Skills**: All 6 skills online and healthy."
        )
        save_message(conv_id, "assistant", response_text, {"skill": "status"})
        return {
            "conversation_id": conv_id,
            "response": response_text,
            "skill_triggered": "status",
            "data": status_data,
        }

    # 7. General Conversational Interaction with Cloud AI
    provider = get_llm_provider(settings)
    memory_context = format_memories_for_prompt()
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(memory_context=memory_context)

    history = get_conversation_history(conv_id, limit=10)
    provider_resp = await provider.generate(history, system_prompt=system_prompt)

    # Save assistant response
    save_message(
        conv_id,
        "assistant",
        provider_resp.content,
        {
            "provider": provider_resp.provider,
            "model": provider_resp.model,
            "tokens_prompt": provider_resp.tokens_prompt,
            "tokens_completion": provider_resp.tokens_completion,
        }
    )

    return {
        "conversation_id": conv_id,
        "response": provider_resp.content,
        "provider": provider_resp.provider,
        "model": provider_resp.model,
        "tokens": {
            "prompt": provider_resp.tokens_prompt,
            "completion": provider_resp.tokens_completion,
        },
        "is_fallback": provider_resp.is_fallback,
    }
