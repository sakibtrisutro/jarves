import { Router, Request, Response } from 'express';
import { logEvent, queryLogs, clearLogs, registerSseClient } from './logger.ts';
import { generateJarvisResponse, transcribeAudioWithGemini, synthesizeSpeechWithGemini, testAiProviderConnection } from './gemini.ts';
import { getTelegramConfig, updateTelegramConfig, testTelegramConnection } from './telegram.ts';
import { getDb } from './database.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// 1. HEALTH & DIAGNOSTICS OVERVIEW
// -------------------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  const db = getDb();
  let dbStatus = 'DISCONNECTED';
  let totalEvents = 0;
  let activeTasksCount = 0;

  try {
    if (db) {
      const row = db.prepare('SELECT 1 as ok').get() as any;
      if (row?.ok === 1) dbStatus = 'HEALTHY';
      const evRow = db.prepare('SELECT COUNT(*) as count FROM system_events').get() as any;
      totalEvents = evRow?.count || 0;
      const tRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'running' OR status = 'pending'").get() as any;
      activeTasksCount = tRow?.count || 0;
    }
  } catch {
    dbStatus = 'ERROR';
  }

  const telegramConfig = getTelegramConfig();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    subsystems: {
      backend: 'HEALTHY',
      database: dbStatus,
      ai_provider: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'UNCONFIGURED',
      telegram_bot: telegramConfig.enabled ? 'ACTIVE' : 'STANDBY',
      voice_engine: 'READY',
      active_agents: 10,
      active_tasks: activeTasksCount,
      total_diagnostic_events: totalEvents,
    },
  });
});

// -------------------------------------------------------------
// 2. LIVE SYSTEM LOGS & DIAGNOSTICS ENDPOINTS
// -------------------------------------------------------------
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
  logEvent({
    level: 'INFO',
    category: 'SYSTEM',
    component: 'DiagnosticsCenter',
    message: 'User initiated log purge. Event logs cleared.',
  });
  res.json({ success: ok });
});

apiRouter.get('/logs/export', (req: Request, res: Response) => {
  const result = queryLogs({ limit: 1000 });
  res.setHeader('Content-Disposition', `attachment; filename="jarvis_diagnostics_${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(result.events, null, 2));
});

// -------------------------------------------------------------
// 3. VOICE INTERACTION ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/voice/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) {
    return res.status(400).json({ error: 'Missing audioBase64 in request payload.' });
  }

  try {
    const transcript = await transcribeAudioWithGemini(audioBase64, mimeType || 'audio/webm');
    res.json({ transcript });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Audio transcription failed' });
  }
});

apiRouter.post('/voice/tts', async (req: Request, res: Response) => {
  const { text, voiceName } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request payload.' });
  }

  try {
    const result = await synthesizeSpeechWithGemini(text, voiceName || 'Puck');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'TTS synthesis failed' });
  }
});

// -------------------------------------------------------------
// 4. CONVERSATIONAL CHAT ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, conversationId, history, language, voiceMode } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message parameter.' });
  }

  const convId = conversationId || `conv_${Date.now()}`;

  try {
    const db = getDb();

    // Ensure conversation exists
    if (db) {
      db.prepare(`
        INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(convId, message.substring(0, 30), new Date().toISOString(), new Date().toISOString());

      // Save user message
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, ?)
      `).run(`msg_${Date.now()}`, convId, message, new Date().toISOString());
    }

    // Generate AI response
    const aiResponse = await generateJarvisResponse(message, history || [], {
      language: language || 'en',
      voiceMode: Boolean(voiceMode),
    });

    // Save assistant message
    if (db) {
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, ?)
      `).run(`msg_${Date.now() + 1}`, convId, aiResponse.text, new Date().toISOString());
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

  try {
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SETTINGS & INTEGRATIONS ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const settingsObj: Record<string, any> = {
    general: {
      appName: 'JARVIS Virtual CEO',
      language: 'en',
      defaultMode: 'voice',
      theme: 'dark',
      soundEnabled: true,
      autoReadAloud: true,
    },
    ai: {
      defaultProvider: 'gemini',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      selectedModel: 'gemini-3.8-flash',
      groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      ollamaUrl: 'http://localhost:11434',
    },
    voice: {
      voiceInputEnabled: true,
      voiceOutputEnabled: true,
      continuousMode: true,
      pushToTalk: false,
      speechSpeed: 1.0,
      speechVolume: 1.0,
      language: 'en-US',
      preferredVoice: 'default',
    },
    telegram: getTelegramConfig(),
  };

  if (db) {
    try {
      const rows = db.prepare('SELECT key, value_json FROM settings').all() as any[];
      for (const r of rows) {
        try {
          settingsObj[r.key] = JSON.parse(r.value_json);
        } catch {}
      }
    } catch {}
  }

  res.json(settingsObj);
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const { category, values } = req.body;

  if (category === 'telegram' && values) {
    updateTelegramConfig(values);
  }

  if (db && category && values) {
    try {
      db.prepare(`
        INSERT INTO settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at
      `).run(category, JSON.stringify(values), new Date().toISOString());
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  logEvent({
    level: 'INFO',
    category: 'SYSTEM',
    component: 'SettingsManager',
    message: `Updated settings category: "${category}"`,
  });

  res.json({ success: true });
});

apiRouter.post('/settings/test-ai', async (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;
  const result = await testAiProviderConnection(provider || 'gemini', apiKey);
  res.json(result);
});

apiRouter.post('/settings/test-telegram', async (req: Request, res: Response) => {
  const { botToken } = req.body;
  const result = await testTelegramConnection(botToken);
  res.json(result);
});

// -------------------------------------------------------------
// 6. STRUCTURED TASKS & AGENT ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.json({ tasks: [] });

  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50').all();
    res.json({ tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/tasks', (req: Request, res: Response) => {
  const { title, description, priority, assigned_agent } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const db = getDb();
  const taskId = `task_${Date.now()}`;

  if (db) {
    try {
      db.prepare(`
        INSERT INTO tasks (id, title, description, status, priority, assigned_agent, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(
        taskId,
        title,
        description || '',
        priority || 'normal',
        assigned_agent || 'JARVIS_CORE',
        new Date().toISOString(),
        new Date().toISOString()
      );

      logEvent({
        level: 'INFO',
        category: 'TASK',
        component: 'TaskManager',
        message: `Task created: "${title}" (ID: ${taskId})`,
        task_id: taskId,
      });

      return res.json({ id: taskId, success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ id: taskId, success: true });
});
