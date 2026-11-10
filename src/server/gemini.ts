import { GoogleGenAI } from '@google/genai';
import { logEvent } from './logger.ts';
import { selectBestModelForTask } from './model_registry.ts';
import { getDb } from './database.ts';
import { getUserMemories } from './memory.ts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Retrieves configured API keys from SQLite settings table
 */
export function getApiKeys(): Record<string, string> {
  const db = getDb();
  if (!db) return {};

  try {
    const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('api_keys') as any;
    if (row?.value_json) {
      return JSON.parse(row.value_json);
    }
  } catch {}
  return {};
}

/**
 * Retrieves current AI settings (provider, forced model, free mode, bootstrap status)
 */
export function getAiSettings(): {
  provider: string;
  selectedModel: string;
  freeOnly: boolean;
  forceModel: boolean;
  forcedModelId: string;
  forcedProvider: string;
  naturalInstructions: string;
} {
  const db = getDb();
  const defaults = {
    provider: '',
    selectedModel: '',
    freeOnly: true,
    forceModel: false,
    forcedModelId: '',
    forcedProvider: '',
    naturalInstructions: 'Always prioritize free models.',
  };

  if (!db) return defaults;

  try {
    const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('ai') as any;
    if (row?.value_json) {
      return { ...defaults, ...JSON.parse(row.value_json) };
    }
  } catch {}
  return defaults;
}

/**
 * Unified JARVIS Generation Engine supporting Google Gemini, OpenAI, and OpenRouter
 * Enforces Force Model Mode, Strict Free Policy, and Zero-Configuration Guardrails.
 */
