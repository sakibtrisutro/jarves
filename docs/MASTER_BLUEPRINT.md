# Master Blueprint - Partner Ecosystem

**Created:** 2025-10-05  
**Status:** In Design  
**Owner:** User + Partner (AI Mentor/Architect)  

## Vision
Build a persistent AI ecosystem that helps learn, solve technical problems, research solutions, and gradually build specialized agents for content automation, website automation, coding, and other tasks.

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
**Priority:** HIGH - Establish reliable system for preserving project knowledge across chats, models, and devices.

### Components
- **Workspace Files** (primary detailed storage): Version controlled markdown docs
- **Memory System** (.harness/memory.md + topic files): Core facts auto-loaded in every conversation
- **Git Version Control**: Track changes, enable collaboration/sync
- **File History**: AndroidHarness built-in versioning
- **Decision Log**: Track all important decisions with rationale
- **Progress Tracking**: Maintain current state and next steps

## Environment Status (as of creation)
- Workspace: Android app data dir, app UID access
- Tools: Comprehensive file/git/browser/memory/skills/toolchain
- Limitations: No git repo initially (now initialized), no Java/D8/SDK, no Shizuku/root, HTTPS git only
- Memory: Empty core memory and no topic files yet

## Next Steps
1. Complete knowledge preservation system design and implementation
2. Establish patterns for capturing decisions/progress
3. Define agent architecture (future milestone)
4. Build specialized agents incrementally
5. Create workflows for each use case

## Notes
- Ask one question at a time during design
- Verify everything before claiming it works
- Focus on practical, free/open-source solutions
