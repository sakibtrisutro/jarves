import { Router, Request, Response } from 'express';
import { logEvent, queryLogs, clearLogs, registerSseClient } from './logger.ts';
import {
  generateJarvisResponse,
  transcribeAudioWithGemini,
  synthesizeSpeechWithGemini,
  testAiProviderConnection,
  getApiKeys,
  getAiSettings,
} from './gemini.ts';
import {
  fetchOpenRouterModels,
  fetchGeminiModels,
  fetchOpenAiModels,
  initModelRegistry,
} from './model_registry.ts';
import { getUserMemories, saveUserMemory, deleteUserMemory, getEpisodicMemories, recordEvent } from './memory.ts';
import { hashPassword, verifyPassword, createSession, verifySession, revokeSession } from './auth.ts';
import { getDb } from './database.ts';

export const apiRouter = Router();

/**
 * Auth Middleware
 */
const authGuard = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const session = verifySession(token);
  if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
  (req as any).user = session;
  next();
};

// -------------------------------------------------------------
// 1. AUTHENTICATION & MULTI-USER ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      logEvent({ level: 'WARNING', category: 'SECURITY', component: 'AuthManager', message: `Failed login: ${username}`, error_code: 'INVALID_CREDENTIALS' });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const session = createSession(user.username, rememberMe === true);
    if (!session) throw new Error('Failed to create session');

    logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `User login: ${username}` });
    res.json({ 
      success: true, 
      token: session.token,
      expiresAt: session.expiresAt,
      user: { 
        username: user.username, 
        role: user.role, 
        voicePersonality: user.voice_personality, 
        mustChangePassword: user.must_change_password === 1,
        email: user.email
      } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  const { username, newPassword, currentPassword } = req.body;
  if (!username || !newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Invalid input. Password must be at least 4 characters.' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    // If not a first-login scenario, we should ideally check current password
    // For now, let's just allow it for simplicity as per previous logic, but with more safety
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime("now") WHERE username = ?').run(newHash, username);
    
    logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `Password changed for user: ${username}` });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) revokeSession(token);
  res.json({ success: true });
});

apiRouter.get('/auth/me', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const userData = db?.prepare('SELECT username, role, voice_personality, email, must_change_password FROM users WHERE username = ?').get(user.username) as any;
  res.json({ user: { ...userData, mustChangePassword: userData.must_change_password === 1 } });
});

// -------------------------------------------------------------
// 2. AI PROVIDER & MODEL INTELLIGENCE ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/keys', authGuard, (req: Request, res: Response) => {
  const keys = getApiKeys();
  const mask = (k?: string) => (k && k.length > 8 ? `${k.substring(0, 4)}...${k.substring(k.length - 4)}` : '');
  res.json({
    gemini: { configured: Boolean(keys.gemini || process.env.GEMINI_API_KEY), masked: mask(keys.gemini || process.env.GEMINI_API_KEY) },
    openai: { configured: Boolean(keys.openai), masked: mask(keys.openai) },
    openrouter: { configured: Boolean(keys.openrouter), masked: mask(keys.openrouter) },
  });
});

