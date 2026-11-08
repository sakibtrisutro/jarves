# JARVIS System Architecture Specification

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. COMPONENT TOPOLOGY

JARVIS is built as a modular, event-driven executive operating system designed for dual-environment execution:
1. **Google AI Studio Environment:** Serves as the cloud-accessible developer workstation, architecture hub, and visual management control center.
2. **Windows PC Environment:** Serves as the permanent, 24/7 background execution runtime hosting the SQLite database, task workers, and Telegram long-polling gateway.

```
+-----------------------------------------------------------------------------------+
|                                 USER TOUCHPOINTS                                  |
|   +------------------------------------+    +---------------------------------+   |
|   |   Web Dashboard (AI Studio / Web)  |    |     Telegram Bot Gateway        |   |
|   |   - Real-time DAG Visualization    |    |     - Mobile Natural Commands   |   |
|   |   - Agent Inspector & Logs         |    |     - Proactive Push Alerts     |   |
|   |   - System Settings & Metrics      |    |     - 1-Tap Inline Approvals    |   |
|   +------------------+-----------------+    +----------------+----------------+   |
+----------------------|---------------------------------------|--------------------+
                       |                                       |
                       | HTTPS / WebSocket                     | Bot API Polling
                       v                                       v
+-----------------------------------------------------------------------------------+
|                      JARVIS CORE ENGINE (Node.js / TypeScript)                    |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             API & Command Router                            |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  |                  Executive Orchestrator & Goal Decomposer                   |  |
|  +-------------------+-----------------------------------+---------------------+  |
|                      |                                   |                        |
|  +-------------------v------------------+  +-------------v---------------------+  |
|  |     Hybrid Task DAG Scheduler        |  |  Autonomy & Safety Gateway        |  |
|  |     (Parallel & Sequential Execution)|  |  (Tier 1 Auto vs Tier 2 Gate)     |  |
|  +-------------------+------------------+  +-------------+---------------------+  |
|                      |                                   |                        |
|  +-------------------v-----------------------------------v---------------------+  |
|  |                             Internal Event Bus                              |  |
|  +---+--------------------+-----------------------+------------------------+---+  |
|      |                    |                       |                        |      |
|  +---v---------------+ +--v------------------+ +--v--------------------+ +-v----+ |
|  |  Multi-Provider   | |  Specialized Agent   | |   Hybrid Memory      | | Tool  | |
|  |  LLM Router       | |  Ecosystem (x10)     | |   Manager            | | Runner| |
|  |  (Gemini / Groq / | |  (Research, Dev,     | |   (Git Markdown &    | | (Safe | |
|  |   OpenRouter/Oll) | |   Social, Web, etc.) | |    SQLite WAL DB)    | | Sandb)| |
|  +-------------------+ +----------------------+ +----------------------+ +------+ |
+-----------------------------------------------------------------------------------+
```

---

## 2. DIRECTORY STRUCTURE

The codebase is organized into clean, isolated modules:

```
/
├── .harness/                    # Core auto-loaded facts & prompts
├── docs/                        # Authoritative documentation (Layer 1)
├── agents/                      # Specialized agent instructions & specs
├── projects/                    # Business initiatives & specifications
├── data/                        # Local SQLite database & backups (Layer 2)
│   ├── jarvis_operational.db    # Main SQLite WAL database
│   └── backups/                 # Scheduled automated snapshots
├── src/
│   ├── core/                    # Core orchestration runtime
│   │   ├── orchestrator.ts      # Executive controller & goal decomposer
│   │   ├── scheduler.ts         # DAG task queue & state machine
│   │   ├── event_bus.ts         # Internal async event dispatcher
│   │   └── sandbox.ts           # Safe tool execution environment
│   ├── memory/                  # Hybrid memory manager
│   │   ├── sqlite_client.ts     # Database connection pool & migrations
│   │   ├── markdown_sync.ts     # Git/Markdown documentation synchronizer
│   │   └── schema.ts            # Drizzle/SQL table definitions
│   ├── providers/               # Multi-provider LLM abstraction
│   │   ├── base.ts              # Abstract provider interface
│   │   ├── router.ts            # Cost-aware fallback routing engine
│   │   ├── gemini.ts            # Official Google GenAI SDK adapter
│   │   ├── groq.ts              # Groq high-speed inference adapter
│   │   ├── openrouter.ts        # OpenRouter fallback adapter
│   │   └── ollama.ts            # Local offline model adapter
│   ├── agents/                  # Specialized agent implementations
│   │   ├── base_agent.ts        # Common agent interface & lifecycle
│   │   ├── research_agent.ts    # Agent 1: Deep research
│   │   ├── software_agent.ts    # Agent 2: Coding & testing
│   │   └── ...                  # Remaining agents (3-10)
│   ├── gateway/                 # Remote interfaces
│   │   ├── telegram_bot.ts      # Telegram bot listener & notification sender
│   │   └── security_gate.ts     # Two-tier autonomy & approval validator
│   ├── web/                     # Web management dashboard (React SPA)
│   │   ├── components/          # DAG viewer, log stream, settings
│   │   └── App.tsx              # Control center entry point
│   └── server.ts                # Application backend & Express entry point
├── tests/                       # Unit & integration test suites
├── package.json                 # Dependency manifest
└── tsconfig.json                # TypeScript configuration
```

