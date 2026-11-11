# JARVIS Phased Development Roadmap (Phases 0–10)

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## ROADMAP MATRIX

```
[Phase 0: Audit & Consolidation] ──► COMPLETE (Current Milestone)
             │
             ▼
[Phase 1: Foundation & Portable Structure]
             │
             ▼
[Phase 2: JARVIS Core Engine & Tool Registry]
             │
             ▼
[Phase 3: Multi-Provider AI Engine]
             │
             ▼
[Phase 4: Persistent Hybrid Memory Engine (SQLite + Git)]
             │
             ▼
[Phase 5: Task DAG & Agent Orchestrator]
             │
             ▼
[Phase 6: Autonomy & Safety Gateway]
             │
             ▼
[Phase 7: Telegram Remote Gateway]
             │
             ▼
[Phase 8: Specialized Agent Ecosystem (10 Agents)]
             │
             ▼
[Phase 9: Windows PC Production Runtime & Packaging]
             │
             ▼
[Phase 10: Continuous Improvement & Self-Evolution]
```

---

## PHASE DETAILS

### PHASE 0: Repository Audit, Knowledge Consolidation & GitHub Connection
- **Objective:** Deep inspection of existing repository, recovery of all decisions, elimination of conflicting blueprints, direct authenticated GitHub access, and creation of canonical architecture v2.0.
- **Prerequisites:** GitHub repository URL and owner authorization.
- **Deliverables:**
  - Authenticated GitHub connection verified via GitHub CLI Device Flow (`gh auth status`).
  - Authoritative `docs/MASTER_BLUEPRINT.md` (v2.0.0).
  - Updated `docs/KNOWLEDGE_PRESERVATION.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `.harness/memory.md`.
  - 6 dedicated architectural specifications (`SYSTEM_ARCHITECTURE.md`, `AI_PROVIDER_STRATEGY.md`, `SECURITY_POLICY.md`, `AGENT_SPECIFICATION.md`, `TELEGRAM_GATEWAY.md`, `RUNTIME_DEPLOYMENT.md`, `DEVELOPMENT_ROADMAP.md`).
- **Testing & Verification:** Verify repository access, dry-run push, and documentation cross-link consistency.
- **Acceptance Criteria:** Documentation staged, committed, and pushed to remote GitHub repository.
- **Status:** **COMPLETED** (Ready for owner sign-off).

---

### PHASE 1: Development Foundation & Portable Structure
- **Objective:** Establish the TypeScript/Node.js modular workspace supporting both the AI Studio management dashboard and the standalone Windows runtime daemon.
- **Prerequisites:** Phase 0 approval.
- **Deliverables:**
  - TypeScript project layout (`src/core`, `src/memory`, `src/providers`, `src/agents`, `src/gateway`, `src/web`).
  - Configuration manager with strict Zod environment variable validation.
  - Logging infrastructure (Winston/Pino) with log file rotation.
  - Test runner infrastructure (Vitest) and linting (ESLint / Prettier).
- **Dependencies:** None.
- **Testing Strategy:** Unit test configuration loader, schema validation, and logging outputs.
- **Acceptance Criteria:** `npm run build` and `npm test` pass cleanly with zero warnings.

---

### PHASE 2: JARVIS Core Engine & Tool Registry
- **Objective:** Build the central orchestration controller, goal decomposition pipeline, and tool execution sandbox.
- **Prerequisites:** Phase 1 complete.
- **Deliverables:**
  - `ExecutiveOrchestrator` class: Goal breakdown into sub-goals.
  - `ToolRegistry` class: Discovery, schema generation, argument validation, and sandboxed execution.
  - Internal asynchronous typed event bus.
- **Testing Strategy:** Mock task decomposition tests, invalid tool execution sandboxing, error handling.
- **Acceptance Criteria:** Orchestrator successfully decomposes a multi-step objective into verified executable tasks.

---

### PHASE 3: Multi-Provider AI Engine
- **Objective:** Deploy the multi-provider routing engine supporting Google Gemini (SDK), Groq Cloud, OpenRouter, and local Ollama.
- **Prerequisites:** Phase 2 complete.
- **Deliverables:**
  - Abstract `LLMProvider` interface.
  - Adapters: `GeminiProvider`, `GroqProvider`, `OpenRouterProvider`, `OllamaProvider`.
  - Smart `ModelRouter`: Cost/speed tiering and automatic failover cascade on rate limits (`HTTP 429`).
  - JSON schema normalizer (stripping `additionalProperties` for Gemini compatibility).
  - SQLite token usage and cost accounting interceptor.
- **Testing Strategy:** Provider failover simulation (mocking 429s and verifying secondary provider takeover).
- **Acceptance Criteria:** Provider failover tests pass within 1.5 seconds.

---

### PHASE 4: Persistent Hybrid Memory Engine (SQLite + Git)
- **Objective:** Build the dual-engine persistence layer integrating the SQLite relational database with Git Markdown documentation.
- **Prerequisites:** Phase 3 complete.
- **Deliverables:**
  - SQLite database initialization (`better-sqlite3` or Drizzle ORM) with WAL mode.
  - Tables: `tasks`, `task_dependencies`, `checkpoints`, `agent_registry`, `approval_requests`, `audit_log`, `token_usage`.
  - Database migration runner.
  - Checkpoint manager: mid-task state serialization and restoration.
  - Markdown synchronizer: milestone snapshot exporter.
- **Testing Strategy:** Simulate abrupt process termination during a multi-step task and verify resume from latest checkpoint.
- **Acceptance Criteria:** Zero data loss upon kill signal; task resumes correctly.

---

### PHASE 5: Task DAG & Agent Orchestration Engine
- **Objective:** Build the Directed Acyclic Graph (DAG) task engine supporting parallel and sequential execution branches.
- **Prerequisites:** Phase 4 complete.
- **Deliverables:**
  - DAG scheduler: topological sorting, dependency resolution, parallel execution pool.
  - BaseAgent class and lifecycle manager (spawn, initialize, execute, checkpoint, terminate).
  - Agent message passing bus.
- **Testing Strategy:** Run a 5-node diamond DAG test (1 root, 2 parallel workers, 1 aggregate, 1 finish).
- **Acceptance Criteria:** Parallel tasks execute concurrently; dependent task waits until parents succeed.

---

### PHASE 6: Autonomy, Safety & Cryptographic Approval Gate
- **Objective:** Implement the Two-Tier autonomy boundary and approval gateway.
- **Prerequisites:** Phase 5 complete.
- **Deliverables:**
  - Permission evaluator intercepting tool calls.
  - Approval request generator with unique cryptographic tokens.
  - Interactive approval endpoint and CLI/Web resolver.
  - Append-only `audit_log` with security tripwires.
- **Testing Strategy:** Attempt unauthorized Tier 2 operations and verify execution block until explicit approval token is submitted.
- **Acceptance Criteria:** 100% of financial, destructive, and external mutations blocked pending approval.

---

### PHASE 7: Remote Communication (Telegram Gateway)
- **Objective:** Build the 24/7 mobile access gateway via Telegram Bot.
- **Prerequisites:** Phase 6 complete.
- **Deliverables:**
  - Telegram bot daemon using long-polling.
  - User whitelist validator (`ALLOWED_TELEGRAM_USER_IDS`).
  - Command handlers (`/status`, `/tasks`, `/report`, `/pause`, `/resume`).
  - Interactive inline approval buttons (`[Approve]`, `[Reject]`).
  - Push notification dispatcher for urgent alerts and milestone summaries.
- **Testing Strategy:** Send remote command from mobile; verify bot response; test inline approval button resumption of a suspended task.
- **Acceptance Criteria:** Sub-2-second Telegram response time; 1-tap approval resumes task successfully.

---

### PHASE 8: Specialized Agent Ecosystem (10 Agents)
- **Objective:** Sequentially roll out the 10 specialized agent implementations.
- **Prerequisites:** Phase 7 complete.
- **Deliverables:**
  - Agent 1: Research Agent (`src/agents/research_agent.ts`)
  - Agent 2: Software Development Agent (`src/agents/software_agent.ts`)
  - Agents 3, 4, 5: Social Media Agents (Facebook, Instagram, YouTube)
  - Agents 6 & 7: Video Production & Image Processing Agents
  - Agents 8, 9, 10: Website Management, Content Planning, and Data Analysis Agents
  - TRISUTRO e-commerce cart recovery integration.
- **Testing Strategy:** Domain-specific benchmark tests for each agent.
- **Acceptance Criteria:** Each agent executes its scoped task and produces verified artifacts.

---

### PHASE 9: Windows PC Production Runtime & Packaging
- **Objective:** Package and install the permanent background service on the owner's Windows PC.
- **Prerequisites:** Phase 8 complete.
- **Deliverables:**
  - Windows installation package (`install.bat` / PowerShell installer).
  - PM2 ecosystem file / NSSM Windows Service configuration.
  - Automated database backup script (`scripts/backup_db.bat`) registered with Windows Task Scheduler.
  - System health check endpoint (`/api/health`).
- **Testing Strategy:** Reboot Windows PC and verify JARVIS auto-starts, connects to Telegram, and resumes background operations.
- **Acceptance Criteria:** Unattended boot-to-operational cycle verified.

---

### PHASE 10: Continuous Improvement & Self-Evolution
- **Objective:** Automated feedback loops, weekly executive reporting, cost-routing tuning, and autonomous knowledge base updates.
- **Deliverables:**
  - Weekly executive business report generator.
  - Retrospective learning pipeline: analysis of completed tasks, failure modes, and optimization suggestions.
  - Automated SQLite index maintenance and Markdown knowledge compaction.
