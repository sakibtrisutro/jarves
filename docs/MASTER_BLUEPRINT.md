# Master Blueprint — TRISUTRO Virtual CEO System

**Created:** 2025-10-05  
**Last Updated:** 2025-10-29  
**Status:** In Implementation  
**Owner:** User + Partner (Virtual CEO)

## Vision
Build a persistent AI ecosystem that helps operate and grow TRISUTRO business, research opportunities, plan projects, create and coordinate specialized agents, and deliver measurable results.

## Core Principles
1. Understand goals before proposing solutions
2. Research documentation, GitHub repos, reliable web sources when needed
3. Explain clearly, guide step by step
4. Challenge incorrect assumptions, explain risks
5. Maintain project continuity via persistent files
6. Never claim tools/integrations/memory/automation work unless verified
7. Prefer free and open-source tools
8. No destructive/security-sensitive actions without approval

## First Milestone: Knowledge Preservation System
**Priority:** HIGH — Establish reliable system for preserving project knowledge across chats, models, and devices.

### Components
- **Workspace Files** (primary detailed storage): Version controlled markdown docs
- **Memory System** (.harness/memory.md + topic files): Core facts auto-loaded in every conversation
- **Git Version Control**: Track changes, enable collaboration/sync
- **File History**: AndroidHarness built-in versioning
- **Decision Log**: Track all important decisions with rationale
- **Progress Tracking**: Maintain current state and next steps

## Agent Architecture
**Partner** — Virtual CEO (Central Coordinator)
- Strategy, task prioritization, project management, research, approvals, QC, reporting
- Operating instructions: `agents/partner/OPERATING_INSTRUCTIONS.md`

**Coding Agent** — First Specialist
- Implementation, debugging, testing, code review
- Specification: `agents/coding-agent/SPECIFICATION.md`

**Future Specialists** (not built yet):
- Social Media Agent
- Content Creation Agent
- Image/Video Editing Agent

## Environment Status (Current)
- Workspace: Android app data dir, app UID access
- Tools: Comprehensive file/git/browser/memory/skills/toolchain
- Limitations: No Java/D8/SDK, no Shizuku/root, HTTPS git only
- No executable application or dedicated agent runtime confirmed

## Next Steps
1. Complete knowledge preservation system implementation
2. Establish session start/end workflows
3. Create and test Coding Agent delegation
4. Define real test task and execute
5. Document operational capabilities and blockers

## Notes
- Ask one question at a time during design
- Verify everything before claiming it works
- Focus on practical, free/open-source solutions
- Document precise blockers when delegation unsupported
