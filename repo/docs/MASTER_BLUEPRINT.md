# JARVIS — Canonical Master Blueprint v2.0

**Status:** ACTIVE — Single Authoritative Source of Truth  
**Version:** 2.0.0  
**Last Consolidated:** 2026-11-08  
**Project Identity:** JARVIS — TRISUTRO Virtual CEO & Autonomous Executive AI Operating Partner  
**Owner:** TRISUTRO (`sakib.trisutro@gmail.com`)  
**Development Hub:** Google AI Studio (Exclusive Development, Testing & Management Hub)  
**Production Runtime:** Windows PC (Persistent Background Daemon & Local Execution Node)  
**Authoritative Repository:** https://github.com/sakibtrisutro/jarves.git (`main` branch)  

---

## 1. VISION & CORE IDENTITY

### 1.1 Mission
JARVIS is the persistent AI partner, executive mentor, researcher, technical architect, autonomous collaborator, and central coordinator of a multi-agent automation ecosystem for TRISUTRO. Inspired by the operational intelligence, composure, and proactive initiative of J.A.R.V.I.S., the system is built with practical, modern software technologies.

JARVIS is not merely a conversational assistant or a transient web app. JARVIS acts as an accountable virtual executive that:
1. Deeply understands the owner's strategic and commercial objectives.
2. Formulates, plans, and decomposes complex goals into dependency-aware tasks.
3. Conducts rigorous research distinguishing verified technical facts from ungrounded assumptions.
4. Manages projects and autonomously executes authorized work.
5. Coordinates a specialized multi-agent ecosystem.
6. Maintains permanent institutional memory across sessions, reboots, and provider migrations.
7. Proactively reports progress, flags risks, and requests approvals via remote channels (Telegram).

### 1.2 Core Operating Principles
1. **Understand Objectives Before Acting:** Analyze intent, scope, and dependencies before drafting solutions or running commands.
2. **Evidence-Based Verification:** Never claim a tool, integration, test, or workflow works without verified runtime evidence.
3. **Preserve Continuity:** Ground all knowledge in version-controlled documentation and transactional databases.
4. **Step-by-Step Transparency:** Provide concise, direct technical reasoning and progress reports.
5. **Cost & Resource Efficiency:** Prioritize reliable free and low-cost models/tools (Gemini Flash, Groq, local models) with fallback chains. Never assume unlimited free quotas.
6. **Strict Safety & Autonomy Boundaries:** Maximize autonomy on routine, low-risk, reversible tasks; enforce mandatory approval gates before spending money, deleting data, altering security rules, or publishing externally.
7. **Portability & Independence:** Keep core JARVIS runtime portable, standalone, and independently runnable on the owner's Windows PC.

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

JARVIS employs a decoupled, modular architecture cleanly separating development/monitoring from local production execution:

```
                      +-------------------------------------------------------------+
                      |                      TRISUTRO OWNER                         |
                      +------------------+-----------------------+------------------+
                                         |                       |
                         Web Dashboard / Control Center   Telegram Remote Gateway
                         (AI Studio Preview / Localhost)  (Mobile Commands & Approvals)
                                         |                       |
                                         v                       v
+-----------------------------------------------------------------------------------+
|                        JARVIS CORE ORCHESTRATION ENGINE                           |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Executive Manager  |   | Autonomy & Approval   |   | Tool Sandbox &         |  |
|  | & Goal Decomposer  |   | Security Gateway      |   | Command Runner         |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|  +---------v----------+   +-----------v-----------+   +-----------v------------+  |
|  | Hybrid Task DAG    |   | Multi-Provider Router |   | Hybrid Memory Manager  |  |
|  | Scheduler & State  |   | (Gemini / Groq /      |   | (Git Markdown +        |  |
|  | Machine            |   |  OpenRouter / Ollama) |   |  SQLite Database)      |  |
|  +---------+----------+   +-----------------------+   +-----------+------------+  |
+------------|------------------------------------------------------|---------------+
             |                                                      |
             v                                                      v
+----------------------------------------+         +--------------------------------+
|       SPECIALIZED AGENT ECOSYSTEM      |         |     HYBRID MEMORY STORAGE      |
|                                        |         |                                |
| 1. Research Agent                      |         | Layer A: Markdown Files (Git)  |
| 2. Software Development Agent          |         | - Long-term architectural docs |
| 3. Facebook Automation Agent           |         | - Strategic plans & decisions  |
| 4. Instagram Automation Agent          |         | - Business specifications      |
| 5. YouTube Automation Agent            |         |                                |
| 6. Video Production Agent              |         | Layer B: SQLite Database       |
| 7. Image Processing Agent              |         | - Structured task queue & state|
| 8. Website Management Agent            |         | - Execution checkpoints        |
| 9. Content Planning Agent              |         | - Agent telemetry & audit log  |
| 10. Data Analysis Agent                |         | - Cost & token accounting      |
+----------------------------------------+         +--------------------------------+
```