---

## 3. SQLITE RELATIONAL SCHEMA (LAYER 2 OPERATIONAL PERSISTENCE)

The database schema guarantees ACID transaction compliance, strict foreign key integrity, and sub-millisecond query performance:

```sql
-- 1. Tasks Table (Core DAG Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_agent TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'blocked', 'waiting_approval')),
    priority INTEGER DEFAULT 1, -- 0: Low, 1: Normal, 2: High, 3: Critical
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    input_payload TEXT,          -- Serialized JSON
    output_result TEXT,          -- Serialized JSON
    error_message TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- 2. Task Dependencies Table (Graph Edges)
CREATE TABLE IF NOT EXISTS task_dependencies (
    parent_task_id TEXT NOT NULL,
    child_task_id TEXT NOT NULL,
    dependency_type TEXT DEFAULT 'finish_to_start',
    PRIMARY KEY (parent_task_id, child_task_id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (child_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 3. Execution Checkpoints Table (State Snapshots)
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    state_data TEXT NOT NULL,     -- Serialized JSON state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 4. Agent Registry Table (Agent Telemetry)
CREATE TABLE IF NOT EXISTS agent_registry (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('idle', 'busy', 'offline', 'error')),
    current_task_id TEXT,
    total_tasks_completed INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- 5. Approval Requests Table (Security Gateway)
CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    action_type TEXT NOT NULL,    -- 'financial_spend', 'security_change', 'destructive_op', 'external_publish'
    action_summary TEXT NOT NULL,
    details_json TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_by TEXT NOT NULL,   -- Agent ID
    approval_token TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 6. Audit Log Table (Immutable Security Stream)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    payload_summary TEXT,
    ip_or_source TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Token Usage & Cost Tracking Table
CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT,
    provider TEXT NOT NULL,       -- 'gemini', 'groq', 'openrouter', 'ollama'
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0.0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. INTER-PROCESS COMMUNICATION & EVENT BUS

The Orchestrator utilizes an asynchronous typed event bus:
- `task:created`: Dispatched when a new goal is decomposed.
- `task:ready`: Dispatched when all prerequisite dependencies of a task finish successfully.
- `task:progress`: Emits partial results, telemetry, and checkpoint saves.
- `task:completed`: Signals dependent tasks to unlock and updates SQLite.
- `task:failed`: Triggers retry policy or escalates to `task:blocked`.
- `security:approval_required`: Suspends task and broadcasts approval alert to Telegram and Web Dashboard.
- `security:approval_resolved`: Resumes task upon verified owner authorization.

---

## 5. RESILIENCE & RECOVERY

1. **Crash Recovery:** Upon server restart, the Scheduler scans `tasks` for any records in `status = 'running'`. It loads the latest recorded checkpoint from `checkpoints` and resumes execution without re-running earlier completed steps.
2. **Network Failover:** If an external LLM provider responds with network timeout or HTTP 5xx, the multi-provider router cascades through the fallback chain within 1.5 seconds.
3. **Database WAL Integrity:** SQLite runs in Write-Ahead Logging mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`). Even during an abrupt Windows power loss, committed transactions remain uncorrupted.
