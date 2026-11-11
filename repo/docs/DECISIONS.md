# Architectural & Operational Decision Log

**Project:** JARVIS (TRISUTRO Virtual CEO & Autonomous Executive AI Operating Partner)  
**Rule:** Historical decisions must never be silently deleted or rewritten. Superseded decisions are marked with `[SUPERSEDED]` alongside their transition rationale. Current authoritative decisions are marked `[ACTIVE]`.

---

## Historical Decisions (October 2025 – October 2026)

### DEC-001: Adopt Partner / Virtual CEO as the Core Identity
- **Status:** `[ACTIVE]` (Confirmed in Master Blueprint v2.0)
- **Date:** 2025-10-05
- **Decision:** Establish role as "Partner" / "Virtual CEO" — personal AI mentor, technical architect, researcher, and long-term collaborator for TRISUTRO.
- **Rationale:** Sets the tone as an accountable executive operator rather than a passive chatbot.
- **Impact:** Shapes all operational procedures and responsibility boundaries.

### DEC-002: Master Blueprint Design Before Multi-Agent Build
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-05
- **Decision:** Do not spawn multiple runtime agents until the unified architecture and foundation are solidly planned and verified.
- **Rationale:** Multi-agent systems without strong orchestration, shared contracts, and durable memory result in chaotic execution.
- **Impact:** Enforces structured, dependency-aware phased rollouts.

### DEC-003: Dual-Layer Knowledge Preservation
- **Status:** `[ACTIVE]` (Expanded into Tri-Layer Hybrid Memory in DEC-015)
- **Date:** 2025-10-05
- **Decision:** Store detailed documentation in workspace Git files and high-density facts in auto-loaded memory.
- **Rationale:** Balances deep reference docs with fast session startup context.

### DEC-004: Knowledge Preservation as Top Priority
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-05
- **Decision:** Prioritize permanent memory and continuity across reboots, models, and sessions as the bedrock milestone.
- **Rationale:** An executive partner is useless if it suffers from amnesia between sessions.

### DEC-005: Initialize Git Repository from Day One
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-05
- **Decision:** Maintain full version control of all project knowledge, code, and configurations.
- **Rationale:** Enables historical auditing, branching, rollback, and cross-machine synchronization.

### DEC-006: Ask One Question at a Time During Design
- **Status:** `[SUPERSEDED]` by Master Project Directive (2026-11-08)
- **Date:** 2025-10-05
- **Original Decision:** Restrict interaction to asking only one question at a time during architecture design.
- **Transition Rationale:** As CTO and Lead Architect under the Master Project Directive, JARVIS is mandated to formulate comprehensive architectural solutions, research alternatives, and present complete proposals for executive review rather than stalling progress with piecemeal questions.

### DEC-007: Adopt Virtual CEO Operating Blueprint v1.0
- **Status:** `[SUPERSEDED]` by Master Blueprint v2.0 (DEC-022)
- **Date:** 2025-10-29
- **Original Decision:** Adopt the initial Virtual CEO operating specification.
- **Transition Rationale:** Consolidated into `docs/MASTER_BLUEPRINT.md` v2.0 to incorporate multi-provider routing, SQLite database, Telegram gateway, and Windows runtime.

### DEC-008: Align AGENTS.md with Operating Blueprint
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-29
- **Decision:** Replace placeholder instructions with authoritative operating procedures and safety boundaries in `AGENTS.md`.

### DEC-009: Establish Dedicated Agent Specification Directory
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-29
- **Decision:** Maintain agent instructions and contracts under `agents/` (`agents/partner/`, `agents/coding-agent/`).

### DEC-010: Formalize Session Workflow in Knowledge Preservation
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-29
- **Decision:** Enforce structured session start (inspect memory $\to$ check git $\to$ identify task) and session end (update progress $\to$ record decisions $\to$ commit) protocols.

### DEC-011: Document Platform Single-Agent Limitation
- **Status:** `[SUPERSEDED]` by DEC-014 and DEC-020 (2026-11-08)
- **Date:** 2025-10-29
- **Original Decision:** Record that the AndroidHarness phone environment only supports single-agent tool execution.
- **Transition Rationale:** AndroidHarness was retired as the development environment. In the new architecture (Google AI Studio for development and Windows PC for local persistent runtime), genuine multi-agent orchestration via independent processes and worker pools is fully supported.

### DEC-012: Prioritize WhatsApp Abandoned Cart Recovery as First Business Project
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-29
- **Decision:** Prioritize TRISUTRO clothing e-commerce abandoned cart recovery on WhatsApp as the initial business initiative.
- **Rationale:** Highest direct revenue recovery, leverages existing WhatsApp customer ordering habit in Bangladesh, low capital requirement.

