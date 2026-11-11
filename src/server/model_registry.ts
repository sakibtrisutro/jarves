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
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN';
}

/**
 * Initializes Model Registry table schema.
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
      eligibility TEXT DEFAULT 'UNKNOWN',
      priority INTEGER DEFAULT 0,
      last_verified_at TEXT NOT NULL
    );
  `);

  // Migration for existing table
  try { db.exec("ALTER TABLE model_registry ADD COLUMN eligibility TEXT DEFAULT 'UNKNOWN'"); } catch {}
  try { db.exec('ALTER TABLE model_registry ADD COLUMN priority INTEGER DEFAULT 0'); } catch {}
}

/**
 * Discovers and synchronizes models from Gemini API catalog
 */
export async function fetchGeminiModels(apiKey: string): Promise<number> {
  if (!apiKey || !apiKey.trim()) return 0;
  try {
    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'GeminiDiscovery',
      message: 'Starting Gemini model discovery...'
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logEvent({
        level: 'WARNING',
        category: 'API',
        component: 'GeminiDiscovery',
        message: `Gemini Models API returned HTTP ${res.status}: ${errText.substring(0, 100)}`
      });
      return 0;
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
        success_rate, avg_latency_ms, eligibility, last_verified_at
      ) VALUES (?, 'gemini', ?, ?, ?, ?, ?, 1, 0.9, 0.88, 0.95, 0.99, 300, 'ELIGIBLE', datetime('now'))
    `);

    for (const m of rawModels) {
      const name = m.name || '';
      const cleanId = name.replace(/^models\//, '');
      const methods = m.supportedGenerationMethods || [];
      if (methods.length > 0 && !methods.includes('generateContent')) continue;

      const isFree = cleanId.includes('flash') || cleanId.includes('1.5') || cleanId.includes('2.0') || cleanId.includes('lite');
      const inputCost = isFree ? 0.0 : 0.000001;
      const outputCost = isFree ? 0.0 : 0.000004;
      const contextWindow = m.inputTokenLimit || 1048576;

      stmt.run(cleanId, m.displayName || cleanId, isFree ? 1 : 0, inputCost, outputCost, contextWindow);
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'GeminiDiscovery',
      message: `Gemini discovery completed: ${count} models registered.`
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'WARNING',
      category: 'API',
      component: 'GeminiDiscovery',
      message: `Gemini discovery failed: ${err.message}`
    });
    return 0;
  }
}

/**
 * Discovers and synchronizes models from OpenAI API catalog
 */
export async function fetchOpenAiModels(apiKey: string): Promise<number> {
  if (!apiKey || !apiKey.trim()) return 0;
  try {
    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'OpenAiDiscovery',
      message: 'Starting OpenAI model discovery...'
    });

    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logEvent({
        level: 'WARNING',
        category: 'API',
        component: 'OpenAiDiscovery',
        message: `OpenAI Models API returned HTTP ${res.status}: ${errText.substring(0, 100)}`
      });
      return 0;
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
        success_rate, avg_latency_ms, eligibility, last_verified_at
      ) VALUES (?, 'openai', ?, 0, 0.0000025, 0.00001, 128000, 1, 0.95, 0.95, 0.92, 0.99, 450, 'ELIGIBLE', datetime('now'))
    `);

    for (const m of rawModels) {
      const id = m.id;
      if (!id || (!id.startsWith('gpt-') && !id.startsWith('o1') && !id.startsWith('o3'))) continue;
      stmt.run(id, `OpenAI ${id}`);
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'OpenAiDiscovery',
      message: `OpenAI discovery completed: ${count} models registered.`
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'WARNING',
      category: 'API',
      component: 'OpenAiDiscovery',
      message: `OpenAI discovery failed: ${err.message}`
    });
    return 0;
  }
}

