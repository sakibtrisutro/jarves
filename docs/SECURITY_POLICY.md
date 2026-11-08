# JARVIS Security Policy & Autonomy Framework

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. PURPOSE & SECURITY PHILOSOPHY

JARVIS is designed to maximize executive operational autonomy while ensuring zero risk to the owner's finances, credentials, critical data, or business reputation. 

The security architecture rests on three core pillars:
1. **Explicit Autonomy Boundaries (Two-Tier Model):** Clear division between routine autonomous work and high-impact actions requiring human authorization.
2. **Zero In-Band Secret Exposure:** Secrets and private keys are never stored in plain text, never committed to Git, never saved in SQLite, and never exposed in chat transcripts.
3. **Immutable Audit Trails:** Every tool execution, approval decision, and external API mutation is logged in an append-only audit stream.

---

## 2. TWO-TIER PERMISSION & AUTONOMY MATRIX

```
+-----------------------------------------------------------------------------------+
|                           AUTONOMY & APPROVAL TIERS                               |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+-----------------------+       +-----------------------+       +-----------------------+
|        TIER 1         |       |        TIER 2         |       |       PROHIBITED      |
|  AUTONOMOUS EXECUTION |       |  MANDATORY APPROVAL   |       |   ZERO-TOLERANCE OPS  |
|  (Proceed Instantly)  |       |  (Telegram / Web Gate)|       | (Blocked by Sandbox)  |
+-----------------------+       +-----------------------+       +-----------------------+
| • Read & analyze files|       | • Spending money / ads|       | • Force-push to main  |
| • Run unit tests      |       | • Paid APIs / plans   |       | • Hardcoding secrets  |
| • Write/update docs   |       | • Security policy mod |       | • Deleting git remotes|
| • Local branch commits|       | • Deleting user data  |       | • Bypassing approval  |
| • Web search/research |       | • External messaging  |       | • Running unverified  |
| • SQLite state updates|       | • Push to prod `main` |       |   root exploits       |
+-----------------------+       +-----------------------+       +-----------------------+
```

### Detailed Permission Matrix

| Operation Category | Specific Action | Permission Tier | Enforcement Mechanism |
|---|---|---|---|
| **File System** | Read workspace code and documentation | **Tier 1 (Autonomous)** | Allowed by sandbox |
| **File System** | Create new docs, test files, scratch modules | **Tier 1 (Autonomous)** | Allowed by sandbox |
| **File System** | Overwrite existing core files / delete files | **Tier 2 (Approval)** | Security Gateway prompt |
| **Version Control** | `git status`, `diff`, `log`, `branch` | **Tier 1 (Autonomous)** | Allowed by sandbox |
| **Version Control** | `git commit` to feature/docs branches | **Tier 1 (Autonomous)** | Allowed by sandbox |
| **Version Control** | `git push` to remote feature branches | **Tier 1 (Autonomous)** | Allowed with remote check |
| **Version Control** | `git push origin main` (production) | **Tier 2 (Approval)** | Security Gateway prompt |
| **Version Control** | `git push --force` or deleting branches | **PROHIBITED** | Hardcoded block in Git tool |
| **Finance & API** | Invoking free tier endpoints (Gemini, Groq) | **Tier 1 (Autonomous)** | Tracked in SQLite |
| **Finance & API** | Invoking paid third-party APIs / spending USD | **Tier 2 (Approval)** | Interactive Telegram button |
| **Finance & API** | Buying ad credits (Meta/Google Ads) | **Tier 2 (Approval)** | Interactive Telegram button |
| **Database** | Insert/Update task queue, checkpoints, logs | **Tier 1 (Autonomous)** | SQLite WAL engine |
| **Database** | `DROP TABLE`, deleting operational tables | **Tier 2 (Approval)** | Security Gateway prompt |
| **External Contact** | Fetching public web pages & APIs | **Tier 1 (Autonomous)** | Allowed by sandbox |
| **External Contact** | Sending live customer WhatsApp messages | **Tier 2 (Approval)** | Approval queue + preview |
| **External Contact** | Publishing public social media posts | **Tier 2 (Approval)** | Approval queue + preview |

---

## 3. APPROVAL GATEWAY WORKFLOW

When an agent requests a Tier 2 action:

```
[Agent Requests Tier 2 Action]
            │
            ▼
[Security Gateway Intercepts] ──► Suspends task execution (`status = waiting_approval`)
            │
            ▼
[Generate Approval Token] ─────► Stores payload in SQLite `approval_requests`
            │
            ▼
[Dispatch Remote Alert] ───────► Sends Telegram Push + Web Dashboard Notification
                                  • Action Summary & Target Resource
                                  • Cost / Risk Assessment
                                  • Inline Buttons: [Approve] / [Reject]
            │
            ├───(Owner clicks [Reject])───► Mark `rejected`, task aborts safely
            │
            ▼ (Owner clicks [Approve])
[Cryptographic Validation] ────► Verify token & owner Telegram User ID
            │
            ▼
[Execute Action & Log] ────────► Resume task, execute action, append to `audit_log`
```

---

## 4. SECRETS & CREDENTIAL MANAGEMENT

1. **Local Environment Variables:** Secrets are loaded from `.env` on the host machine and never checked into source control (`.gitignore` enforces exclusions).
2. **Credential Storage:**
   - GitHub authentication is stored securely in host OS user configurations (`~/.config/gh/hosts.yml` or Windows Credential Manager).
   - Database credentials and API tokens use environment variable injection only.
3. **Chat Transcript Sanitization:** Loggers and error reporters automatically redact patterns matching API keys (`gho_*`, `AIza*`, `sk-*`, `bearer *`).

---

## 5. AUDIT LOGGING SPECIFICATION

The `audit_log` table in SQLite is strictly append-only:
- Every record includes: timestamp, event type, actor ID (JARVIS Core or specialized agent), target resource, summary of mutations, and result status.
- Audit logs are included in daily database backups.
- Any attempt to truncate or delete from `audit_log` triggers an immediate security alert.