export async function generateJarvisResponse(
  prompt: string,
  history: ChatMessage[] = [],
  options: {
    username?: string;
    language?: 'en' | 'bn';
    voiceMode?: boolean;
    provider?: string;
    model?: string;
    apiKey?: string;
    freeOnly?: boolean;
    forceModel?: boolean;
    naturalInstructions?: string;
  } = {}
): Promise<{ text: string; provider: string; model: string; tokens?: number }> {
  const startTime = Date.now();
  const username = options.username || 'Sakib';
  const isSanjida = username.toLowerCase() === 'sanjida';

  const storedKeys = getApiKeys();
  const storedAiSettings = getAiSettings();

  // 1. Determine Force Model Status & Routing
  const forceModel = options.forceModel !== undefined ? options.forceModel : storedAiSettings.forceModel;
  let targetModelId = '';
  let targetProvider = '';

  if (forceModel && (options.model || storedAiSettings.forcedModelId)) {
    targetModelId = options.model || storedAiSettings.forcedModelId;
    targetProvider = options.provider || storedAiSettings.forcedProvider || (targetModelId.includes('/') ? 'openrouter' : targetModelId.startsWith('gpt') ? 'openai' : 'gemini');
    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: `FORCE MODEL active. Forcing model "${targetModelId}" via provider "${targetProvider}".`,
    });
  } else {
    const freeOnly = options.freeOnly !== undefined ? options.freeOnly : storedAiSettings.freeOnly;
    const taskType = prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('bug')
      ? 'coding'
      : prompt.toLowerCase().includes('why') || prompt.toLowerCase().includes('analyze')
      ? 'reasoning'
      : /[\u0980-\u09FF]/.test(prompt)
      ? 'multilingual'
      : 'general';

    const routed = selectBestModelForTask(taskType, freeOnly);
    targetModelId = routed.modelId || storedAiSettings.selectedModel;
    targetProvider = routed.provider || storedAiSettings.provider;
  }

  // 2. Zero-Configuration Check
  const effectiveApiKey =
    options.apiKey ||
    storedKeys[targetProvider] ||
    (targetProvider === 'gemini' ? process.env.GEMINI_API_KEY : '');

  if (!targetProvider || !targetModelId || !effectiveApiKey) {
    const errorMsg = 'AI Provider is not configured or missing API key. Please open Settings → API & Provider Configuration.';
    logEvent({
      level: 'WARNING',
      category: 'API',
      component: 'ModelIntelligenceEngine',
      message: errorMsg,
      error_code: 'PROVIDER_UNCONFIGURED',
    });
    return {
      text: `Greetings ${username}, I am JARVIS.\n\n${errorMsg}`,
      provider: 'NOT_CONFIGURED',
      model: 'NONE',
    };
  }

  // 3. System Instruction Assembly
  const userMemories = getUserMemories(username);
  const memoryContext = userMemories.length > 0
    ? `\n\nUser Long-Term Memory (${username}):\n` + userMemories.map((m: any) => `- [${m.category}] ${m.key}: ${m.content}`).join('\n')
    : '';

  const defaultVoicePersona = isSanjida ? 'Female (warm, professional, efficient)' : 'Male (composed, executive, authoritative)';
  const customInstructions = options.naturalInstructions || storedAiSettings.naturalInstructions
    ? `\nUser Instructions: ${options.naturalInstructions || storedAiSettings.naturalInstructions}`
    : '';

  const systemInstruction = `You are J.A.R.V.I.S., Virtual CEO & Executive Assistant for ${username}.
Voice Persona: ${defaultVoicePersona}.
Language: Automatically detect Bangla (বাংলা) and English. Respond in the user's spoken language.
${memoryContext}${customInstructions}
Behavior: Professional, concise, accountable.`;

  // 4. Execution via Provider Adapters
  try {
    let replyText = '';

    if (targetProvider === 'openrouter') {
      replyText = await callOpenRouter(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
    } else if (targetProvider === 'openai') {
      replyText = await callOpenAi(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
    } else {
      replyText = await callGemini(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
    }

    const duration = Date.now() - startTime;
    logEvent({
      level: 'INFO',
      category: 'API',
      component: `${targetProvider.toUpperCase()}Provider`,
      message: `Generated response from ${targetModelId} via ${targetProvider} in ${duration}ms`,
      metadata: { latencyMs: duration, responseLength: replyText.length },
    });

    return {
      text: replyText,
      provider: targetProvider,
      model: targetModelId,
      tokens: Math.round(replyText.length / 4),
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    logEvent({
      level: 'ERROR',
      category: 'API',
      component: `${targetProvider.toUpperCase()}Provider`,
      message: `Failed execution on model ${targetModelId}: ${errorMsg}`,
      error_code: 'API_EXECUTION_FAILED',
      stack_trace: err?.stack,
    });
    throw err;
  }
}

async function callOpenRouter(
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jarvis.trisutro.bond',
      'X-Title': 'JARVIS Executive AI',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content || 'Understood, Sir.';
}

async function callOpenAi(
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content || 'Understood, Sir.';
}

async function callGemini(
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  history: ChatMessage[]
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  const contents: any[] = [];
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await client.models.generateContent({
    model: modelId.startsWith('gemini') ? modelId : 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text || 'Understood, Sir.';
}

export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const keys = getApiKeys();
  const key = keys.gemini || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Google Gemini API Key is not configured for Speech-to-Text.');

  const client = new GoogleGenAI({ apiKey: key });
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { inlineData: { mimeType: mimeType.split(';')[0], data: audioBase64 } },
      { text: 'Transcribe this audio faithfully. Detect Bangla or English. Output only the transcript text.' },
    ],
  });
  return (response.text || '').trim();
}

export async function synthesizeSpeechWithGemini(text: string, voiceName: string = 'Puck') {
  const keys = getApiKeys();
  const key = keys.gemini || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Google Gemini API Key is not configured for Speech-to-Text.');

  const client = new GoogleGenAI({ apiKey: key });
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
        return { audioBase64: part.inlineData.data, audioFormat: part.inlineData.mimeType };
      }
    }
  }
  return {};
}

export async function testAiProviderConnection(providerName: string, apiKey?: string) {
  const start = Date.now();
  const keys = getApiKeys();
  const key = apiKey || keys[providerName] || (providerName === 'gemini' ? process.env.GEMINI_API_KEY : '');

  if (!key) {
    return { success: false, latencyMs: 0, message: `API Key missing for provider "${providerName}".` };
  }

  try {
    if (providerName === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: 'Ping' }] }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    } else if (providerName === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    } else {
      const testAi = new GoogleGenAI({ apiKey: key });
      await testAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: 'Ping' }],
      });
    }

    const latency = Date.now() - start;
    return {
      success: true,
      latencyMs: latency,
      message: `Provider "${providerName}" connection verified (${latency}ms)`,
    };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - start, message: err.message };
  }
}
