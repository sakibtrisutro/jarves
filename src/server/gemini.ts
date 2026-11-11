import { GoogleGenAI } from '@google/genai';
import { logEvent } from './logger.ts';
import { getModelPipeline, updateModelStats, fetchOpenRouterModels, fetchGeminiModels, fetchOpenAiModels } from './model_registry.ts';
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
 * Retrieves current AI settings (provider, forced model, free mode, fallback policy)
 */
export function getAiSettings() {
  const db = getDb();
  const defaults = {
    provider: '',
    selectedModel: '',
    freeOnly: true,
    forceModel: false,
    forcedModelId: '',
    forcedProvider: '',
    naturalInstructions: 'Always prioritize free models.',
    fallbackEnabled: true,
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
 * Enforces Force Model Mode, Strict Free Policy, and Automatic Fallback Pipeline.
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
): Promise<{ text: string; provider: string; model: string; tokens?: number; fallbackCount?: number }> {
  const startTime = Date.now();
  const username = options.username || 'Sakib';
  const isSanjida = username.toLowerCase() === 'sanjida';

  const storedKeys = getApiKeys();
  const storedAiSettings = getAiSettings();

  const freeOnly = options.freeOnly !== undefined ? options.freeOnly : storedAiSettings.freeOnly;
  const forceModel = options.forceModel !== undefined ? options.forceModel : storedAiSettings.forceModel;

  // 1. Build Model Pipeline
  let pipeline: any[] = [];

  if (forceModel && (options.model || storedAiSettings.forcedModelId)) {
    const forcedId = options.model || storedAiSettings.forcedModelId;
    const forcedProv = options.provider || storedAiSettings.forcedProvider;
    pipeline = [{ model_id: forcedId, provider: forcedProv || (forcedId.includes('/') ? 'openrouter' : forcedId.startsWith('gpt') ? 'openai' : 'gemini') }];
  } else {
    const taskType = prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('bug')
      ? 'coding'
      : prompt.toLowerCase().includes('why') || prompt.toLowerCase().includes('analyze')
      ? 'reasoning'
      : /[\u0980-\u09FF]/.test(prompt)
      ? 'multilingual'
      : 'general';

    pipeline = getModelPipeline(taskType, freeOnly);
  }

  if (pipeline.length === 0) {
    // Emergency auto-discovery attempt if registry table is empty
    if (storedKeys.openrouter) await fetchOpenRouterModels(storedKeys.openrouter);
    if (storedKeys.gemini || process.env.GEMINI_API_KEY) await fetchGeminiModels(storedKeys.gemini || (process.env.GEMINI_API_KEY as string));
    if (storedKeys.openai) await fetchOpenAiModels(storedKeys.openai);

    pipeline = getModelPipeline('general', freeOnly);
  }

  if (pipeline.length === 0) {
    const errorMsg = 'No eligible AI models found. Please configure your API keys and initialize Model Intelligence.';
    logEvent({ level: 'WARNING', category: 'API', component: 'ModelIntelligenceEngine', message: errorMsg });
    return { text: `Greetings ${username}, I am JARVIS.\n\n${errorMsg}`, provider: 'NOT_CONFIGURED', model: 'NONE' };
  }

  // 2. Assemble System Instruction
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
Behavior: Professional, concise, accountable. Be executive-ready.`;

  // 3. Execution with Fallback Loop
  let fallbackCount = 0;
  let lastError = '';

  for (const modelCandidate of pipeline) {
    const targetModelId = modelCandidate.model_id;
    const targetProvider = modelCandidate.provider;
    const effectiveApiKey = storedKeys[targetProvider] || (targetProvider === 'gemini' ? process.env.GEMINI_API_KEY : '');

    if (!effectiveApiKey) {
      logEvent({ level: 'DEBUG', category: 'API', component: 'ModelIntelligenceEngine', message: `Skipping ${targetModelId}: API key missing for ${targetProvider}` });
      continue;
    }

    try {
      const execStart = Date.now();
      let replyText = '';

      if (targetProvider === 'openrouter') {
        replyText = await callOpenRouter(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
      } else if (targetProvider === 'openai') {
        replyText = await callOpenAi(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
      } else {
        replyText = await callGemini(targetModelId, effectiveApiKey, systemInstruction, prompt, history);
      }

      const duration = Date.now() - execStart;
      updateModelStats(targetModelId, true, duration);

      logEvent({
        level: 'INFO',
        category: 'API',
        component: `${targetProvider.toUpperCase()}Provider`,
        message: `Generated response from ${targetModelId} via ${targetProvider} in ${duration}ms`,
        metadata: { latencyMs: duration, fallbackCount },
      });

      return {
        text: replyText,
        provider: targetProvider,
        model: targetModelId,
        tokens: Math.round(replyText.length / 4),
        fallbackCount,
      };
    } catch (err: any) {
      fallbackCount++;
      lastError = err.message || String(err);
      updateModelStats(targetModelId, false, 0);
      
      logEvent({
        level: 'WARNING',
        category: 'API',
        component: 'ModelIntelligenceEngine',
        message: `Model ${targetModelId} failed: ${lastError}. Attempting fallback...`,
        error_code: 'MODEL_EXECUTION_FAILURE',
      });

      if (forceModel) break; // Don't fallback if model is forced
    }
  }

  return {
    text: `System Alert: All eligible models in the pipeline failed to respond.\n\nLast Error: ${lastError}`,
    provider: 'SYSTEM_FAILURE',
    model: 'NONE',
    fallbackCount,
  };
}

async function callOpenRouter(modelId: string, apiKey: string, systemInstruction: string, prompt: string, history: ChatMessage[]): Promise<string> {
  const messages = [{ role: 'system', content: systemInstruction }, ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: prompt }];
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://jarvis.trisutro.bond', 'X-Title': 'JARVIS Executive AI' },
    body: JSON.stringify({ model: modelId, messages, temperature: 0.7 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAi(modelId: string, apiKey: string, systemInstruction: string, prompt: string, history: ChatMessage[]): Promise<string> {
  const messages = [{ role: 'system', content: systemInstruction }, ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: prompt }];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId, messages, temperature: 0.7 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(modelId: string, apiKey: string, systemInstruction: string, prompt: string, history: ChatMessage[]): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  const contents: any[] = [];
  for (const msg of history.slice(-6)) {
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });
  const response = await client.models.generateContent({
    model: modelId.startsWith('gemini') ? modelId : 'gemini-2.0-flash',
    contents,
    config: { systemInstruction, temperature: 0.7 },
  });
  return response.text || '';
}

export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const keys = getApiKeys();
  const key = keys.gemini || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API Key missing for STT.');
  const client = new GoogleGenAI({ apiKey: key });
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ inlineData: { mimeType: mimeType.split(';')[0], data: audioBase64 } }, { text: 'Transcribe audio. Bangla or English.' }],
  });
  return (response.text || '').trim();
}

export async function synthesizeSpeechWithGemini(text: string, voiceName: string = 'Puck') {
  const keys = getApiKeys();
  const key = keys.gemini || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API Key missing for TTS.');
  const client = new GoogleGenAI({ apiKey: key });
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-lite-preview-02-05',
    contents: [{ text }],
    config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
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
  const key = apiKey || getApiKeys()[providerName] || (providerName === 'gemini' ? process.env.GEMINI_API_KEY : '');
  if (!key) return { success: false, latencyMs: 0, message: 'API Key missing.' };

  try {
    if (providerName === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else if (providerName === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      const testAi = new GoogleGenAI({ apiKey: key });
      await testAi.models.generateContent({ model: 'gemini-2.0-flash', contents: [{ text: 'Ping' }] });
    }
    const latency = Date.now() - start;
    return { success: true, latencyMs: latency, message: `Verified (${latency}ms)` };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - start, message: err.message };
  }
}
