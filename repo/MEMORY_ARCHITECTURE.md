# JARVIS — Memory & Multi-User Isolation Architecture

JARVIS maintains isolated persistent memory and context for multi-user personal assistant workflows.

## User Isolation
- Dedicated accounts for **Sakib** (Owner / Virtual CEO) and **Sanjida** (co-executive).
- Distinct voice personalities:
  - Sakib: Male (Composed, executive, authoritative)
  - Sanjida: Female (Warm, professional, efficient)
- Isolated memory stores stored in SQLite database (`jarvis_operational.db`).

## Memory Retention Types
1. **User Preferences & Facts**: Saved key-value pairs (e.g. clothing preferences, workflow habits).
2. **Conversation Context**: SQLite WAL-backed conversation log (`conversations` and `messages` tables).
3. **Task & Action Logs**: Subsystem diagnostic event logs (`system_events` table).