---

## 3. HYBRID MEMORY ARCHITECTURE

Memory persistence is guaranteed through two complementary engines:

### 3.1 Layer A — Durable Knowledge Base (Markdown + Git)
- **Role:** Human-readable, version-controlled repository of institutional knowledge, strategic plans, research papers, and technical decisions.
- **Storage:** `docs/`, `agents/`, `projects/`, `.harness/`.
- **Key Artifacts:**
  - `docs/MASTER_BLUEPRINT.md` — Authoritative blueprint.
  - `docs/DECISIONS.md` — Immutable log of all architectural decisions with rationales.
  - `docs/PROGRESS.md` — Phased roadmap status and verification evidence.
  - `docs/KNOWLEDGE_PRESERVATION.md` — Memory protocols and sync specifications.
  - `.harness/memory.md` — Auto-surfaced core facts loaded into prompt context.
  - `projects/*/` — Domain specifications (e.g. TRISUTRO WhatsApp cart recovery).

### 3.2 Layer B — Operational Database (SQLite)
- **Role:** High-velocity, transactional, relational persistence across process restarts.
- **Location:** `data/jarvis_operational.db` (with scheduled automated backups).
- **Core Tables:**
  - `tasks`: Task ID, title, status (`pending`, `running`, `completed`, `failed`, `blocked`), priority, retry count, input payload, output summary.
  - `task_dependencies`: Parent task, child task, dependency type (`finish-to-start`).
  - `checkpoints`: Step snapshot, serialized state, recovery context, timestamp.
  - `agent_states`: Active agent registration, heartbeats, assigned subtasks, performance metrics.
  - `approval_requests`: Action description, risk tier, payload, status (`pending`, `approved`, `rejected`), requested_at, resolved_at.
  - `audit_log`: Immutable chronological log of all tool executions, security events, and external API requests.
  - `token_usage`: Provider, model, input tokens, output tokens, estimated cost, task attribution.

---

## 4. HYBRID TASK EXECUTION ENGINE

JARVIS organizes and executes tasks as a **Directed Acyclic Graph (DAG)**:
1. **Parallel Execution:** Tasks with no shared dependencies execute concurrently across worker threads or sub-processes.
2. **Sequential Execution:** Dependent tasks wait until prerequisite tasks report verified completion (`status = completed`).
3. **Deterministic Checkpoints:** Every state transition records a checkpoint in SQLite. If a process terminates or an error occurs, the task resumes from the latest valid checkpoint rather than repeating completed operations.
4. **Retry & Backoff:** Transient failures (e.g. rate limits, network timeouts) trigger exponential backoff retries (maximum 3 attempts). Permanent logic errors halt execution, mark the task `blocked`, and alert the owner.
5. **Idempotency:** Every automated mutation carries a unique idempotency key preventing duplicate orders, messages, or payments.

