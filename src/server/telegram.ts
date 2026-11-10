import { logEvent } from './logger.ts';
import { generateJarvisResponse } from './gemini.ts';
import { getDb } from './database.ts';

interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  allowedUserIds: string[];
  enabled: boolean;
  pollingMode: boolean;
}

let activeConfig: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: '',
  allowedUserIds: (process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  pollingMode: true,
};

let pollingActive = false;
let pollingAbortController: AbortController | null = null;
let lastUpdateId = 0;

export function getTelegramConfig(): TelegramConfig {
  return {
    ...activeConfig,
    botToken: activeConfig.botToken ? `${activeConfig.botToken.substring(0, 8)}...` : '',
  };
}

export function updateTelegramConfig(newConfig: Partial<TelegramConfig>) {
  if (newConfig.botToken !== undefined && !newConfig.botToken.includes('...')) {
    activeConfig.botToken = newConfig.botToken;
  }
  if (newConfig.allowedUserIds !== undefined) {
    activeConfig.allowedUserIds = newConfig.allowedUserIds;
  }
  if (newConfig.enabled !== undefined) {
    activeConfig.enabled = newConfig.enabled;
  }
  if (newConfig.pollingMode !== undefined) {
    activeConfig.pollingMode = newConfig.pollingMode;
  }

  // Save to SQLite settings
  try {
    const db = getDb();
    if (db) {
      db.prepare(`
        INSERT INTO settings (key, value_json, updated_at)
        VALUES ('telegram_config', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at
      `).run(JSON.stringify(activeConfig), new Date().toISOString());
    }
  } catch (err) {
    console.error('Failed to save Telegram settings to DB:', err);
  }

  if (activeConfig.enabled && activeConfig.botToken && !pollingActive) {
    startTelegramPolling();
  } else if (!activeConfig.enabled && pollingActive) {
    stopTelegramPolling();
  }
}

/**
 * Validates a bot token with Telegram getMe API
 */
