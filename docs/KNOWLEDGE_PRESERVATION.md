# Knowledge Preservation System

**Goal:** Reliable system for preserving project knowledge across chats, models, and devices.

## Storage Strategy (Dual-Layer)
Following user preference: "Both (workspace for details, memory for key facts)"

### Layer 1: Workspace Files (Detailed, Version Controlled)
Location: `docs/`, `memory_system/`, `projects/`, `tasks/` in workspace root
- `MASTER_BLUEPRINT.md` - Overall vision, architecture, milestones
- `KNOWLEDGE_PRESERVATION.md` - This document
- `DECISIONS.md` - All important decisions with context and rationale
- `PROGRESS.md` - Current state, completed items, blockers, next steps
- `LEARNINGS.md` - Technical insights, gotchas, solutions found
- `RESOURCES.md` - Useful links, repos, docs, tools
- `agents/partner/OPERATING_INSTRUCTIONS.md` - Partner procedures
- `agents/coding-agent/SPECIFICATION.md` - Coding Agent specification
- `projects/` - Individual project plans and deliverables
- `tasks/` - Task records, status, verification, approvals

All tracked in git.

### Layer 2: Memory System (Core Facts, Auto-Loaded)
- Core memory: `.harness/memory.md` - Critical facts always in context
- Topic files: `.harness/memory/*.md` - Focused topics loaded on demand
- Use `memory_read/write/search` for direct access
- Use `remember/recall` for structured operations
- Keep entries short and standalone

## Capture Guidelines
**When to save to workspace files (detailed):**
- Major decisions with long rationale
- Multi-step plans and roadmaps
- Complex technical solutions
- Research findings with sources
- Architecture designs
- Session summaries
- Agent specifications and task records

**When to save to memory (core):**
- Project name, goals, principles
- Key constraints (environment limitations)
- Current milestone/priority
- Critical conventions
- Important file locations
- Active blockers

## Session Workflow
**Session Start (Auto-surfaced via .harness/memory.md):**
1. Current milestone and phase
2. Single most important next action
3. Active blockers
4. Key reference documents

**During Conversation:**
- Capture decisions in real-time → DECISIONS.md
- Update task status → tasks/
- Add key facts to memory.md via remember() or direct edit

**End of Significant Work:**
1. Update PROGRESS.md with completed/in-progress
2. Update DECISIONS.md if new decisions
3. Update .harness/memory.md Current Session State section
4. Commit to git with clear message (when approved)

**Version & Sync:**
- Commit to git regularly with clear messages
- Push to remote when available (need GitHub token)
- Pull before starting if syncing from another device

## Cross-Chat/Model/Device Considerations
- **Same device:** Workspace persists; memory files persist
- **New chat on same device:** Memory auto-loaded from files
- **Different model:** Same files/memory accessible
- **Different device:** Need to sync workspace (git push/pull, file sync) - git is ideal
- **New environment:** Clone/sync workspace and memory comes with it

## Implementation Checklist
- [x] Git initialized
- [x] Directory structure created (docs/, memory_system/, agents/, projects/, tasks/)
- [x] Core documents created
- [x] Memory populated with key facts
- [ ] Git configured with user info (if pushing)
- [ ] Remote added (if syncing to GitHub)
- [x] First commit made
- [ ] Session start/end workflow documented
- [ ] Agent architecture documented

## Tools Available
- `memory_read/write/search` - Direct memory file access
- `remember/recall` - Structured memory operations
- `git_*` tools - Version control
- `file_history/restore` - AndroidHarness versioning
- `write_file/edit_file` - Direct file manipulation
