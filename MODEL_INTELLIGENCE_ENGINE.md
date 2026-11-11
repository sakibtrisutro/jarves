# JARVIS — Model Intelligence Engine Architecture

The JARVIS Model Intelligence Engine manages model discovery, LLM-based catalog scoring, task routing, and manual override (Force Model Mode).

## Core Capabilities

### 1. Instant Free Model Bootstrap (LLM-Independent)
Deterministic backend logic selects the optimal free model without needing a pre-existing LLM:
- Filters catalog for zero input/output cost (`is_free = 1`).
- Evaluates context limits and latency.
- Executes an actual test ping.
- Activates the model immediately upon verification.

### 2. LLM-Powered Catalog Scoring & Rankings
Ranks models across 9 specialized categories:
- General Conversation
- Reasoning
- Coding
- Debugging
- Bangla (বাংলা) Language Quality
- English Fluency
- Long-Context Tasks
- Tool Calling
- Agent Task Execution

### 3. Force Model Mode
When **Force Model Mode** is enabled:
- Selected model takes absolute priority.
- Automatic ranking algorithms will not override it.
- Prevents silent model fallbacks or provider switches.
- Selection survives browser refreshes and backend server restarts.
