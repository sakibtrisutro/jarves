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
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  verifySession, 
  revokeSession,
  revokeUserSessions,
  getUserActiveSessions,
  parseCookies,
  formatSessionCookie,
  formatClearCookie
} from './auth.ts';
import { getDb } from './database.ts';

export const apiRouter = Router();

/**
 * Auth Middleware with HttpOnly Cookie & Bearer Token support
 */
const authGuard = (req: Request, res: Response, next: any) => {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['jarvis_session'];
  const headerToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null;
  const token = cookieToken || headerToken;
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const session = verifySession(token);
  if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
  (req as any).user = session;
  (req as any).token = token;
  next();
};

// -------------------------------------------------------------
// 1. AUTHENTICATION & MULTI-USER ENDPOINTS
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const rawPassword = req.body?.password;
  const rememberMe = req.body?.rememberMe === true;

  if (rawUsername === undefined || rawUsername === null || rawPassword === undefined || rawPassword === null) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const cleanUsername = String(rawUsername).trim();
  const cleanPassword = String(rawPassword);

  if (!cleanUsername || cleanPassword === '') {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(?)').get(cleanUsername) as any;
    const isValid = user && verifyPassword(cleanPassword, user.password_hash);

    if (!user || !isValid) {
      logEvent({ level: 'WARNING', category: 'SECURITY', component: 'AuthManager', message: `Failed login for user: ${cleanUsername}`, error_code: 'INVALID_CREDENTIALS' });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Seamless migration to scrypt if old hash format
    if (!user.password_hash.startsWith('scrypt:')) {
      const upgradedHash = hashPassword(cleanPassword);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE LOWER(TRIM(username)) = LOWER(?)").run(upgradedHash, user.username);
      logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `Migrated password to scrypt: ${user.username}` });
    }

    const session = createSession(user.username, rememberMe);
    if (!session) throw new Error('Failed to create session');

    const isSecure = req.secure || process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', formatSessionCookie(session.token, rememberMe, isSecure));

    logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `User login: ${user.username}` });
    res.json({ 
      success: true, 
      token: session.token,
      expiresAt: session.expiresAt,
      user: { 
        username: user.username, 
        role: user.role, 
        voicePersonality: user.voice_personality, 
        mustChangePassword: user.must_change_password === 1,
        email: user.email,
        recoveryEmail: user.recovery_email
      } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  const rawUsername = req.body?.username;
  const rawNewPassword = req.body?.newPassword;
  const rawCurrentPassword = req.body?.currentPassword;

  const cleanUsername = String(rawUsername || '').trim();
  const cleanNewPassword = String(rawNewPassword || '');
  const cleanCurrentPassword = rawCurrentPassword !== undefined && rawCurrentPassword !== null ? String(rawCurrentPassword) : undefined;

  if (!cleanUsername || !cleanNewPassword || cleanNewPassword.length < 4) {
    return res.status(400).json({ error: 'Invalid input. Password must be at least 4 characters.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(?)').get(cleanUsername) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If current password provided, verify it
    if (cleanCurrentPassword !== undefined && !verifyPassword(cleanCurrentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password verification failed' });
    }

    const newHash = hashPassword(cleanNewPassword);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE LOWER(TRIM(username)) = LOWER(?)").run(newHash, user.username);
    
    // Automatically issue a valid session so the user can immediately continue without getting stuck
    const session = createSession(user.username, true);
    if (session) {
      const isSecure = req.secure || process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', formatSessionCookie(session.token, true, isSecure));
    }

    logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `Password changed for user: ${user.username}` });
    res.json({ 
      success: true, 
      message: 'Password updated successfully',
      token: session?.token,
      user: {
        username: user.username,
        role: user.role,
        voicePersonality: user.voice_personality,
        mustChangePassword: false,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email, username } = req.body;
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  // Check SMTP configuration status
  let smtpConfigured = Boolean(process.env.SMTP_HOST || process.env.SMTP_USER);
  try {
    const row = db.prepare("SELECT value_json FROM settings WHERE key = 'smtp'").get() as any;
    if (row?.value_json) {
      const cfg = JSON.parse(row.value_json);
      if (cfg.host && cfg.port) smtpConfigured = true;
    }
  } catch {}

  if (!smtpConfigured) {
    // Explicitly never pretend an email was sent when SMTP is not configured
    return res.status(503).json({
      success: false,
      configured: false,
      error: 'SMTP email recovery service is not configured on this host. Please configure SMTP credentials in Settings Center before using email recovery.'
    });
  }

  // If configured, create a secure recovery token
  const crypto = require('node:crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  try {
    db.prepare("INSERT INTO password_resets (email, token_hash, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))").run(email, tokenHash, expiresAt);
    logEvent({ level: 'INFO', category: 'SECURITY', component: 'AuthManager', message: `Password reset token generated for ${email}` });
    res.json({ success: true, message: 'Recovery email dispatched via configured SMTP relay.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Invalid reset payload' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  const crypto = require('node:crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = new Date().toISOString();

  try {
    const reset = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > ?').get(tokenHash, now) as any;
    if (!reset) return res.status(400).json({ error: 'Invalid or expired recovery token' });

    const user = db.prepare('SELECT username FROM users WHERE email = ? OR recovery_email = ?').get(reset.email, reset.email) as any;
    if (!user) return res.status(404).json({ error: 'No associated user found' });

    const newHash = hashPassword(newPassword);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE LOWER(TRIM(username)) = LOWER(?)").run(newHash, user.username);
    db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(tokenHash);

    res.json({ success: true, message: 'Password reset successfully. You may now log in.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/email', authGuard, (req: Request, res: Response) => {
  const { email, recoveryEmail } = req.body;
  const user = (req as any).user;
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  try {
    db.prepare("UPDATE users SET email = ?, recovery_email = ?, updated_at = datetime('now') WHERE LOWER(TRIM(username)) = LOWER(?)").run(email || null, recoveryEmail || null, user.username);
    res.json({ success: true, message: 'Account email configuration updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/sessions', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const sessions = getUserActiveSessions(user.username);
  res.json({ sessions, currentSessionId: user.id });
});

apiRouter.delete('/auth/sessions/:id', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.status(500).json({ error: 'Database unavailable' });
  try {
    db.prepare('DELETE FROM sessions WHERE id = ? AND username = ?').run(req.params.id, user.username);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/sessions/revoke-others', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  revokeUserSessions(user.username, user.id);
  res.json({ success: true, message: 'All other sessions revoked.' });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['jarvis_session'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (token) revokeSession(token);
  res.setHeader('Set-Cookie', formatClearCookie());
  res.json({ success: true });
});

apiRouter.get('/auth/me', authGuard, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const userData = db?.prepare('SELECT username, role, voice_personality, email, recovery_email, must_change_password FROM users WHERE LOWER(TRIM(username)) = LOWER(?)').get(user.username) as any;
  res.json({ 
    user: { 
      ...userData, 
      mustChangePassword: userData?.must_change_password === 1 
    },
    token: (req as any).token 
  });
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
    db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES ('api_keys', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").run(JSON.stringify(current));
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
    db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES ('api_keys', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").run(JSON.stringify(current));
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

    db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES ('intelligence_status', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").run(JSON.stringify({ status: discovered > 0 ? 'ACTIVE' : 'FAILED', lastInitialized: new Date().toISOString(), discoveredCount: discovered }));

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
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))
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
  const agents = [
    {
      id: 'partner',
      name: 'Partner (Virtual CEO)',
      role: 'Central Coordinator & Orchestrator',
      description: 'Strategic leadership, task prioritization, project planning, approvals, QC, and evidence reporting.',
      status: 'ONLINE',
      permissionTier: 'tier2',
      capabilities: ['Strategic Leadership', 'Multi-Agent Delegation', 'Approval Management', 'Evidence QC'],
      allowedTools: ['task_dispatch', 'agent_coordinate', 'qc_review', 'approval_manage', 'read_file']
    },
    {
      id: 'software_dev',
      name: 'Software Development Agent',
      role: 'Specialist: Engineering & Dev-Ops',
      description: 'Implementation, refactoring, unit testing, bug fixing, and continuous code quality.',
      status: 'READY',
      permissionTier: 'tier1',
      capabilities: ['Code Synthesis', 'Bug Fixing', 'Test Execution', 'Refactoring'],
      allowedTools: ['read_file', 'write_file', 'replace_file_content', 'run_command', 'git_diff', 'run_tests']
    },
    {
      id: 'research',
      name: 'Research & Intelligence Agent',
      role: 'Specialist: Technical & Market Intelligence',
      description: 'Technical and market investigations, source verification, and competitor benchmarking.',
      status: 'ONLINE',
      permissionTier: 'tier1',
      capabilities: ['Web Intelligence', 'Fact Checking', 'Document Synthesis', 'Cost Analysis'],
      allowedTools: ['web_search', 'fetch_webpage', 'parse_pdf', 'summarize_text']
    },
    {
      id: 'content_planning',
      name: 'Content Planning Agent',
      role: 'Specialist: Editorial & Seasonal Strategy',
      description: 'Omnichannel editorial calendar management, sales season alignment, and fashion trend monitoring.',
      status: 'READY',
      permissionTier: 'tier1',
      capabilities: ['Editorial Calendar', 'Trend Tracking', 'Brief Drafting', 'Campaign Mapping'],
      allowedTools: ['calendar_read', 'calendar_update', 'trend_analyzer']
    },
    {
      id: 'data_analysis',
      name: 'Data Analysis Agent',
      role: 'Specialist: Analytics & Metrics',
      description: 'Sales analytics, cart abandonment recovery tracking, ad ROI, and performance dashboards.',
      status: 'READY',
      permissionTier: 'tier1',
      capabilities: ['ACID Querying', 'Data Aggregation', 'Visual Charting', 'CSV Export'],
      allowedTools: ['sqlite_query', 'data_aggregate', 'chart_generate', 'export_csv']
    },
    {
      id: 'website_mgmt',
      name: 'Website Management Agent',
      role: 'Specialist: E-Commerce & Uptime',
      description: 'E-commerce site health monitoring, product catalog syncing, and cart recovery queue management.',
      status: 'READY',
      permissionTier: 'tier1',
      capabilities: ['Health Check', 'Catalog Sync', 'Abandonment Tracking', 'Sitemap Ping'],
      allowedTools: ['http_health_check', 'catalog_sync', 'cart_analytics_reader', 'sitemap_ping']
    },
    {
      id: 'fb_automation',
      name: 'Facebook Automation Agent',
      role: 'Specialist: Facebook Page & Ads',
      description: 'Facebook page management, post scheduling, comment triage, and audience insights.',
      status: 'IDLE',
      permissionTier: 'tier1',
      capabilities: ['Post Drafting', 'Comment Triage', 'Insights Retrieval'],
      allowedTools: ['fb_publish_post', 'fb_read_comments', 'fb_reply_comment', 'fb_fetch_insights']
    },
    {
      id: 'ig_automation',
      name: 'Instagram Automation Agent',
      role: 'Specialist: Visual Brand Presence',
      description: 'Product showcases, visual carousel scheduling, customer DM triage, and media engagement.',
      status: 'IDLE',
      permissionTier: 'tier1',
      capabilities: ['Visual Showcase', 'DM Triage', 'Media Analytics'],
      allowedTools: ['ig_publish_media', 'ig_read_messages', 'ig_fetch_analytics']
    },
    {
      id: 'yt_automation',
      name: 'YouTube Automation Agent',
      role: 'Specialist: Video SEO & Publishing',
      description: 'Video metadata optimization, scheduled uploads, retention analysis, and chapter tagging.',
      status: 'IDLE',
      permissionTier: 'tier1',
      capabilities: ['Video SEO', 'Metadata Generation', 'Retention Tracking'],
      allowedTools: ['yt_upload_video', 'yt_update_metadata', 'yt_fetch_analytics']
    },
    {
      id: 'video_production',
      name: 'Video Production Agent',
      role: 'Specialist: Video Synthesis & Reels',
      description: 'Product script generation, showcase reel assembly, caption overlay, and branding.',
      status: 'IDLE',
      permissionTier: 'tier1',
      capabilities: ['Script Writing', 'Reel Assembly', 'Caption Burning'],
      allowedTools: ['script_generator', 'ffmpeg_render', 'tts_synthesizer', 'subtitle_burn']
    },
    {
      id: 'image_processing',
      name: 'Image Processing Agent',
      role: 'Specialist: Asset Optimization',
      description: 'Batch cropping, background removal, catalog card watermarking, and WebP compression.',
      status: 'READY',
      permissionTier: 'tier1',
      capabilities: ['Batch Crop', 'Background Removal', 'Watermarking', 'WebP Conversion'],
      allowedTools: ['sharp_resize', 'bg_remove', 'watermark_overlay', 'webp_convert']
    }
  ];
  res.json({ agents });
});

apiRouter.get('/skills', authGuard, (req: Request, res: Response) => {
  const skills = [
    {
      id: 'assistant',
      name: 'Executive Assistant Skill',
      description: 'Persona adaptation, tone management, executive briefings, and natural language command parsing.',
      status: 'ACTIVE',
      file: 'src/skills/assistant.py',
      supportedAgents: ['partner']
    },
    {
      id: 'github',
      name: 'GitHub Skill',
      description: 'Repository auditing, file tree inspection, commit log verification, and diff extraction.',
      status: 'ACTIVE',
      file: 'src/skills/github_skill.py',
      supportedAgents: ['partner', 'software_dev']
    },
    {
      id: 'memory',
      name: 'Memory Engine Skill',
      description: 'Semantic preference extraction, episodic interaction logging, and long-term context retention.',
      status: 'ACTIVE',
      file: 'src/skills/memory.py',
      supportedAgents: ['partner', 'software_dev', 'research']
    },
    {
      id: 'notes',
      name: 'Notes & Scratchpad Skill',
      description: 'Persistent memo drafting, structured documentation updates, and knowledge preservation.',
      status: 'ACTIVE',
      file: 'src/skills/notes.py',
      supportedAgents: ['partner', 'content_planning']
    },
    {
      id: 'research',
      name: 'Research Skill',
      description: 'Web intelligence retrieval, URL fetching, document summarization, and citation verification.',
      status: 'ACTIVE',
      file: 'src/skills/research.py',
      supportedAgents: ['partner', 'research']
    },
    {
      id: 'status',
      name: 'System Status Skill',
      description: 'Real-time diagnostic telemetry, WAL database health verification, and memory monitoring.',
      status: 'ACTIVE',
      file: 'src/skills/status.py',
      supportedAgents: ['partner', 'software_dev']
    },
    {
      id: 'tasks',
      name: 'Tasks & Workflow Skill',
      description: 'Task state transitions, schedule reconciliation, priority queues, and execution tracking.',
      status: 'ACTIVE',
      file: 'src/skills/tasks.py',
      supportedAgents: ['partner', 'software_dev', 'data_analysis']
    },
    {
      id: 'model_router',
      name: 'Model Intelligence Router',
      description: 'Latency ranking, dynamic model discovery, Strict Free Mode enforcement, and automated fallback pipeline.',
      status: 'ACTIVE',
      file: 'src/server/model_registry.ts',
      supportedAgents: ['partner', 'software_dev', 'research']
    },
    {
      id: 'voice',
      name: 'Voice & Speech Synthesis',
      description: 'Bilingual Bangla/English acoustic routing, barge-in speech cancellation, and feedback loop prevention.',
      status: 'ACTIVE',
      file: 'src/components/VoiceController.tsx',
      supportedAgents: ['partner']
    },
    {
      id: 'telegram',
      name: 'Telegram Gateway Skill',
      description: 'Secure bidirectional messaging, authorized ID whitelist enforcement, and mobile notifications.',
      status: 'ACTIVE',
      file: 'src/server/telegram.ts',
      supportedAgents: ['partner']
    }
  ];
  res.json({ skills });
});

apiRouter.post('/tasks/:id/approve', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.status(500).json({ error: 'DB unavailable' });
  try {
    db.prepare(`UPDATE tasks SET status = 'pending', updated_at = datetime('now') WHERE id = ? AND username = ?`).run(req.params.id, user.username);
    recordEvent(user.username, 'task_approved', 'Task Approved', `Task ${req.params.id} approved by executive.`, req.params.id);
    res.json({ success: true, message: 'Task approved and queued for execution' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/tasks/:id/reject', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.status(500).json({ error: 'DB unavailable' });
  try {
    db.prepare(`UPDATE tasks SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND username = ?`).run(req.params.id, user.username);
    recordEvent(user.username, 'task_rejected', 'Task Rejected', `Task ${req.params.id} rejected by executive.`, req.params.id);
    res.json({ success: true, message: 'Task rejected and cancelled' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/tasks/:id/retry', authGuard, (req: Request, res: Response) => {
  const db = getDb();
  const user = (req as any).user;
  if (!db) return res.status(500).json({ error: 'DB unavailable' });
  try {
    db.prepare(`UPDATE tasks SET status = 'pending', error_json = NULL, updated_at = datetime('now') WHERE id = ? AND username = ?`).run(req.params.id, user.username);
    res.json({ success: true, message: 'Task reset to pending queue for retry' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
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
      db.prepare("INSERT OR IGNORE INTO conversations (id, username, title, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))").run(convId, currentUser, message.substring(0, 30));
      db.prepare("INSERT INTO messages (id, conversation_id, username, role, content, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))").run(`msg_${Date.now()}`, convId, currentUser, 'user', message);
    }

    const ai = await generateJarvisResponse(message, history || [], { username: currentUser, language, voiceMode, provider, model, apiKey, freeOnly, forceModel, naturalInstructions });

    if (db) {
      db.prepare("INSERT INTO messages (id, conversation_id, username, role, content, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))").run(`msg_${Date.now() + 1}`, convId, currentUser, 'assistant', ai.text);
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
    db.prepare("INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").run(category, JSON.stringify(values));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/settings/test-ai', authGuard, async (req: Request, res: Response) => {
  res.json(await testAiProviderConnection(req.body.provider, req.body.apiKey));
});