---

## 5. MULTI-PROVIDER LLM ARCHITECTURE

JARVIS avoids vendor lock-in by routing prompts through a unified provider abstraction:

```
                          User Request / Subtask
                                    |
                                    v
                     +------------------------------+
                     |    Model Router & Tiering    |
                     +--------------+---------------+
                                    |
        +---------------------------+---------------------------+
        | Tier 1: Fast / Low Cost   | Tier 2: Deep Reasoning    | Tier 3: Offline / Local
        v                           v                           v
  [Gemini 2.5 Flash]       [Gemini 2.5 Pro]               [Ollama Local]
  [Groq Llama-3.3-70B]     [OpenRouter Claude 3.5]        [Llama 3.2 / Qwen 2.5]
        |                           |                           |
        +---------------------------+---------------------------+
                                    |
                                    v
                     +------------------------------+
                     | Provider Abstraction Layer   |
                     | - Normalized Tool Schemas    |
                     | - Automatic Fallback Cascade |
                     | - Token & Cost Accounting    |
                     +------------------------------+
```

### 5.1 Provider Hierarchy & Fallback Chain
1. **Primary Free / Low-Cost:** Google Gemini 2.5 Flash (via official `@google/genai` TypeScript SDK / Python SDK).
2. **Ultra-Low Latency Free Tier:** Groq (Llama-3.3-70B-Versatile) for rapid triage and structured schema extraction.
3. **Advanced Strategic Reasoning:** Gemini 2.5 Pro / OpenRouter flagship models (when complex planning or multi-step logic requires it).
4. **Local Fallback:** Ollama running locally on the owner's Windows PC for zero-cost, fully offline operational resilience.

### 5.2 Routing & Schema Normalization
- The engine sanitizes tool calling schemas across providers (e.g. automatically stripping unsupported fields like `additionalProperties` for Gemini compatibility).
- Rate-limit errors (`429 Too Many Requests`) automatically cascade to the next prioritized provider in the chain without failing the user's task.
- All token consumption and approximate costs are logged in SQLite.

---

## 6. AUTONOMY & APPROVAL SAFETY BOUNDARIES

JARVIS enforces maximum autonomous efficiency while upholding strict safety boundaries:

### 6.1 Tier 1: Autonomous Execution (No Approval Needed)
- Reading, searching, and analyzing repository files.
- Updating documentation, task logs, progress trackers, and memory records.
- Creating feature branches and local Git commits.
- Running unit tests, linters, and verification scripts.
- Conducting web research and reading public API documentation.
- Executing read-only diagnostics and safe, reversible operations.

### 6.2 Tier 2: Approval Gate Required (Mandatory Explicit Authorization)
The engine blocks execution and issues an interactive approval request via Telegram and Dashboard before:
1. Spending financial funds or incurring paid subscription costs.
2. Invoking paid third-party APIs beyond verified free tiers.
3. Modifying security policies, environment secrets, or credentials.
4. Performing destructive operations (deleting databases, dropping tables, removing git branches, overwriting critical files).
5. Publishing external communications, messaging customers, or pushing code directly to production `main` branches.

Every approval request contains: Action Summary, Target Resource, Cost/Risk Assessment, and one-click `[Approve]` / `[Reject]` actions.

---

## 7. SPECIALIZED MULTI-AGENT ECOSYSTEM

JARVIS acts as the Virtual CEO orchestrating 10 specialized agent personas:

