# Decision Log

## 2025-10-05

### DEC-001: Use Partner as the identity/name
- **Decision:** User wants me to act as "Partner" - personal AI mentor, technical architect, researcher, long-term collaborator
- **Rationale:** Establishes the role and relationship for this ecosystem
- **Impact:** Shapes all interactions and approach

### DEC-002: Focus on Master Blueprint design first, no multi-agent build yet
- **Decision:** Don't build multiple agents immediately; design the blueprint first
- **Rationale:** Need clear architecture and foundation before implementing agents
- **Impact:** Deliberate, structured approach

### DEC-003: Dual-layer knowledge preservation (workspace files + memory)
- **Decision:** Store detailed docs in workspace (version controlled), key facts in memory system (auto-loaded)
- **Rationale:** Balances detail with cross-chat availability; memory auto-loads each conversation
- **Impact:** Better persistence across chats/models/devices

### DEC-004: Knowledge preservation is top priority
- **Decision:** First milestone is establishing reliable knowledge preservation across chats/models/devices
- **Rationale:** Foundation for everything else - need to maintain continuity
- **Impact:** Focuses initial efforts on the right thing

### DEC-005: Initialize git repo now
- **Decision:** Set up version control from the start
- **Rationale:** Enables history tracking and potential sync to remote
- **Impact:** All knowledge artifacts versioned

### DEC-006: Ask one question at a time
- **Decision:** Follow user's constraint of asking only one necessary question at a time during design
- **Rationale:** Respects the explicit instruction
- **Impact:** Slower but more deliberate design process

## 2025-10-29

### DEC-007: Adopt Virtual CEO Operating Blueprint v1.0
- **Decision:** Adopt the comprehensive blueprint as Partner's operating specification
- **Rationale:** Provides complete operational framework including responsibilities, authorization, workflow, memory, agent team, limitations, and success criteria
- **Impact:** Transforms project from design-phase to implementation-phase with clear procedures

### DEC-008: Reconcile AGENTS.md with blueprint
- **Decision:** Replace original AGENTS.md with full Virtual CEO operating instructions
- **Rationale:** Original was placeholder; new version aligns with blueprint and serves as primary role/safety document
- **Impact:** Single source of truth for Partner behavior and constraints

### DEC-009: Create agent directory structure and specifications
- **Decision:** Create agents/partner/ and agents/coding-agent/ with operating instructions and specification
- **Rationale:** Establishes foundation for delegation when platform supports it
- **Impact:** Clear agent definitions ready for instantiation

### DEC-010: Document session workflow in KNOWLEDGE_PRESERVATION.md
- **Decision:** Add explicit session start/end workflow with auto-surfaced memory state
- **Rationale:** Makes knowledge preservation practical and repeatable
- **Impact:** Partner can recover state and continue without manual context reconstruction

### DEC-011: Document Coding Agent delegation limitation
- **Decision:** Record that platform does not support genuine separate agent delegation
- **Rationale:** TASK-001 executed manually by Partner; no mechanism found to instantiate/delegate to separate Coding Agent
- **Impact:** Partner must execute coding tasks directly; "Coding Agent" exists only as specification, not as runnable delegation target. This limitation is now documented for future reference.

### DEC-012: Select WhatsApp Abandoned Cart Recovery as first business project
- **Decision:** Prioritize Opportunity #1 (WhatsApp Abandoned Cart Recovery) as first real business implementation
- **Rationale:** Highest direct revenue impact, lowest implementation barrier, fastest validation, free API tier sufficient for test phase, CoD compatible
- **Impact:** Created project specification at projects/trisutro-whatsapp-cart-recovery/ with complete technical details. Ready for implementation when Meta Business verification complete.

### DEC-013: Adopt two-phase approach for WhatsApp Cart Recovery
- **Decision:** Split into Phase 0 (Manual, zero cost, start today) and Phase 1 (Automated, conditional on Phase 0 validation + Meta verification)
- **Rationale:** Feasibility review revealed: (1) website has NO cart persistence/phone capture, (2) Meta verification mandatory + template approval required, (3) Marketing/Utility messages paid (Service free but only customer-initiated), (4) explicit opt-in needed for business-initiated messages. Phase 0 validates demand with zero risk before investing.
- **Impact:** Phase 0 specification added to SPECIFICATION.md. Phase 1 moved to conditional. Go/No-Go threshold: >15% abandonment rate AND >10% manual recovery rate.
