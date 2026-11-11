# Specialized Multi-Agent Ecosystem Specification

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. AGENT ECOSYSTEM ARCHITECTURE

JARVIS operates as the Central Orchestrator and Virtual CEO, coordinating specialized, autonomous agents. Each agent is a focused subsystem possessing:
1. **Specific Domain Expertise:** Curated prompt instructions, reasoning heuristics, and output schemas.
2. **Dedicated Tool Registry:** Whitelisted set of actions appropriate for its domain.
3. **Scoped Memory Access:** Read/write access to relevant SQLite tables and Git documentation.
4. **Standard Lifecycle:** Uniform execution, checkpointing, and error reporting conforming to the `BaseAgent` contract.

---

## 2. BASE AGENT CONTRACT & LIFECYCLE

All specialized agents implement the universal `BaseAgent` interface:

```typescript
export interface BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly allowedTools: string[];
  readonly permissionTier: 'tier1' | 'tier2';

  initialize(context: AgentContext): Promise<void>;
  executeTask(task: TaskRecord): Promise<TaskResult>;
  checkpointState(stepIndex: number, state: Record<string, any>): Promise<void>;
  terminate(): Promise<void>;
}
```

### Agent Lifecycle State Machine

```
[Spawn / Idle] 
       │
       ▼ (Task Assigned by Orchestrator)
[Initializing] ─────► Load task payload & recent checkpoints from SQLite
       │
       ▼
[Executing Step] ───► Run scoped tools & LLM queries
       │
       ├─► [Checkpointing] ──► Save intermediate state to SQLite
       │
       ├─► (Tier 2 Triggered) ──► [Waiting Approval] ──► (Approved) ──► Resume
       │                                  │
       │                                  └──► (Rejected) ──► [Aborted]
       ▼
[Verification] ─────► Self-check results against task acceptance criteria
       │
       ├───(Tests / QC Passed)───► [Completed] ──► Notify Orchestrator & Unlock Dependents
       │
       └───(Failure / Error)─────► [Retrying / Blocked] ──► Log Error & Escalate
```

---

## 3. SPECIFICATIONS FOR THE 10 SPECIALIZED AGENTS

### 1. Research Agent
- **Primary Mission:** Conduct technical and market investigations, source verification, and competitor benchmarking.
- **Tools:** `web_search`, `fetch_webpage`, `parse_pdf`, `summarize_text`.
- **Autonomy:** Tier 1.
- **Output:** Markdown research summaries with verified citations saved to `docs/research/`.

### 2. Software Development Agent
- **Primary Mission:** Implementation, refactoring, unit testing, bug fixing, and code review.
- **Tools:** `read_file`, `write_file`, `replace_file_content`, `run_command`, `git_diff`, `run_tests`.
- **Autonomy:** Tier 1 for development branches; Tier 2 for production merges and dependency installs.
- **Output:** Clean, linted, tested TypeScript/Python modules with Git commits.

### 3. Facebook Automation Agent
- **Primary Mission:** Manage TRISUTRO Facebook Page, schedule organic posts, triage inquiries, and track ad analytics.
- **Tools:** `fb_publish_post`, `fb_read_comments`, `fb_reply_comment`, `fb_fetch_insights`.
- **Autonomy:** Tier 1 for reading comments/metrics; Tier 2 for publishing posts or spending ad budget.
- **Output:** Post scheduling records and weekly audience engagement reports.

### 4. Instagram Automation Agent
- **Primary Mission:** Showcase unstitched luxury clothing, schedule visual carousel posts, triage customer DMs.
- **Tools:** `ig_publish_media`, `ig_read_messages`, `ig_fetch_analytics`.
- **Autonomy:** Tier 1 for analytics and DM triage; Tier 2 for publishing and sending direct messages.
- **Output:** Media calendar records and DM response drafts for owner approval.

### 5. YouTube Automation Agent
- **Primary Mission:** Optimize video metadata (titles, descriptions, tags, chapters), upload scheduled videos, analyze viewer retention.
- **Tools:** `yt_upload_video`, `yt_update_metadata`, `yt_fetch_analytics`.
- **Autonomy:** Tier 1 for metadata drafting and analytics; Tier 2 for video publication.
- **Output:** Video SEO performance scorecards and publish queues.

### 6. Video Production Agent
- **Primary Mission:** Generate video scripts, assemble product showcase reels, overlay captions and branding.
- **Tools:** `script_generator`, `ffmpeg_render`, `tts_synthesizer`, `subtitle_burn`.
- **Autonomy:** Tier 1.
- **Output:** Rendered MP4 video clips saved to `assets/videos/`.

### 7. Image Processing Agent
- **Primary Mission:** Batch crop, optimize, remove backgrounds, and compose high-resolution product catalog cards.
- **Tools:** `sharp_resize`, `bg_remove`, `watermark_overlay`, `webp_convert`.
- **Autonomy:** Tier 1.
- **Output:** Web-optimized image assets saved to `assets/images/`.

### 8. Website Management Agent
- **Primary Mission:** Monitor e-commerce site health (`trisutro.bond`), sync product catalogs, track cart abandonment rates.
- **Tools:** `http_health_check`, `catalog_sync`, `cart_analytics_reader`, `sitemap_ping`.
- **Autonomy:** Tier 1 for monitoring; Tier 2 for direct production site deployments.
- **Output:** Uptime logs, cart abandonment metrics, and automated recovery queue entries.

### 9. Content Planning Agent
- **Primary Mission:** Maintain the TRISUTRO omnichannel editorial calendar, align content with seasonal sales (Eid, festivals), and track fashion trends.
- **Tools:** `calendar_read`, `calendar_update`, `trend_analyzer`.
- **Autonomy:** Tier 1.
- **Output:** Bi-weekly content production briefs in `docs/content/`.

### 10. Data Analysis Agent
- **Primary Mission:** Analyze sales figures, cart abandonment recovery rates, advertising ROI, and inventory turnover.
- **Tools:** `sqlite_query`, `data_aggregate`, `chart_generate`, `export_csv`.
- **Autonomy:** Tier 1.
- **Output:** Visual performance dashboards and executive weekly reports for the Virtual CEO.

---

## 4. AGENT COMMUNICATION PROTOCOL

Agents communicate strictly through the Central Orchestrator's internal message bus:
- **No Direct Mutation:** Agent A cannot mutate Agent B's internal state.
- **Task Delegation:** Agent A dispatches a subtask request to the Orchestrator, which validates permissions, creates a record in SQLite `tasks`, and dispatches it to Agent B.
- **Deliverable Passing:** Output payloads are stored in SQLite and passed as verified JSON parameters to dependent tasks.
