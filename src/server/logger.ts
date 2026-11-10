import fs from 'node:fs';
import path from 'node:path';
import { Response } from 'express';
import { getDb } from './database.ts';

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type LogCategory = 
  | 'SYSTEM'
  | 'API'
  | 'VOICE'
  | 'TELEGRAM'
  | 'AGENT'
  | 'TASK'
  | 'DATABASE'
  | 'MEMORY'
  | 'SECURITY'
  | 'ERROR'
  | 'WARNING'
  | 'DEBUG';

export interface SystemEvent {
  event_id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  component: string;
  message: string;
  error_code?: string;
  correlation_id?: string;
  task_id?: string;
  agent_id?: string;
  provider_id?: string;
  metadata?: Record<string, any>;
  stack_trace?: string;
  troubleshooting?: string;
}

// In-memory ring buffer for ultra-fast dashboard queries
const MAX_IN_MEMORY_EVENTS = 500;
const memoryEvents: SystemEvent[] = [];

// SSE client connections for live streaming
const sseClients = new Set<Response>();

// File logging setup
const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'jarvis_events.log');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Ignore in read-only setups
}

/**
 * Redacts secrets, tokens, and sensitive keys from any string or object
 */
export function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/gho_[A-Za-z0-9_]{16,}/g, 'gho_***REDACTED***')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza***REDACTED***')
      .replace(/([0-9]{8,11}:[a-zA-Z0-9_-]{35})/g, '***TELEGRAM_TOKEN_REDACTED***')
      .replace(/bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer ***REDACTED***')
      .replace(/gsk_[A-Za-z0-9_]+/gi, 'gsk_***REDACTED***');
  }
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeData);
    }
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('authorization')
      ) {
        clean[key] = '***REDACTED***';
      } else {
        clean[key] = sanitizeData(val);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Central event logging function
 */
export function logEvent(event: Omit<SystemEvent, 'event_id' | 'timestamp'>): SystemEvent {
  const fullEvent: SystemEvent = {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    level: event.level,
    category: event.category,
    component: event.component,
    message: sanitizeData(event.message),
    error_code: event.error_code,
    correlation_id: event.correlation_id || `corr_${Math.random().toString(36).substring(2, 10)}`,
    task_id: event.task_id,
    agent_id: event.agent_id,
    provider_id: event.provider_id,
    metadata: event.metadata ? sanitizeData(event.metadata) : undefined,
    stack_trace: event.stack_trace ? sanitizeData(event.stack_trace) : undefined,
    troubleshooting: event.troubleshooting || getAutomaticTroubleshooting(event.error_code, event.category, event.message),
  };

  // 1. Add to in-memory buffer
  memoryEvents.unshift(fullEvent);
  if (memoryEvents.length > MAX_IN_MEMORY_EVENTS) {
    memoryEvents.pop();
  }

  // 2. Persist to SQLite
  try {
    const db = getDb();
    if (db) {
      db.prepare(`
        INSERT INTO system_events (
          event_id, timestamp, level, category, component, message,
          error_code, correlation_id, task_id, agent_id, provider_id,
          metadata_json, stack_trace, troubleshooting
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fullEvent.event_id,
        fullEvent.timestamp,
        fullEvent.level,
        fullEvent.category,
        fullEvent.component,
        fullEvent.message,
        fullEvent.error_code || null,
        fullEvent.correlation_id || null,
        fullEvent.task_id || null,
        fullEvent.agent_id || null,
        fullEvent.provider_id || null,
        fullEvent.metadata ? JSON.stringify(fullEvent.metadata) : null,
        fullEvent.stack_trace || null,
        fullEvent.troubleshooting || null
      );
    }
  } catch (err) {
    console.error('Failed to write event to SQLite:', err);
  }

  // 3. Append to rotating local log file
  try {
    const logLine = `[${fullEvent.timestamp}] [${fullEvent.level}] [${fullEvent.category}] [${fullEvent.component}] ${fullEvent.message}${fullEvent.error_code ? ` (Code: ${fullEvent.error_code})` : ''}\n`;
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch {
    // Non-fatal
  }

  // 4. Stream to connected SSE clients
  broadcastToSse(fullEvent);

  // 5. Console output with visual tag
  const tag = `[${fullEvent.level}] [${fullEvent.category}]`;
  if (fullEvent.level === 'CRITICAL' || fullEvent.level === 'ERROR') {
    console.error(tag, fullEvent.component, fullEvent.message, fullEvent.error_code || '');
  } else if (fullEvent.level === 'WARNING') {
    console.warn(tag, fullEvent.component, fullEvent.message);
  } else {
    console.log(tag, fullEvent.component, fullEvent.message);
  }

  return fullEvent;
}

/**
 * Returns automated actionable troubleshooting guidance for diagnostics panel
 */
function getAutomaticTroubleshooting(errorCode?: string, category?: LogCategory, message?: string): string {
  const msg = (message || '').toLowerCase();

  if (errorCode === 'API_KEY_INVALID' || msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
    return '1. Open Settings > AI Provider.\n2. Ensure your Gemini or Groq API key is active in your provider console.\n3. Verify there are no accidental spaces or linebreaks in the key.\n4. Click "Test Connection" to re-verify.';
  }
  if (errorCode === 'RATE_LIMIT' || msg.includes('resource_exhausted') || msg.includes('429')) {
    return '1. Provider rate-limit exceeded (HTTP 429).\n2. JARVIS will automatically attempt the secondary provider in the fallback chain.\n3. To reduce rate limits, consider configuring an additional API key or using local Ollama.';
  }
  if (errorCode === 'MIC_PERMISSION_DENIED' || msg.includes('permission denied') || msg.includes('notallowederror')) {
    return '1. The browser blocked microphone access.\n2. Click the camera/microphone icon in your browser URL address bar.\n3. Set Microphone to "Allow" and reload the page.\n4. Ensure Windows microphone privacy settings allow desktop apps.';
  }
  if (errorCode === 'TELEGRAM_AUTH_FAILED' || msg.includes('unauthorized') || msg.includes('401')) {
    return '1. The Telegram Bot Token is invalid or expired.\n2. Talk to @BotFather on Telegram and run /token to regenerate.\n3. Paste the new token into Settings > Telegram Bot Integration and click "Test Telegram Connection".';
  }
  if (errorCode === 'TELEGRAM_USER_UNAUTHORIZED' || msg.includes('forbidden user')) {
    return '1. An unauthorized Telegram user attempted to issue a command.\n2. To authorize yourself, find your Telegram User ID (e.g. from @userinfobot) and add it to Settings > Telegram > Authorized User IDs.';
  }
  if (category === 'VOICE') {
    return '1. Verify audio input/output devices in Settings > Voice.\n2. Check speaker volume and unmute toggles.\n3. Check browser Web Speech API support (Google Chrome and Edge provide native Bangla and English recognition).';
  }
  return 'Review the correlation ID and component error logs. Check connection status and retry the action.';
}

/**
 * Register SSE client for live streaming
 */
export function registerSseClient(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'INIT', message: 'Connected to JARVIS Live Diagnostics Stream' })}\n\n`);

  sseClients.add(res);

  res.on('close', () => {
    sseClients.delete(res);
  });
}

function broadcastToSse(event: SystemEvent) {
  const data = JSON.stringify({ type: 'EVENT', event });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Query logs with rich filtering options
 */
export function queryLogs(params: {
  category?: string;
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { events: SystemEvent[]; total: number } {
  const limit = params.limit || 100;
  const offset = params.offset || 0;

  try {
    const db = getDb();
    if (db) {
      let sql = 'SELECT * FROM system_events WHERE 1=1';
      const args: any[] = [];

      if (params.category && params.category !== 'ALL') {
        sql += ' AND category = ?';
        args.push(params.category);
      }
      if (params.level && params.level !== 'ALL') {
        sql += ' AND level = ?';
        args.push(params.level);
      }
      if (params.search) {
        sql += ' AND (message LIKE ? OR component LIKE ? OR error_code LIKE ?)';
        const queryTerm = `%${params.search}%`;
        args.push(queryTerm, queryTerm, queryTerm);
      }

      sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      args.push(limit, offset);

      const rows = db.prepare(sql).all(...args) as any[];
      const countRow = db.prepare('SELECT COUNT(*) as count FROM system_events').get() as any;

      const events: SystemEvent[] = rows.map((r) => ({
        event_id: r.event_id,
        timestamp: r.timestamp,
        level: r.level,
        category: r.category,
        component: r.component,
        message: r.message,
        error_code: r.error_code || undefined,
        correlation_id: r.correlation_id || undefined,
        task_id: r.task_id || undefined,
        agent_id: r.agent_id || undefined,
        provider_id: r.provider_id || undefined,
        metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined,
        stack_trace: r.stack_trace || undefined,
        troubleshooting: r.troubleshooting || undefined,
      }));

      return { events, total: countRow?.count || events.length };
    }
  } catch (err) {
    console.error('Error querying SQLite logs:', err);
  }

  // Fallback to in-memory events
  let filtered = [...memoryEvents];
  if (params.category && params.category !== 'ALL') {
    filtered = filtered.filter((e) => e.category === params.category);
  }
  if (params.level && params.level !== 'ALL') {
    filtered = filtered.filter((e) => e.level === params.level);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(s) ||
        e.component.toLowerCase().includes(s) ||
        (e.error_code && e.error_code.toLowerCase().includes(s))
    );
  }

  return {
    events: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

export function clearLogs(): boolean {
  memoryEvents.length = 0;
  try {
    const db = getDb();
    if (db) {
      db.prepare('DELETE FROM system_events').run();
    }
    return true;
  } catch {
    return false;
  }
}