/**
 * Fetches and synchronizes models from OpenRouter catalog API
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<number> {
  if (!apiKey || !apiKey.trim()) return 0;
  try {
    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'OpenRouterDiscovery',
      message: 'Starting OpenRouter model discovery...'
    });

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://jarvis.trisutro.bond',
        'X-Title': 'JARVIS Executive AI',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logEvent({
        level: 'WARNING',
        category: 'API',
        component: 'OpenRouterDiscovery',
        message: `OpenRouter API returned HTTP ${res.status}: ${errText.substring(0, 100)}`
      });
      return 0;
    }

    const data = (await res.json()) as any;
    const models = data.data || data.models || [];
    const db = getDb();
    if (!db) return 0;

    let count = 0;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO model_registry (
        model_id, provider, display_name, is_free, input_cost_per_token, output_cost_per_token,
        context_window, supports_tools, reasoning_score, coding_score, multilingual_score,
        success_rate, avg_latency_ms, eligibility, last_verified_at
      ) VALUES (?, 'openrouter', ?, ?, ?, ?, ?, 1, 0.85, 0.85, 0.85, 0.98, 450, 'ELIGIBLE', datetime('now'))
    `);

    for (const m of models) {
      const modelId = m.id;
      if (!modelId) continue;
      const name = m.name || modelId;
      const pricing = m.pricing || {};
      const promptCost = parseFloat(String(pricing.prompt ?? '0'));
      const completionCost = parseFloat(String(pricing.completion ?? '0'));
      
      // Flexible free detection for OpenRouter models
      const isFree = (promptCost === 0 && completionCost === 0) || modelId.endsWith(':free') || modelId.includes(':free') || name.toLowerCase().includes('(free)');

      stmt.run(
        modelId,
        name,
        isFree ? 1 : 0,
        isNaN(promptCost) ? 0.0 : promptCost,
        isNaN(completionCost) ? 0.0 : completionCost,
        m.context_length || 8192
      );
      count++;
    }

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'OpenRouterDiscovery',
      message: `OpenRouter discovery completed: ${count} models registered.`
    });

    return count;
  } catch (err: any) {
    logEvent({
      level: 'WARNING',
      category: 'API',
      component: 'OpenRouterDiscovery',
      message: `OpenRouter discovery failed: ${err.message}`
    });
    return 0;
  }
}

/**
 * Builds a priority pipeline of eligible models for a specific task.
 */
export function getModelPipeline(taskType: string, freeOnly: boolean): any[] {
  const db = getDb();
  if (!db) return [];

  let sql = "SELECT * FROM model_registry WHERE eligibility = 'ELIGIBLE'";
  
  if (freeOnly) {
    sql += ' AND is_free = 1';
  }

  // Task-aware sorting
  if (taskType === 'coding') {
    sql += ' ORDER BY coding_score DESC, avg_latency_ms ASC';
  } else if (taskType === 'reasoning') {
    sql += ' ORDER BY reasoning_score DESC, avg_latency_ms ASC';
  } else if (taskType === 'multilingual') {
    sql += ' ORDER BY multilingual_score DESC, avg_latency_ms ASC';
  } else {
    sql += ' ORDER BY (reasoning_score + success_rate) DESC, avg_latency_ms ASC';
  }

  sql += ' LIMIT 10';

  try {
    const results = db.prepare(sql).all();
    if (results.length === 0 && freeOnly) {
      // Fallback query: if no models are strictly flagged free, return any eligible model
      return db.prepare("SELECT * FROM model_registry WHERE eligibility = 'ELIGIBLE' ORDER BY avg_latency_ms ASC LIMIT 10").all();
    }
    return results;
  } catch (err) {
    console.error('Failed to get model pipeline:', err);
    return [];
  }
}

/**
 * Updates model statistics after a request
 */
export function updateModelStats(modelId: string, success: boolean, latencyMs: number) {
  const db = getDb();
  if (!db) return;

  try {
    if (success) {
      db.prepare(`
        UPDATE model_registry 
        SET success_rate = (success_rate * 0.9) + 0.1,
            avg_latency_ms = (avg_latency_ms * 0.8) + (? * 0.2),
            last_verified_at = datetime('now')
        WHERE model_id = ?
      `).run(latencyMs, modelId);
    } else {
      db.prepare(`
        UPDATE model_registry 
        SET success_rate = success_rate * 0.8,
            last_verified_at = datetime('now')
        WHERE model_id = ?
      `).run(modelId);
    }
  } catch {}
}
