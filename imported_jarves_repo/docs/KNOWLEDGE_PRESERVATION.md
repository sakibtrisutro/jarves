# Knowledge Preservation & Hybrid Memory System

**Goal:** Establish permanent, cross-session, multi-device, and provider-resilient institutional memory for the JARVIS executive operating partner.

---

## 1. STORAGE STRATEGY: THE TRI-LAYER HYBRID ARCHITECTURE

To balance human-readable clarity, deep version-controlled context, and high-velocity transactional reliability, JARVIS implements a Tri-Layer Hybrid Memory Architecture:

```
+-----------------------------------------------------------------------------------+
|                        TRI-LAYER HYBRID MEMORY ARCHITECTURE                       |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+-----------------------+       +-----------------------+       +-----------------------+
|        LAYER 1        |       |        LAYER 2        |       |        LAYER 3        |
|  DURABLE KNOWLEDGE    |       |   OPERATIONAL STATE   |       |  PROMPT CONTEXT CACHE |
|   (Markdown + Git)    |       |   (SQLite Database)   |       | (.harness/memory.md)  |
+-----------------------+       +-----------------------+       +-----------------------+
| - Architectural specs |       | - High-velocity queue |       | - Active milestone    |
| - Decision records    |       | - Task state machines |       | - Critical principles |
| - Research findings   |       | - Execution checkpts  |       | - Immediate next step |
| - Business plans      |       | - Agent heartbeats    |       | - Blocker highlights  |
| - Operating SOPs      |       | - Audit event stream  |       | - Key reference docs  |
| - Failure learnings   |       | - Token/Cost tracking |       | - Loaded per session  |
+-----------------------+       +-----------------------+       +-----------------------+
```

---

## 2. LAYER SPECIFICATIONS

### Layer 1: Durable Knowledge Base (Markdown + Git)
- **Primary Locations:** `docs/`, `agents/`, `projects/`, `memory_system/`.
- **Characteristics:** Human-readable, peer-reviewable, version-controlled, diffable.
- **Key Artifacts:**
  - `docs/MASTER_BLUEPRINT.md`: Single authoritative source of truth for architecture and roadmap.
  - `docs/DECISIONS.md`: Immutable record of all strategic, architectural, and procedural decisions.
  - `docs/PROGRESS.md`: Phased roadmap tracker and verified accomplishment record.
  - `docs/SYSTEM_ARCHITECTURE.md`: Component specifications and data contracts.
  - `docs/DEVELOPMENT_ROADMAP.md`: Granular phase breakdowns and dependencies.
  - `docs/AI_PROVIDER_STRATEGY.md`: Model tiers, fallback chains, and cost policies.
  - `docs/SECURITY_POLICY.md`: Autonomy boundaries and approval gateway rules.
  - `docs/AGENT_SPECIFICATION.md`: Contracts for all 10 specialized agents.
  - `docs/RUNTIME_DEPLOYMENT.md`: Windows PC daemon installation and operation.
  - `docs/TELEGRAM_GATEWAY.md`: Remote command and mobile approval protocols.
  - `projects/*/`: Concrete business and technical initiatives (e.g. TRISUTRO e-commerce).

### Layer 2: Operational Relational Persistence (SQLite)
- **File Location:** `data/jarvis_operational.db` (Windows runtime).
- **Engine:** SQLite 3 with Write-Ahead Logging (WAL) mode enabled for high concurrency.
- **Schema Overview:**
  1. `tasks`: Primary task records (`id`, `title`, `description`, `status`, `priority`, `retry_count`, `input_json`, `output_json`, `created_at`, `updated_at`).
  2. `task_dependencies`: Directed graph connections (`parent_task_id`, `child_task_id`).
  3. `checkpoints`: Mid-execution state dumps (`id`, `task_id`, `step_index`, `state_blob`, `created_at`).
  4. `agent_registry`: Active agent metadata (`id`, `agent_type`, `status`, `capabilities_json`, `last_heartbeat`).
  5. `approval_requests`: Action gates requiring owner signoff (`id`, `action_type`, `payload_json`, `status`, `requested_at`, `resolved_at`).
  6. `audit_log`: Cryptographically timestamped activity records (`id`, `event_type`, `actor`, `details_json`, `timestamp`).
  7. `token_metrics`: Provider telemetry (`id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `cost_estimate`, `timestamp`).

### Layer 3: Prompt Context Cache (.harness/memory.md)
- **Location:** `.harness/memory.md`.
- **Role:** High-density, auto-surfaced facts injected into LLM session initiation prompts.
- **Rules:** Keep concise (<100 lines); focus exclusively on identity, principles, active milestone, immediate next action, and active blockers.

---

## 3. SYNCHRONIZATION & CONSISTENCY PROTOCOL

To ensure synchronization between the SQLite database and Markdown files:
1. **Milestone Snapshots:** Upon completion of any task group or milestone, the Orchestrator runs an export script:
   - Queries `tasks` and `audit_log` from SQLite.
   - Formats a summary into `docs/PROGRESS.md` and updates `docs/DECISIONS.md`.
   - Updates `.harness/memory.md` current session state.
2. **Git Commit Checkpoints:** Major changes are staged, reviewed via `git diff`, and committed with descriptive conventional commit messages.
3. **Backup & Recovery Protocol:**
   - Hourly automated WAL checkpointing (`PRAGMA wal_checkpoint(TRUNCATE)`).
   - Daily timestamped database backup to `data/backups/jarvis_YYYY-MM-DD.db`.
   - If SQLite database corruption occurs, the state is deterministically reconstructed from the Git repository history.

---

## 4. SESSION RECOVERY WORKFLOW

Every new development or execution session must follow this exact sequence:

```
[Start Session]
      │
      ▼
1. Auto-Load Core Facts ──────► Read `.harness/memory.md`
      │
      ▼
2. Verify Repository State ───► Run `git status` & `git remote -v`
      │
      ▼
3. Load Operational State ────► Inspect active tasks in SQLite / `docs/PROGRESS.md`
      │
      ▼
4. Verify Latest Checkpoint ──► Match database checkpoints against file diffs
      │
      ▼
5. Execute Next Action ───────► Proceed with single highest-priority verified task
```

---

## 5. CAPTURE & HYGIENE RULES

- **Never Commit Secrets:** API keys, tokens, passwords, and `.env` files are strictly excluded via `.gitignore`.
- **Never Record Unverified Claims:** A task is never marked `completed` without verifiable execution evidence in the task record.
- **Record Decisions in Real-Time:** When an architectural choice is made or superseded, immediately record the rationale in `docs/DECISIONS.md`.
- **Preserve Historical Context:** Do not delete older decisions; mark them with clear `[SUPERSEDED]` headers explaining the technical justification.
