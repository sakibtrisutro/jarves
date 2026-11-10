import { getDb } from './database.ts';
import { logEvent } from './logger.ts';

export interface ModelMetadata {
  provider: string;
  model_id: string;
  display_name: string;
  is_free: boolean;
  input_cost_per_token: number;
  output_cost_per_token: number;
  context_window: number;
  supports_tools: boolean;
  reasoning_score: number;
  coding_score: number;
  multilingual_score: number;
  success_rate: number;
  avg_latency_ms: number;
  last_verified_at: string;
}

/**
 * Initializes Model Registry table schema. Zero-configuration first boot leaves registry empty
 * until API keys are provided and discovery/bootstrap runs.
 */
export function initModelRegistry() {
  const db = getDb();
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS model_registry (
      model_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0,
      input_cost_per_token REAL DEFAULT 0.0,
      output_cost_per_token REAL DEFAULT 0.0,
      context_window INTEGER DEFAULT 8192,
      supports_tools INTEGER DEFAULT 1,
      reasoning_score REAL DEFAULT 0.7,
      coding_score REAL DEFAULT 0.7,
      multilingual_score REAL DEFAULT 0.8,
      success_rate REAL DEFAULT 1.0,
      avg_latency_ms REAL DEFAULT 350.0,
      last_verified_at TEXT NOT NULL
    );
  `);
}

/**
 * Discovers and synchronizes models from Gemini API catalog
 */
export async function fetchGeminiModels(apiKey: string): Promise<number> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Gemini Models API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const rawModels = data.models || [];
    const db = getDb();
    if (!db) return 0;

    let count = 0;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO model_registry (
        model_id, provider, display_name, is_free, input_cost_per_token, output_cost_per_token,
        context_window, supports_tools, reasoning_score, coding_score, multilingual_score,
        success_rate, avg_latency_ms, last_verified_at
      ) VALUES (?, 'gemini', ?, ?, ?, ?, ?, 1, 0.9, 0.88, 0.92, 0.99, 300, datetime('now'))
    `);

    for (const m of rawModels) {
      const name = m.name || '';
      const cleanId = name.replace(/^models\//, '');
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes('generateContent')) continue;

      const isFree = cleanId.includes('flash') || cleanId.includes('1.5') || cleanId.includes('2.0') || cleanId.includes('2.5');
      const inputCost = isFree ? 0.0 : 0.000001;
      const outputCost = isFree ? 0.0 : 0.000004;
      const contextWindow = m.inputTokenLimit || 1048576;

      stmt.run(cleanId, m.displayName || cleanId, isFree ? 1 : 0, inputCost, outputCost, contextWindow);
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `Discovered ${count} models from Google Gemini catalog.`,
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'ERROR',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `Gemini discovery failed: ${err.message}`,
      error_code: 'GEMINI_DISCOVERY_FAILED',
    });
    throw err;
  }
}

/**
 * Discovers and synchronizes models from OpenAI API catalog
 */
export async function fetchOpenAiModels(apiKey: string): Promise<number> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Models API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const rawModels = data.data || [];
    const db = getDb();
    if (!db) return 0;

    let count = 0;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO model_registry (
        model_id, provider, display_name, is_free, input_cost_per_token, output_cost_per_token,
        context_window, supports_tools, reasoning_score, coding_score, multilingual_score,
        success_rate, avg_latency_ms, last_verified_at
      ) VALUES (?, 'openai', ?, 0, 0.0000025, 0.00001, 128000, 1, 0.95, 0.94, 0.92, 0.99, 450, datetime('now'))
    `);

    for (const m of rawModels) {
      const id = m.id;
      if (!id.startsWith('gpt-') && !id.startsWith('o1') && !id.startsWith('o3')) continue;
      stmt.run(id, `OpenAI ${id}`);
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `Discovered ${count} models from OpenAI catalog.`,
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'ERROR',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `OpenAI discovery failed: ${err.message}`,
      error_code: 'OPENAI_DISCOVERY_FAILED',
    });
    throw err;
  }
}

/**
 * Fetches and synchronizes models from OpenRouter catalog API
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<number> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jarvis.trisutro.bond',
        'X-Title': 'JARVIS Executive AI',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const models = data.data || [];
    const db = getDb();
    if (!db) return 0;

    let count = 0;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO model_registry (
        model_id, provider, display_name, is_free, input_cost_per_token, output_cost_per_token,
        context_window, supports_tools, reasoning_score, coding_score, multilingual_score,
        success_rate, avg_latency_ms, last_verified_at
      ) VALUES (?, 'openrouter', ?, ?, ?, ?, ?, 1, 0.85, 0.85, 0.85, 0.98, 400, datetime('now'))
    `);

    for (const m of models) {
      const modelId = m.id;
      const name = m.name || modelId;
      const pricing = m.pricing || {};
      const promptCost = parseFloat(pricing.prompt || '0');
      const completionCost = parseFloat(pricing.completion || '0');
      const isFree = promptCost === 0 && completionCost === 0 && (modelId.includes(':free') || name.toLowerCase().includes('free'));

      stmt.run(
        modelId,
        name,
        isFree ? 1 : 0,
        promptCost,
        completionCost,
        m.context_length || 8192
      );
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `Discovered ${count} models from OpenRouter catalog.`,
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'ERROR',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `Failed to fetch OpenRouter model catalog: ${err.message}`,
      error_code: 'OPENROUTER_DISCOVERY_FAILED',
    });
    throw err;
  }
}

/**
 * Model Router with Task Scoring and Strict Free Policy
 */
export function selectBestModelForTask(
  taskType: 'general' | 'coding' | 'reasoning' | 'multilingual',
  freeOnly: boolean
): { modelId: string; provider: string; reason: string } {
  const db = getDb();
  if (!db) {
    return { modelId: '', provider: '', reason: 'Database uninitialized' };
  }

  let sql = 'SELECT * FROM model_registry WHERE 1=1';
  const params: any[] = [];

  if (freeOnly) {
    sql += ' AND is_free = 1';
  }

  if (taskType === 'coding') {
    sql += ' ORDER BY coding_score DESC, avg_latency_ms ASC';
  } else if (taskType === 'reasoning') {
    sql += ' ORDER BY reasoning_score DESC, avg_latency_ms ASC';
  } else if (taskType === 'multilingual') {
    sql += ' ORDER BY multilingual_score DESC, avg_latency_ms ASC';
  } else {
    sql += ' ORDER BY (reasoning_score + success_rate) DESC';
  }

  sql += ' LIMIT 1';

  const best = db.prepare(sql).get(...params) as any;
  if (best) {
    return {
      modelId: best.model_id,
      provider: best.provider,
      reason: `Selected model "${best.display_name}" for task "${taskType}" (Free Only: ${freeOnly}, Score: ${best.reasoning_score})`,
    };
  }

  return { modelId: '', provider: '', reason: 'No model found in registry matching criteria' };
}
