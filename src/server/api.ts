import { Router, Request, Response } from 'express';
import { logEvent, queryLogs, clearLogs, registerSseClient } from './logger.ts';
import { generateJarvisResponse, transcribeAudioWithGemini, synthesizeSpeechWithGemini, testAiProviderConnection } from './gemini.ts';
import { fetchOpenRouterModels } from './model_registry.ts';
import { getUserMemories, saveUserMemory, deleteUserMemory } from './memory.ts';
import { hashPassword, verifyPassword } from './auth.ts';
import { getDb } from './database.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// 1. AUTHENTICATION & MULTI-USER ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      logEvent({
        level: 'WARNING',
        category: 'SECURITY',
        component: 'AuthManager',
        message: `Failed login attempt for username "${username}"`,
        error_code: 'INVALID_CREDENTIALS',
      });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    logEvent({
      level: 'INFO',
      category: 'SECURITY',
      component: 'AuthManager',
      message: `User "${username}" logged in successfully.`,
    });

    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        voicePersonality: user.voice_personality,
        mustChangePassword: user.must_change_password === 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Invalid username or password format (min 4 chars).' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const newHash = hashPassword(newPassword);
    db.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
      WHERE username = ?
    `).run(newHash, username);

    logEvent({
      level: 'INFO',
      category: 'SECURITY',
      component: 'AuthManager',
      message: `Password changed successfully for user "${username}"`,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. MODEL INTELLIGENCE & OPENROUTER ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/models', (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.json({ models: [] });

  try {
    const models = db.prepare('SELECT * FROM model_registry ORDER BY is_free DESC, reasoning_score DESC').all();
    res.json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/models/sync-openrouter', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenRouter API Key required for catalog sync.' });
  }

  try {
    const count = await fetchOpenRouterModels(apiKey);
    res.json({ success: true, syncedCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PERSISTENT MEMORY ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/memory', (req: Request, res: Response) => {
  const username = (req.query.username as string) || 'Sakib';
  const category = req.query.category as string;
  const memories = getUserMemories(username, category);
  res.json({ memories });
});

apiRouter.post('/memory', (req: Request, res: Response) => {
  const { username, category, key, content } = req.body;
  if (!username || !key || !content) {
    return res.status(400).json({ error: 'Missing required memory parameters.' });
  }
  saveUserMemory(username, category || 'preference', key, content);
  res.json({ success: true });
});

apiRouter.delete('/memory/:id', (req: Request, res: Response) => {
  const { username } = req.body;
  const success = deleteUserMemory(username || 'Sakib', req.params.id);
  res.json({ success });
});

// -------------------------------------------------------------
// 4. HEALTH & DIAGNOSTICS ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  const db = getDb();
  let dbStatus = 'DISCONNECTED';
  let totalEvents = 0;

  try {
    if (db) {
      const row = db.prepare('SELECT 1 as ok').get() as any;
      if (row?.ok === 1) dbStatus = 'HEALTHY';
      const evRow = db.prepare('SELECT COUNT(*) as count FROM system_events').get() as any;
      totalEvents = evRow?.count || 0;
    }
  } catch {
    dbStatus = 'ERROR';
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    subsystems: {
      backend: 'HEALTHY',
      database: dbStatus,
      ai_provider: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'UNCONFIGURED',
      model_intelligence: 'ACTIVE',
      voice_engine: 'READY',
      active_agents: 10,
      total_diagnostic_events: totalEvents,
    },
  });
});

apiRouter.get('/logs', (req: Request, res: Response) => {
  const { category, level, search, limit, offset } = req.query;
  const result = queryLogs({
    category: category as string,
    level: level as string,
    search: search as string,
    limit: limit ? parseInt(limit as string, 10) : 100,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });
  res.json(result);
});

apiRouter.get('/logs/stream', (req: Request, res: Response) => {
  registerSseClient(res);
});

apiRouter.post('/logs/clear', (req: Request, res: Response) => {
  const ok = clearLogs();
  res.json({ success: ok });
});

// -------------------------------------------------------------
// 5. VOICE & CHAT ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/voice/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = req.body;
  try {
    const transcript = await transcribeAudioWithGemini(audioBase64, mimeType);
    res.json({ transcript });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/voice/tts', async (req: Request, res: Response) => {
  const { text, voiceName } = req.body;
  try {
    const result = await synthesizeSpeechWithGemini(text, voiceName || 'Puck');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, conversationId, history, username, language, voiceMode, provider, apiKey, freeOnly, naturalInstructions } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message parameter.' });

  const convId = conversationId || `conv_${Date.now()}`;
  const currentUser = username || 'Sakib';

  try {
    const db = getDb();
    if (db) {
      db.prepare(`
        INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(convId, message.substring(0, 30));

      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, datetime('now'))
      `).run(`msg_${Date.now()}`, convId, message);
    }

    const aiResponse = await generateJarvisResponse(message, history || [], {
      username: currentUser,
      language: language || 'en',
      voiceMode: Boolean(voiceMode),
      provider,
      apiKey,
      freeOnly: freeOnly !== undefined ? freeOnly : true,
      naturalInstructions,
    });

    if (db) {
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, datetime('now'))
      `).run(`msg_${Date.now() + 1}`, convId, aiResponse.text);
    }

    res.json({
      text: aiResponse.text,
      conversationId: convId,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Chat generation error' });
  }
});

apiRouter.get('/conversations/:id/messages', (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.json({ messages: [] });
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ messages });
});

// -------------------------------------------------------------
// 6. SETTINGS & INTELLIGENCE CONFIG ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const settingsObj: Record<string, any> = {
    general: { appName: 'JARVIS Virtual CEO', language: 'en', theme: 'dark', autoReadAloud: true },
    ai: { defaultProvider: 'gemini', freeOnly: true, selectedModel: 'gemini-3.8-flash', naturalInstructions: 'Always prioritize free models.' },
    voice: { voiceInputEnabled: true, voiceOutputEnabled: true, continuousMode: true, speechSpeed: 1.0, speechVolume: 1.0 },
  };

  if (db) {
    try {
      const rows = db.prepare('SELECT key, value_json FROM settings').all() as any[];
      for (const r of rows) {
        try { settingsObj[r.key] = JSON.parse(r.value_json); } catch {}
      }
    } catch {}
  }
  res.json(settingsObj);
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const { category, values } = req.body;
  if (db && category && values) {
    try {
      db.prepare(`
        INSERT INTO settings (key, value_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at
      `).run(category, JSON.stringify(values));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ success: true });
});

apiRouter.post('/settings/test-ai', async (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;
  const result = await testAiProviderConnection(provider || 'gemini', apiKey);
  res.json(result);
});