### DEC-013: Adopt Two-Phase Approach for WhatsApp Cart Recovery
- **Status:** `[ACTIVE]`
- **Date:** 2025-10-29
- **Decision:** Split cart recovery into Phase 0 (Zero-cost manual recovery via `localStorage` persistence and 24hr free service window follow-ups) and Phase 1 (Automated Meta Cloud API integration conditional on Phase 0 ROI validation).
- **Rationale:** Validates customer demand before investing in paid Meta message templates and serverless infrastructure.

---

## Authoritative Master Directive Decisions (November 2026)

### DEC-014: Exclusive Development Hub & Local Production Runtime Separation
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** 
  1. **Google AI Studio** is the exclusive AI-assisted development, planning, refactoring, code generation, and web dashboard management hub. Do not introduce OpenCode or Antigravity.
  2. **Owner's Windows PC** is the persistent production deployment and runtime environment.
- **Rationale:** Clear separation of concerns. AI Studio provides cutting-edge developer velocity; Windows PC provides 24/7 background persistence, local SQLite performance, and direct Telegram polling.

### DEC-015: Tri-Layer Hybrid Memory Architecture
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Deploy a tri-layer memory model:
  - Layer 1: Markdown + Git for durable, reviewable long-term institutional knowledge.
  - Layer 2: SQLite database (`data/jarvis_operational.db`) for high-velocity structured tasks, DAG checkpoints, agent heartbeats, and audit logs.
  - Layer 3: Context cache (`.harness/memory.md`) auto-surfaced into LLM conversation windows.
- **Rationale:** Markdown alone cannot handle transactional concurrency or sub-second task queuing; SQLite alone lacks version-controlled human readability and Git diff review.

### DEC-016: Multi-Provider LLM Engine Architecture
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Build an abstract model router supporting:
  1. Google Gemini 2.5 Flash / Pro (Primary).
  2. Groq Llama-3.3-70B-Versatile (High-speed free tier).
  3. OpenRouter fallback chain.
  4. Local Ollama models (Offline resilience).
- **Rationale:** Prevents single-vendor dependency, handles rate limits gracefully via automated fallback, and minimizes operational costs.

### DEC-017: Directed Acyclic Graph (DAG) Hybrid Task Execution
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Structure complex workflows as a task DAG. Independent tasks execute concurrently; dependent tasks execute sequentially. State transitions are checkpointed in SQLite.
- **Rationale:** Maximizes throughput while guaranteeing deterministic execution, idempotency, and resume-after-crash capabilities.

### DEC-018: Telegram Bot as Primary Remote Interface
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Integrate a Telegram Bot as the primary remote mobile interface for sending natural language commands, receiving milestone alerts, and executing 1-tap approvals.
- **Rationale:** The owner manages operations primarily from a mobile phone; Telegram provides a secure, zero-cost, persistent notification channel.

### DEC-019: Two-Tier Autonomy & Safety Framework
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Enforce strict permission boundaries:
  - *Tier 1 (Autonomous):* Read files, write docs, run tests, research, low-risk reversible actions.
  - *Tier 2 (Approval-Gated):* Spending money, paid APIs, security/secret changes, destructive actions, customer-facing publishing, pushing directly to production branches.
- **Rationale:** Empowers JARVIS to operate efficiently without micro-management while protecting the owner's financial assets, customer trust, and critical data.

### DEC-020: 10-Agent Ecosystem Phased Rollout
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Build the core agent framework first, then roll out 10 specialized agents sequentially:
  1. Research Agent
  2. Software Development Agent
  3. Facebook Automation Agent
  4. Instagram Automation Agent
  5. YouTube Automation Agent
  6. Video Production Agent
  7. Image Processing Agent
  8. Website Management Agent
  9. Content Planning Agent
  10. Data Analysis Agent
- **Rationale:** Avoids scattered, half-baked implementations by stabilizing core interfaces before expanding capability.

### DEC-021: Direct Authenticated GitHub Connection via GitHub CLI Device Flow
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Authenticate Google AI Studio to `https://github.com/sakibtrisutro/jarves.git` via the official GitHub CLI OAuth Device Code Flow (`gh auth login -w` $\to$ `https://github.com/login/device`).
- **Rationale:** Zero exposure of user passwords or personal access tokens in chat, verified token scopes (`repo`, `read:org`, `gist`), and automated credential helper configuration.

### DEC-022: Unification of Authoritative Master Blueprint
- **Status:** `[ACTIVE]`
- **Date:** 2026-11-08
- **Decision:** Consolidate `docs/JARVIS_MASTER_BLUEPRINT.md` and legacy `docs/MASTER_BLUEPRINT.md` into `docs/MASTER_BLUEPRINT.md` (Version 2.0.0) as the sole authoritative specification.
- **Rationale:** Eliminates documentation duality and provides a single, unambiguous source of truth for the entire development lifecycle.
