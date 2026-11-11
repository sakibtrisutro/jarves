# Multi-Provider AI Engine Strategy & Routing Architecture

**Status:** ACTIVE  
**Version:** 2.0.0  
**Parent Blueprint:** `docs/MASTER_BLUEPRINT.md`  

---

## 1. STRATEGIC OBJECTIVES

JARVIS relies on a multi-provider model routing strategy designed to achieve:
1. **Zero Vendor Lock-In:** Modular adapters ensure no single API outage halts operations.
2. **Cost Minimization:** Maximize utilization of generous free tiers (Google Gemini, Groq) and local offline execution (Ollama) before routing to paid endpoints.
3. **Task-Specific Complexity Matching:** Route lightweight triage, classification, and text formatting to fast/free models; reserve deep architectural design and code generation for high-capability models.
4. **Automated Resilience:** Seamless failover cascades on rate-limit (`HTTP 429`) and server errors (`HTTP 5xx`).
5. **Strict Schema Normalization:** Universal tool-calling and structured output interfaces across disparate model specifications.

---

## 2. MODEL REGISTRY & TIERING HIERARCHY

```
+-----------------------------------------------------------------------------------+
|                           MODEL TIERING & ROUTING MATRIX                          |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+-----------------------+       +-----------------------+       +-----------------------+
|        TIER 1         |       |        TIER 2         |       |        TIER 3         |
|   FAST & LOW-COST     |       |    DEEP REASONING     |       |    OFFLINE LOCAL      |
| (Triage, Chat, Scrap) |       | (Code, Architecture)  |       | (Emergency Resilience)|
+-----------------------+       +-----------------------+       +-----------------------+
| • Gemini 2.5 Flash    |       | • Gemini 2.5 Pro      |       | • Ollama Llama 3.2    |
| • Groq Llama-3.3-70B  |       | • OpenRouter Claude   |       | • Ollama Qwen 2.5     |
| • Cost: Free / Low    |       | • Cost: Controlled    |       | • Cost: $0.00 (Local) |
| • Latency: < 400ms    |       | • Latency: 1.5s - 4s  |       | • Latency: Hardware   |
+-----------------------+       +-----------------------+       +-----------------------+
```

### Detailed Provider Profiles

| Provider | Model Identifier | Primary Use Case | Rate Limit Policy | Cost Profile |
|---|---|---|---|---|
| **Google Gemini** (Official GenAI SDK) | `models/gemini-2.5-flash` | General conversation, triage, task breakdown, summaries | 15 RPM / 1M TPM (Free tier) | Free tier prioritized; track daily usage |
| **Google Gemini** | `models/gemini-2.5-pro` | Complex software refactoring, security audits, business strategy | 2 RPM (Free tier) / Pay-as-you-go | Reserved for Tier 2 reasoning |
| **Groq Cloud** | `llama-3.3-70b-versatile` | Ultra-fast structured extraction, intent classification | 30 RPM / 14.4K RPD (Free tier) | Free tier |
| **OpenRouter** | `anthropic/claude-3.5-sonnet` | Complex multi-file coding and difficult logic edge cases | Pay-per-token API key | Approval required if balance drops below threshold |
| **Local Ollama** | `llama3.2:3b` / `qwen2.5-coder` | Fully offline processing, sensitive data analysis on Windows PC | Unlimited (Local CPU/GPU) | $0.00 (Zero API cost) |

---

## 3. AUTOMATED FAILOVER CASCADE & RETRY POLICY

When an agent dispatches a prompt with an execution deadline:

```
[Agent Request]
       │
       ▼
[Primary Provider: Gemini 2.5 Flash] ───(Success)───► Return Output
       │
       ├─► (HTTP 429 Rate Limit / 5xx Server Error)
       │
       ▼
[Secondary Provider: Groq Llama-3.3-70B] ─(Success)─► Return Output
       │
       ├─► (Network Outage / Quota Exceeded)
       │
       ▼
[Tertiary Provider: OpenRouter Fallback] ─(Success)─► Return Output
       │
       ├─► (No Cloud Access)
       │
       ▼
[Offline Fallback: Local Ollama Model] ───(Success)─► Return Output
       │
       ▼
(Permanent Failure) ──► Log to SQLite, mark task 'blocked', alert owner on Telegram
```

### Exponential Backoff Rules:
- **First Retry:** Immediate failover to secondary provider within 500ms.
- **Same-Provider Rate Limit:** Wait $2^{\text{retry}} \times 1000\text{ms}$ with $\pm 200\text{ms}$ jitter before re-attempting primary provider.
- **Maximum Cascade Attempts:** 3 distinct provider hops before halting.

---

## 4. SCHEMA NORMALIZATION & TOOL-CALLING COMPATIBILITY

Different LLM providers enforce slightly differing JSON Schema specifications for tool calling:
- **Gemini GenAI SDK Constraint:** Rejects schemas containing `additionalProperties` or certain unsupported Draft-07 keywords.
- **OpenAI / Groq Constraint:** Requires explicit `type: "object"` and strict `required` arrays.

### Normalization Pipeline:
The Provider Abstraction Layer automatically sanitizes every tool definition before dispatch:
```typescript
export function normalizeToolSchema(schema: Record<string, any>, provider: string): Record<string, any> {
  const cloned = JSON.parse(JSON.stringify(schema));
  
  if (provider === 'gemini') {
    // Strip additionalProperties recursively for Gemini compatibility
    removeKeyRecursively(cloned, 'additionalProperties');
    removeKeyRecursively(cloned, '$schema');
  }
  
  return cloned;
}
```

---

## 5. TOKEN & COST ACCOUNTING

Every API invocation passes through a telemetry interceptor that:
1. Calculates input and output token counts (using native provider headers or local tokenizers).
2. Computes the estimated USD cost based on the active price table.
3. Inserts an immutable record into the SQLite `token_usage` table:
   ```sql
   INSERT INTO token_usage (task_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd)
   VALUES (?, ?, ?, ?, ?, ?, ?);
   ```
4. If monthly spend on paid APIs reaches 80% of the owner-defined budget, an automatic alert is dispatched via Telegram, and Tier 2 tasks automatically downgrade to free/local tiers until owner confirmation.
