# Knowledge Preservation System

**Goal:** Reliable system for preserving project knowledge across chats, models, and devices.

## Storage Strategy (Dual-Layer)
Following user preference: "Both (workspace for details, memory for key facts)"

### Layer 1: Workspace Files (Detailed, Version Controlled)
Location: `docs/`, `memory_system/` in workspace root
- `MASTER_BLUEPRINT.md` - Overall vision, architecture, milestones
- `KNOWLEDGE_PRESERVATION.md` - This document
- `DECISIONS.md` - All important decisions with context and rationale
- `PROGRESS.md` - Current state, completed items, blockers, next steps
- `LEARNINGS.md` - Technical insights, gotchas, solutions found
- `RESOURCES.md` - Useful links, repos, docs, tools

All tracked in git.

### Layer 2: Memory System (Core Facts, Auto-Loaded)
- Core memory: `.harness/memory.md` - Critical facts always in context
- Topic files: `.harness/memory/*.md` - Focused topics loaded on demand
- Use `remember()` for durable facts, `recall()` to retrieve
- Keep entries short and standalone

## Capture Guidelines
**When to save to workspace files (detailed):**
- Major decisions with long rationale
- Multi-step plans and roadmaps
- Complex technical solutions
- Research findings with sources
- Architecture designs
- Session summaries

**When to save to memory (core):**
- Project name, goals, principles
- Key constraints (environment limitations)
- Current milestone/priority
- Critical conventions
- Important file locations
- Active blockers

## Workflow
1. **During conversation:** Capture decisions in real-time
2. **End of significant work:** Update PROGRESS.md and DECISIONS.md
3. **Key facts:** Add to memory.md via `remember()` or direct edit
4. **Version:** Commit to git regularly with clear messages
5. **Sync:** Push to remote when available (need GitHub token)

## Cross-Chat/Model/Device Considerations
- **Same device:** Workspace persists; memory files persist
- **New chat on same device:** Memory auto-loaded from files
- **Different model:** Same files/memory accessible
- **Different device:** Need to sync workspace (git push/pull, file sync) - git is ideal
- **New environment:** Clone/sync workspace and memory comes with it

## Implementation Checklist
- [x] Git initialized
- [x] Directory structure created
- [ ] Core documents created (in progress)
- [ ] Memory populated with key facts
- [ ] Git configured with user info (if pushing)
- [ ] Remote added (if syncing to GitHub)
- [ ] First commit made

## Tools Available
- `memory_read/write/search` - Direct memory file access
- `remember/recall` - Structured memory operations
- `git_*` tools - Version control
- `file_history/restore` - AndroidHarness versioning
- `write_file/edit_file` - Direct file manipulation
