# Telegram Remote Gateway Specification

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. PURPOSE & ARCHITECTURE

The Telegram Remote Gateway provides the owner (`sakibtrisutro`) with seamless, 24/7 mobile access to JARVIS from any location. 

Through Telegram, the owner can:
1. Issue natural language commands and executive directions.
2. Query system status, active task DAGs, and agent performance.
3. Receive real-time push alerts on completed milestones, errors, or business events.
4. Execute 1-tap approvals for Tier 2 operations using inline keyboard buttons.

```
+-----------------------------------------------------------------------------------+
|                        TELEGRAM GATEWAY ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+
                                          |
                      Owner's Telegram Mobile / Desktop
                                          |
                        HTTPS (Telegram Bot API v7.0)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     JARVIS GATEWAY DAEMON (Windows PC Runtime)                    |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Polling / Webhook  |   | Security Whitelist    |   | Command & Intent       |  |
|  | Listener           |   | Authenticator         |   | Parser                 |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            +--------------------------+---------------------------+               |
|                                       |                                           |
|                                       v                                           |
|  +-----------------------------------------------------------------------------+  |
|  |                   Central Orchestrator Event Bus Bridge                     |  |
|  +------------------------------------+----------------------------------------+  |
|                                       |                                           |
|            +--------------------------+---------------------------+               |
|            |                                                      |               |
|            v                                                      v               |
|  [Incoming Commands / Approvals]                         [Outgoing Push Alerts]   |
+-----------------------------------------------------------------------------------+
```

---

## 2. SECURITY & AUTHENTICATION WHITELIST

To prevent unauthorized remote access:
- **Strict User Whitelist:** The gateway verifies the sender's Telegram `user_id` against `ALLOWED_TELEGRAM_USER_IDS` in `.env`. Messages from unverified accounts are immediately discarded and logged in the SQLite `audit_log`.
- **Bot Token Protection:** The `TELEGRAM_BOT_TOKEN` is loaded securely from environment variables.
- **Cryptographic Approval Tokens:** Interactive approval callbacks pass unique, single-use approval IDs verified against the SQLite `approval_requests` table.

---

## 3. COMMAND DICTIONARY

| Command | Arguments | Description |
|---|---|---|
| `/status` | None | Displays overall system health, active agents, memory stats, and uptime. |
| `/tasks` | `[status]` | Lists current tasks in the DAG (running, blocked, pending). |
| `/approve` | `<request_id>` | Manually approves a pending Tier 2 request. |
| `/reject` | `<request_id>` | Rejects a pending Tier 2 request and halts the associated task. |
| `/report` | `[daily|weekly]`| Generates an executive summary of completed work, sales, and token spend. |
| `/pause` | None | Temporarily pauses autonomous task scheduling. |
| `/resume` | None | Resumes normal autonomous operations. |
| `/help` | None | Displays available commands and quick-reference syntax. |

*Natural Language Parsing:* Any text message that does not start with `/` is routed to the Executive Orchestrator as a conversational instruction or high-level strategic directive.

---

## 4. INTERACTIVE APPROVAL WORKFLOW (INLINE BUTTONS)

When a Tier 2 action is requested, the Telegram Gateway formats an urgent message with inline action buttons:

```
🚨 APPROVAL REQUIRED: TIER 2 ACTION
────────────────────────────────────
Action: Paid API Deployment
Target: Meta WhatsApp Cloud API
Estimated Cost: ~$0.007 / msg (Bangladesh Utility Tier)
Requested By: Software Development Agent
Reason: Automating WhatsApp cart recovery for 24 abandoned sessions.

[ ✅ Approve ]          [ ❌ Reject ]
```

- Clicking **[ Approve ]** triggers a callback query that validates the user ID, marks the request `approved` in SQLite, notifies the owner with a confirmation toast, and immediately resumes the suspended task.
- Clicking **[ Reject ]** marks the request `rejected`, aborts the subtask safely, and updates the task state machine.

---

## 5. NOTIFICATION PRIORITY TIERS

| Priority Tier | Delivery Mechanism | Trigger Examples |
|---|---|---|
| **Low / Informational** | Batched Daily Summary | Routine task completion, minor documentation edits |
| **Normal** | Push Notification (Silent) | Milestone phase completion, new cart recovery event |
| **Urgent** | Push Notification (With Sound) | Tier 2 approval request, task failure retry escalation |
| **Critical** | Persistent Alert with Sound | Unhandled process error, network disconnection, database corruption warning |