| Agent | Responsibility | Core Tools |
|---|---|---|
| **1. Research Agent** | Deep technical and market investigation, fact-checking, source synthesis | Web Search, Browser Scraper, Doc Parser |
| **2. Software Development Agent** | Code implementation, unit testing, refactoring, bug fixes, code reviews | Node/Python Toolchain, Git, Linters, Test Runners |
| **3. Facebook Automation Agent** | Page management, scheduled posting, comment moderation, ad analytics | Meta Graph API, Webhook Receiver |
| **4. Instagram Automation Agent** | Visual publishing, caption generation, DM triage, engagement tracking | Instagram Basic/Graph API |
| **5. YouTube Automation Agent** | Video metadata SEO, thumbnail scheduling, comment sentiment analysis | YouTube Data API v3 |
| **6. Video Production Agent** | Automated video scriptwriting, scene composition, subtitle rendering | FFMPEG, MoviePy, TTS Services |
| **7. Image Processing Agent** | Product asset resizing, background removal, banner composition | Sharp, Pillow, Canvas |
| **8. Website Management Agent** | E-commerce catalog sync, uptime monitoring, cart recovery tracking | Web Scrapers, REST APIs, Supabase/DB tools |
| **9. Content Planning Agent** | Editorial calendar, omnichannel content pipelines, trend analysis | Calendar Sync, RSS/Social Trends |
| **10. Data Analysis Agent** | E-commerce sales metrics, conversion funnel analysis, financial reports | SQLite, Pandas, Chart Generators |

*Rollout Rule:* Agents are built incrementally upon the unified Base Agent Contract. The Core Orchestration Engine and foundation must be stabilized before rolling out specialized agents.

---

## 8. TELEGRAM REMOTE GATEWAY

Telegram acts as the primary bidirectional remote communication interface:
- **Remote Commands:** Send natural language instructions or bot commands (`/status`, `/tasks`, `/approve <id>`, `/report`, `/pause`) from mobile phone.
- **Interactive Approvals:** Tier 2 actions deliver push notifications with inline keyboard buttons (`[Approve]`, `[Reject]`) for 1-tap mobile authorization.
- **Proactive Alerts:** Critical errors, completed milestones, or cart recovery events trigger immediate notifications.
- **Security:** Strict user ID whitelisting ensuring only the verified owner (`sakibtrisutro`) can issue commands or approve operations.

---

## 9. PRODUCTION RUNTIME & DEPLOYMENT (WINDOWS PC)

The permanent production runtime executes directly on the owner's Windows PC:
- **Process Model:** Persistent Node.js/TypeScript background process managed by PM2 or as a native Windows Service (via NSSM).
- **Auto-Start & Resilience:** Configured to launch automatically on Windows boot, with automatic restart upon unhandled exceptions.
- **Data Safety:** Local SQLite database with automated hourly WAL checkpoints and daily snapshots synced to secure backup storage.
- **Development vs Runtime Separation:** Google AI Studio is used for code changes, architecture design, and management. Pushed Git commits are pulled and executed on the Windows PC runtime.

---

## 10. ACTIVE COMMERCIAL INITIATIVE: TRISUTRO

JARVIS maintains active management over TRISUTRO commercial initiatives:
- **Business:** TRISUTRO — Unstitched Pakistani-inspired luxury 3-piece clothing (`trisutro.bond`).
- **Active Project:** WhatsApp Abandoned Cart Recovery (`projects/trisutro-whatsapp-cart-recovery/`).
  - **Phase 0 (Active):** Manual validation via `localStorage` cart persistence on website; manual follow-ups within the free 24-hour service window.
  - **Phase 1 (Conditional):** Automated webhook and Meta WhatsApp Cloud API integration once Phase 0 validates >15% abandonment and >10% recovery rates.

---

## 11. ACCEPTANCE CRITERIA

Phase 0 is complete when:
1. Direct authenticated GitHub connection is established and verified.
2. All historical and new architectural specifications are consolidated into authoritative documentation without data loss.
3. Cross-document consistency is verified across `MASTER_BLUEPRINT.md`, `DECISIONS.md`, `PROGRESS.md`, `KNOWLEDGE_PRESERVATION.md`, and all supporting documents.
4. Documentation changes are committed and pushed to the remote repository.
5. Owner reviews and signs off on the final architecture before code implementation begins.
