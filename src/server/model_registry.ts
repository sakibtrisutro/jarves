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
 * Initializes Model Registry table and default verified models (Gemini & OpenRouter Free)
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

  // Seed default models if table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM model_registry').get() as any;
  if (countRow?.count === 0) {
    const defaults: ModelMetadata[] = [
      {
        provider: 'gemini',
        model_id: 'gemini-3.8-flash',
        display_name: 'Google Gemini 3.8 Flash (Multimodal)',
        is_free: true,
        input_cost_per_token: 0.0,
        output_cost_per_token: 0.0,
        context_window: 1048576,
        supports_tools: true,
        reasoning_score: 0.9,
        coding_score: 0.88,
        multilingual_score: 0.95,
        success_rate: 0.99,
        avg_latency_ms: 280,
        last_verified_at: new Date().toISOString(),
      },
      {
        provider: 'gemini',
        model_id: 'gemini-4-argon',
        display_name: 'Google Gemini 4 Argon (Pro Reasoning)',
        is_free: false,
        input_cost_per_token: 0.000001,
        output_cost_per_token: 0.000004,
        context_window: 2097152,
        supports_tools: true,
        reasoning_score: 0.98,
        coding_score: 0.96,
        multilingual_score: 0.96,
        success_rate: 0.995,
        avg_latency_ms: 650,
        last_verified_at: new Date().toISOString(),
      },
      {
        provider: 'openrouter',
        model_id: 'meta-llama/llama-3.3-70b-instruct:free',
        display_name: 'Meta Llama 3.3 70B Instruct (Free)',
        is_free: true,
        input_cost_per_token: 0.0,
        output_cost_per_token: 0.0,
        context_window: 131072,
        supports_tools: true,
        reasoning_score: 0.89,
        coding_score: 0.87,
        multilingual_score: 0.85,
        success_rate: 0.97,
        avg_latency_ms: 420,
        last_verified_at: new Date().toISOString(),
      },
      {
        provider: 'openrouter',
        model_id: 'google/gemini-2.5-flash-thinking-exp:free',
        display_name: 'Gemini 2.5 Flash Thinking (Free)',
        is_free: true,
        input_cost_per_token: 0.0,
        output_cost_per_token: 0.0,
        context_window: 32768,
        supports_tools: true,
        reasoning_score: 0.92,
        coding_score: 0.89,
        multilingual_score: 0.9,
        success_rate: 0.96,
        avg_latency_ms: 550,
        last_verified_at: new Date().toISOString(),
      },
    ];

    const insert = db.prepare(`
      INSERT OR REPLACE INTO model_registry (
        model_id, provider, display_name, is_free, input_cost_per_token, output_cost_per_token,
        context_window, supports_tools, reasoning_score, coding_score, multilingual_score,
        success_rate, avg_latency_ms, last_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of defaults) {
      insert.run(
        m.model_id,
        m.provider,
        m.display_name,
        m.is_free ? 1 : 0,
        m.input_cost_per_token,
        m.output_cost_per_token,
        m.context_window,
        m.supports_tools ? 1 : 0,
        m.reasoning_score,
        m.coding_score,
        m.multilingual_score,
        m.success_rate,
        m.avg_latency_ms,
        m.last_verified_at
      );
    }
    console.log('[MODEL REGISTRY] Initialized with default verified models.');
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
      ) VALUES (?, 'openrouter', ?, ?, ?, ?, ?, 1, 0.8, 0.8, 0.8, 0.98, 400, datetime('now'))
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
      message: `Successfully synchronized ${count} models from OpenRouter catalog.`,
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
 * Intelligent Model Router implementing strict Free-Only enforcement and task scoring
 */
export function selectBestModelForTask(taskType: 'general' | 'coding' | 'reasoning' | 'multilingual', freeOnly: boolean): { modelId: string; provider: string; reason: string } {
  const db = getDb();
  if (!db) {
    return { modelId: 'gemini-3.8-flash', provider: 'gemini', reason: 'Fallback default (DB uninitialized)' };
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
      reason: `Selected based on task "${taskType}" scoring (Free Only: ${freeOnly}, Score: ${best.reasoning_score})`,
    };
  }

  return { modelId: 'gemini-3.8-flash', provider: 'gemini', reason: 'Default fallback model' };
}