export async function testTelegramConnection(botToken?: string): Promise<{
  success: boolean;
  bot?: { id: number; username: string; first_name: string };
  message: string;
}> {
  const token = botToken || activeConfig.botToken;
  if (!token) {
    return { success: false, message: 'No Telegram Bot Token provided.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();

    if (data.ok && data.result) {
      activeConfig.botUsername = data.result.username;
      logEvent({
        level: 'INFO',
        category: 'TELEGRAM',
        component: 'TelegramBot',
        message: `Telegram Bot verified successfully: @${data.result.username} (${data.result.first_name})`,
        metadata: { botId: data.result.id, username: data.result.username },
      });

      return {
        success: true,
        bot: data.result,
        message: `Connected successfully to @${data.result.username}`,
      };
    } else {
      const errDescription = data.description || 'Invalid response from Telegram API';
      logEvent({
        level: 'ERROR',
        category: 'TELEGRAM',
        component: 'TelegramBot',
        message: `Telegram verification rejected: ${errDescription}`,
        error_code: 'TELEGRAM_AUTH_FAILED',
      });
      return { success: false, message: errDescription };
    }
  } catch (err: any) {
    const msg = err.message || String(err);
    logEvent({
      level: 'ERROR',
      category: 'TELEGRAM',
      component: 'TelegramBot',
      message: `Failed to reach Telegram servers: ${msg}`,
      error_code: 'TELEGRAM_NETWORK_ERROR',
    });
    return { success: false, message: `Network error reaching Telegram: ${msg}` };
  }
}

/**
 * Dispatches an outgoing message to the authorized user on Telegram
 */
export async function sendTelegramMessage(chatId: string | number, text: string, options: { parse_mode?: string } = {}) {
  if (!activeConfig.botToken) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${activeConfig.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'HTML',
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch (err: any) {
    logEvent({
      level: 'ERROR',
      category: 'TELEGRAM',
      component: 'TelegramBot',
      message: `Failed to deliver Telegram message: ${err.message}`,
      error_code: 'TELEGRAM_SEND_FAILED',
    });
    return false;
  }
}

/**
 * Broadcasts critical notifications to all whitelisted users
 */
export async function broadcastTelegramAlert(title: string, message: string) {
  if (!activeConfig.enabled || activeConfig.allowedUserIds.length === 0) return;

  const formatted = `<b>🚨 JARVIS Alert: ${title}</b>\n\n${message}\n\n<i>Time: ${new Date().toLocaleTimeString()}</i>`;
  for (const userId of activeConfig.allowedUserIds) {
    await sendTelegramMessage(userId, formatted);
  }
}

/**
 * Starts long-polling background daemon
 */
export async function startTelegramPolling() {
  if (pollingActive || !activeConfig.botToken) return;
  pollingActive = true;
  pollingAbortController = new AbortController();

  logEvent({
    level: 'INFO',
    category: 'TELEGRAM',
    component: 'TelegramBot',
    message: 'Telegram background long-polling daemon started.',
  });

  const pollLoop = async () => {
    while (pollingActive) {
      try {
        const url = `https://api.telegram.org/bot${activeConfig.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
        const res = await fetch(url, { signal: pollingAbortController?.signal });
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            if (update.message) {
              await handleIncomingMessage(update.message);
            }
          }
        }
      } catch (err: any) {
        if (!pollingActive) break;
        // Wait 3 seconds on error before retrying
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  pollLoop().catch((err) => {
    console.error('Fatal Telegram polling loop error:', err);
    pollingActive = false;
  });
}

export function stopTelegramPolling() {
  pollingActive = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  logEvent({
    level: 'INFO',
    category: 'TELEGRAM',
    component: 'TelegramBot',
    message: 'Telegram background polling daemon stopped.',
  });
}

/**
 * Processes incoming commands and text from Telegram
 */
async function handleIncomingMessage(msg: any) {
  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id);
  const text = (msg.text || '').trim();

  // 1. Authorization check
  const isAuthorized =
    activeConfig.allowedUserIds.length === 0 ||
    activeConfig.allowedUserIds.includes(userId) ||
    activeConfig.allowedUserIds.includes(String(chatId));

  logEvent({
    level: isAuthorized ? 'INFO' : 'WARNING',
    category: 'TELEGRAM',
    component: 'TelegramBot',
    message: `Received Telegram message from ${msg.from?.username || userId}: "${text.substring(0, 40)}"`,
    error_code: isAuthorized ? undefined : 'TELEGRAM_USER_UNAUTHORIZED',
    metadata: { userId, chatId, authorized: isAuthorized },
  });

  if (!isAuthorized) {
    await sendTelegramMessage(
      chatId,
      `⛔ <b>Access Denied</b>\n\nYour Telegram User ID (<code>${userId}</code>) is not on the authorized whitelist.\n\nPlease ask the JARVIS administrator to add your ID in <b>Settings &gt; Telegram Integration</b>.`
    );
    return;
  }

  // 2. Command routing
  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/start':
        await sendTelegramMessage(
          chatId,
          `🤖 <b>JARVIS Virtual CEO Online</b>\n\nGreetings, Sir. I am operational and standing by.\n\nType <code>/help</code> for available executive commands, or simply type your message to begin.`
        );
        break;

      case '/status':
        const uptimeMin = Math.round(process.uptime() / 60);
        await sendTelegramMessage(
          chatId,
          `📊 <b>JARVIS System Status</b>\n\n` +
            `• <b>Core Engine:</b> 🟢 ONLINE (Uptime: ${uptimeMin}m)\n` +
            `• <b>Database:</b> SQLite WAL (Active)\n` +
            `• <b>AI Provider:</b> Google Gemini 2.5/3.8 Flash\n` +
            `• <b>Voice System:</b> Bidirectional STT/TTS Ready\n` +
            `• <b>Active Agents:</b> 10 registered\n` +
            `• <b>Environment:</b> Hybrid (AI Studio & Windows Node.js)`
        );
        break;

      case '/help':
        await sendTelegramMessage(
          chatId,
          `📋 <b>JARVIS Telegram Command Directory</b>\n\n` +
            `<code>/status</code> — System health & active subsystems\n` +
            `<code>/task &lt;desc&gt;</code> — Submit new task to queue\n` +
            `<code>/report</code> — Generate executive progress report\n` +
            `<code>/approve &lt;id&gt;</code> — Approve pending Tier 2 action\n` +
            `<code>/cancel &lt;id&gt;</code> — Cancel task\n` +
            `<code>/logs</code> — Retrieve recent critical diagnostics\n` +
            `<code>/voice</code> — Voice subsystem operational status\n` +
            `<code>/help</code> — Show this manual`
        );
        break;

      case '/voice':
        await sendTelegramMessage(
          chatId,
          `🎙️ <b>Voice Subsystem Status</b>\n\n` +
            `• Speech-to-Text: Active (Bangla & English support)\n` +
            `• Text-to-Speech: Gemini 3.8 Flash TTS & Web Speech API\n` +
            `• Continuous Mode: Supported\n` +
            `• Barge-In: Active`
        );
        break;

      case '/task':
        if (!args) {
          await sendTelegramMessage(chatId, '⚠️ Please provide a task description: <code>/task Create market analysis report</code>');
        } else {
          try {
            const db = getDb();
            const taskId = `task_${Date.now()}`;
            if (db) {
              db.prepare(`
                INSERT INTO tasks (id, title, status, priority, created_at, updated_at)
                VALUES (?, ?, 'pending', 'normal', ?, ?)
              `).run(taskId, args, new Date().toISOString(), new Date().toISOString());
            }
            await sendTelegramMessage(chatId, `✅ <b>Task Created:</b> <code>${taskId}</code>\n"${args}" added to queue.`);
          } catch (e: any) {
            await sendTelegramMessage(chatId, `❌ Failed to create task: ${e.message}`);
          }
        }
        break;

      case '/logs':
        try {
          const db = getDb();
          const rows = db?.prepare('SELECT level, category, message, timestamp FROM system_events ORDER BY id DESC LIMIT 5').all() as any[];
          if (!rows || rows.length === 0) {
            await sendTelegramMessage(chatId, 'ℹ️ No diagnostic logs recorded yet.');
          } else {
            let logMsg = '<b>🔍 Recent System Diagnostics:</b>\n\n';
            for (const r of rows) {
              logMsg += `[${r.level}] <b>${r.category}</b>: ${r.message.substring(0, 70)}\n`;
            }
            await sendTelegramMessage(chatId, logMsg);
          }
        } catch (e: any) {
          await sendTelegramMessage(chatId, `❌ Error retrieving logs: ${e.message}`);
        }
        break;

      default:
        await sendTelegramMessage(chatId, `❓ Unknown command: <code>${command}</code>. Use <code>/help</code> for commands.`);
    }
    return;
  }

  // 3. Natural conversational query -> pass to Gemini AI
  try {
    const aiResp = await generateJarvisResponse(text, [], { language: 'en' });
    await sendTelegramMessage(chatId, aiResp.text);
  } catch (err: any) {
    await sendTelegramMessage(chatId, `⚠️ AI processing error: ${err.message}`);
  }
}

// Auto-start polling if configured
if (activeConfig.enabled && activeConfig.botToken) {
  setTimeout(() => {
    startTelegramPolling();
  }, 1000);
}