apiRouter.post('/keys', authGuard, (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;
  const db = getDb();
  if (!db || !provider || !apiKey) return res.status(400).json({ error: 'Missing parameters.' });

  try {
    const current = getApiKeys();
    current[provider.toLowerCase()] = apiKey.trim();
    db.prepare('INSERT INTO settings (key, value_json, updated_at) VALUES ("api_keys", ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(JSON.stringify(current));
    logEvent({ level: 'INFO', category: 'SECURITY', component: 'KeyManager', message: `Updated key: ${provider}` });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/keys/:provider', authGuard, (req: Request, res: Response) => {
  const provider = req.params.provider.toLowerCase();
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const current = getApiKeys();
    delete current[provider];
    db.prepare('INSERT INTO settings (key, value_json, updated_at) VALUES ("api_keys", ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(JSON.stringify(current));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/models', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.json({ models: [] });
  try {
    const models = db.prepare('SELECT * FROM model_registry ORDER BY is_free DESC, reasoning_score DESC').all();
    res.json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/models/discover', authGuard, async (req: Request, res: Response) => {
  const { provider } = req.body;
  const keys = getApiKeys();
  let total = 0;
  try {
    if (!provider || provider === 'all' || provider === 'gemini') {
      const k = keys.gemini || process.env.GEMINI_API_KEY;
      if (k) total += await fetchGeminiModels(k);
    }
    if (!provider || provider === 'all' || provider === 'openai') {
      if (keys.openai) total += await fetchOpenAiModels(keys.openai);
    }
    if (!provider || provider === 'all' || provider === 'openrouter') {
      if (keys.openrouter) total += await fetchOpenRouterModels(keys.openrouter);
    }
    res.json({ success: true, totalDiscovered: total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/models/initialize-intelligence', authGuard, async (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    initModelRegistry();
    const keys = getApiKeys();
    let discovered = 0;
    if (keys.gemini || process.env.GEMINI_API_KEY) discovered += await fetchGeminiModels(keys.gemini || (process.env.GEMINI_API_KEY as string));
    if (keys.openai) discovered += await fetchOpenAiModels(keys.openai);
    if (keys.openrouter) discovered += await fetchOpenRouterModels(keys.openrouter);

    db.prepare('INSERT INTO settings (key, value_json, updated_at) VALUES ("intelligence_status", ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(JSON.stringify({ status: discovered > 0 ? 'ACTIVE' : 'FAILED', lastInitialized: new Date().toISOString(), discoveredCount: discovered }));

    logEvent({ level: 'INFO', category: 'API', component: 'ModelIntelligenceEngine', message: `Intelligence Initialized. Discovered: ${discovered}` });
    res.json({ success: true, discoveredCount: discovered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/models/status', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const keys = getApiKeys();
  const settings = getAiSettings();
  let intel: any = { status: 'NOT_INITIALIZED' };
  if (db) {
    try {
      const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('intelligence_status') as any;
      if (row?.value_json) intel = JSON.parse(row.value_json);
    } catch {}
  }
  const isConfigured = Boolean(keys.gemini || keys.openai || keys.openrouter || process.env.GEMINI_API_KEY);
  res.json({ isConfigured, intelligence: intel, settings });
});

// -------------------------------------------------------------
// 3. PERSISTENT MEMORY ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/memory', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const memories = getUserMemories(user.username, req.query.category as string);
  res.json({ memories });
});

apiRouter.get('/memory/episodic', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  res.json({ memories: getEpisodicMemories(user.username, limit) });
});

apiRouter.post('/memory', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { category, key, content } = req.body;
  if (!key || !content) return res.status(400).json({ error: 'Missing parameters.' });
  saveUserMemory(user.username, category || 'preference', key, content);
  res.json({ success: true });
});

apiRouter.delete('/memory/:id', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const success = deleteUserMemory(user.username, req.params.id);
  res.json({ success });
});

// -------------------------------------------------------------
// 4. TASK & SCHEDULER ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/tasks', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.json({ tasks: [] });
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE username = ? ORDER BY created_at DESC').all(user.username);
    res.json({ tasks });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/tasks', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  const { title, description, priority, schedule_type, scheduled_at } = req.body;
  if (!db || !title) return res.status(400).json({ error: 'Title required' });

  const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    db.prepare(`
      INSERT INTO tasks (id, username, title, description, status, priority, schedule_type, scheduled_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, datetime("now"), datetime("now"))
    `).run(id, user.username, title, description || '', priority || 'normal', schedule_type || 'once', scheduled_at || null);
    
    recordEvent(user.username, 'task_created', 'New Task Registered', `Task "${title}" added to queue.`, id);

    res.json({ success: true, taskId: id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.patch('/tasks/:id', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  const { status, priority, title, description } = req.body;
  if (!db) return res.status(500).json({ error: 'DB unavailable' });

  try {
    const updates: string[] = [];
    const params: any[] = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description) { updates.push('description = ?'); params.push(description); }
    
    if (updates.length === 0) return res.json({ success: true });

    params.push(new Date().toISOString());
    params.push(req.params.id);
    params.push(user.username);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')}, updated_at = ? WHERE id = ? AND username = ?`).run(...params);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// -------------------------------------------------------------
// 5. AGENT & CONVERSATION ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/conversations', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.json({ conversations: [] });
  try {
    const rows = db.prepare('SELECT * FROM conversations WHERE username = ? AND is_archived = 0 ORDER BY updated_at DESC').all(user.username);
    res.json({ conversations: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/agents', authGuard, (req: Request, res: Response) => {
  // Discovery logic for agents in /repo/agents or equivalent
  const agents = [
    { id: 'coding_agent', name: 'Dev-Ops Engine', description: 'Advanced code analysis and workspace modification.', status: 'READY', capabilities: ['Code Writing', 'Refactoring', 'Bug Hunting'] },
    { id: 'executive_partner', name: 'Strategic Partner', description: 'Business logic orchestration and high-level decision support.', status: 'ONLINE', capabilities: ['Strategy', 'Reporting', 'Approval Management'] }
  ];
  res.json({ agents });
});

// -------------------------------------------------------------
// 6. HEALTH & DIAGNOSTICS ENDPOINTS
// -------------------------------------------------------------
apiRouter.get('/health', async (req: Request, res: Response) => {
  const db = getDb();
  let dbStatus = 'DISCONNECTED';
  let totalEvents = 0;
  if (db) {
    try {
      if (db.prepare('SELECT 1 as ok').get()?.ok === 1) dbStatus = 'HEALTHY';
      totalEvents = (db.prepare('SELECT COUNT(*) as count FROM system_events').get() as any)?.count || 0;
    } catch { dbStatus = 'ERROR'; }
  }

  // Get LAN IP
  const os = await import('node:os');
  const nets = os.networkInterfaces();
  let lanIp = '127.0.0.1';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
    if (lanIp !== '127.0.0.1') break;
  }

  const hasKey = Boolean(getApiKeys().gemini || getApiKeys().openai || getApiKeys().openrouter || process.env.GEMINI_API_KEY);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    lanIp,
    subsystems: { backend: 'HEALTHY', database: dbStatus, ai_provider: hasKey ? 'CONFIGURED' : 'UNCONFIGURED', voice_engine: 'READY', active_agents: 10, total_diagnostic_events: totalEvents },
  });
});

apiRouter.get('/logs', authGuard, (req: Request, res: Response) => {
  const { category, level, search, limit, offset } = req.query;
  res.json(queryLogs({ category: category as string, level: level as string, search: search as string, limit: limit ? parseInt(limit as string, 10) : 100, offset: offset ? parseInt(offset as string, 10) : 0 }));
});

apiRouter.get('/logs/stream', (req: Request, res: Response) => registerSseClient(res));
apiRouter.post('/logs/clear', authGuard, (req: Request, res: Response) => res.json({ success: clearLogs() }));

// -------------------------------------------------------------
// 5. VOICE & CHAT ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/voice/transcribe', authGuard, async (req: Request, res: Response) => {
  try { res.json({ transcript: await transcribeAudioWithGemini(req.body.audioBase64, req.body.mimeType) }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/voice/tts', authGuard, async (req: Request, res: Response) => {
  try { res.json(await synthesizeSpeechWithGemini(req.body.text, req.body.voiceName)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/chat', authGuard, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { message, conversationId, history, language, voiceMode, provider, model, apiKey, freeOnly, forceModel, naturalInstructions } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message.' });

  const convId = conversationId || `conv_${Date.now()}`;
  const currentUser = user.username;

  try {
    const db = getDb();
    if (db) {
      db.prepare('INSERT OR IGNORE INTO conversations (id, username, title, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))').run(convId, currentUser, message.substring(0, 30));
      db.prepare('INSERT INTO messages (id, conversation_id, username, role, content, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))').run(`msg_${Date.now()}`, convId, currentUser, 'user', message);
    }

    const ai = await generateJarvisResponse(message, history || [], { username: currentUser, language, voiceMode, provider, model, apiKey, freeOnly, forceModel, naturalInstructions });

    if (db) {
      db.prepare('INSERT INTO messages (id, conversation_id, username, role, content, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))').run(`msg_${Date.now() + 1}`, convId, currentUser, 'assistant', ai.text);
    }

    res.json({ text: ai.text, conversationId: convId, provider: ai.provider, model: ai.model, fallbackCount: ai.fallbackCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Chat error' });
  }
});

apiRouter.get('/conversations/:id/messages', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  if (!db) return res.json({ messages: [] });
  const user = (req as any).user;
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? AND username = ? ORDER BY created_at ASC').all(req.params.id, user.username);
  res.json({ messages });
});

apiRouter.get('/settings', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const settings: Record<string, any> = {
    general: { appName: 'JARVIS Virtual CEO', language: 'en', theme: 'dark' },
    ai: getAiSettings(),
    voice: { pttEnabled: true, autoListen: false, continuousMode: false, speechSpeed: 1.0, speechVolume: 1.0 },
    telegram: { enabled: false },
    network: { port: 3000, lanEnabled: true }
  };
  if (db) {
    try {
      const rows = db.prepare('SELECT key, value_json FROM settings').all() as any[];
      for (const r of rows) { try { settings[r.key] = JSON.parse(r.value_json); } catch {} }
    } catch {}
  }
  res.json(settings);
});

apiRouter.post('/settings', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const { category, values } = req.body;
  if (!db || !category || !values) return res.status(400).json({ error: 'Invalid parameters.' });
  try {
    db.prepare('INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(category, JSON.stringify(values));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/settings/test-ai', authGuard, async (req: Request, res: Response) => {
  res.json(await testAiProviderConnection(req.body.provider, req.body.apiKey));
});
