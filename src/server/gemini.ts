import { GoogleGenAI } from '@google/genai';
import { logEvent } from './logger.ts';
import { selectBestModelForTask } from './model_registry.ts';
import { getDb } from './database.ts';
import { getUserMemories } from './memory.ts';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) aiClient = new GoogleGenAI({});
  return aiClient;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Intelligent JARVIS generation with active provider routing, free-only policy enforcement, and user memory injection
 */
export async function generateJarvisResponse(
  prompt: string,
  history: ChatMessage[] = [],
  options: {
    username?: string;
    language?: 'en' | 'bn';
    voiceMode?: boolean;
    provider?: string;
    apiKey?: string;
    freeOnly?: boolean;
    naturalInstructions?: string;
  } = {}
): Promise<{ text: string; provider: string; model: string; tokens?: number }> {
  const startTime = Date.now();
  const username = options.username || 'Sakib';
  const isSanjida = username.toLowerCase() === 'sanjida';

  // 1. Fetch user specific long-term memories
  const userMemories = getUserMemories(username);
  const memoryContext = userMemories.length > 0
    ? `\n\nUser Long-Term Memory & Preferences (${username}):\n` + userMemories.map((m: any) => `- [${m.category}] ${m.key}: ${m.content}`).join('\n')
    : '';

  // 2. Intelligent Model Routing
  const taskType = prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('bug') || prompt.toLowerCase().includes('function')
    ? 'coding'
    : prompt.toLowerCase().includes('why') || prompt.toLowerCase().includes('analyze') || prompt.toLowerCase().includes('design')
    ? 'reasoning'
    : /[\u0980-\u09FF]/.test(prompt)
    ? 'multilingual'
    : 'general';

  const freeOnly = options.freeOnly !== undefined ? options.freeOnly : true;
  const routing = selectBestModelForTask(taskType, freeOnly);

  logEvent({
    level: 'INFO',
    category: 'API',
    component: 'ModelIntelligenceEngine',
    message: `Routed user "${username}" task (${taskType}) to model "${routing.modelId}" via provider "${routing.provider}". Reason: ${routing.reason}`,
    metadata: { taskType, freeOnly, model: routing.modelId },
  });

  // 3. System Instruction based on user personality and instructions
  const defaultVoicePersona = isSanjida ? 'Female (warm, professional, efficient)' : 'Male (composed, executive, authoritative)';
  const customInstructions = options.naturalInstructions ? `\nUser Custom Instructions: ${options.naturalInstructions}` : '';

  const systemInstruction = `You are J.A.R.V.I.S., the Virtual CEO and personal executive AI partner for ${username}.
Persona & Voice: Assistant voice persona is configured as ${defaultVoicePersona}.
Language: Automatically detect Bangla (বাংলা) and English. Respond fluently in the language spoken by the user.
${memoryContext}${customInstructions}
Behavior: Act as an accountable executive partner. Help with business operations (TRISUTRO clothing e-commerce, WhatsApp cart recovery), software development, and task execution.`;

  const apiKeyToUse = options.apiKey || process.env.GEMINI_API_KEY;

  // Fallback if no API key
  if (!apiKeyToUse && routing.provider === 'gemini') {
    logEvent({
      level: 'WARNING',
      category: 'API',
      component: 'GeminiProvider',
      message: 'GEMINI_API_KEY not configured. Returning autonomous local fallback response.',
      error_code: 'API_KEY_MISSING',
    });

    const isBangla = options.language === 'bn' || /[\u0980-\u09FF]/.test(prompt);
    const text = isBangla
      ? `নমস্কার ${username}, আমি জারভিস। আপনার নির্দেশ: "${prompt}" গৃহীত হয়েছে। এপিআই কি কনফিগার করার জন্য সেটিংস মেনু ব্যবহার করুন।`
      : `Greetings ${username}, I am JARVIS. Received instruction: "${prompt}". Please configure your API key in Settings to activate full generative model intelligence.`;

    return { text, provider: 'JARVIS_AUTONOMOUS_LOCAL', model: routing.modelId };
  }

  try {
    const client = apiKeyToUse ? new GoogleGenAI({ apiKey: apiKeyToUse }) : getGeminiClient();
    if (!client) {
      throw new Error('No active AI client or API key available.');
    }

    const contents: any[] = [];
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await client.models.generateContent({
      model: routing.modelId.includes('gemini') ? routing.modelId : 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'Understood, Sir/Madam.';
    const duration = Date.now() - startTime;

    logEvent({
      level: 'INFO',
      category: 'API',
      component: 'GeminiProvider',
      message: `Generated response from ${routing.modelId} in ${duration}ms`,
      metadata: { responseLength: replyText.length, latencyMs: duration },
    });

    return {
      text: replyText,
      provider: routing.provider,
      model: routing.modelId,
      tokens: replyText.length / 4,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    logEvent({
      level: 'ERROR',
      category: 'API',
      component: 'GeminiProvider',
      message: `AI generation failure on model ${routing.modelId}: ${errorMsg}`,
      error_code: errorMsg.includes('429') ? 'RATE_LIMIT' : 'API_CALL_FAILED',
      stack_trace: err?.stack,
    });
    throw err;
  }
}

export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY is not configured.');

  const response = await client.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: [
      { inlineData: { mimeType: mimeType.split(';')[0], data: audioBase64 } },
      { text: 'Transcribe this audio faithfully. Detect Bangla or English. Output only the transcript text.' },
    ],
  });
  return (response.text || '').trim();
}

export async function synthesizeSpeechWithGemini(text: string, voiceName: string = 'Puck') {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY is not configured.');

  const response = await client.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
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
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key && providerName.toLowerCase() === 'gemini') {
    return { success: false, latencyMs: 0, message: 'API Key missing.', models: [] };
  }

  try {
    const testAi = new GoogleGenAI({ apiKey: key });
    await testAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: 'Ping' }],
    });
    const latency = Date.now() - start;
    return {
      success: true,
      latencyMs: latency,
      message: `Connection successful (${latency}ms)`,
      models: ['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.5-transcribe'],
    };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - start, message: err.message, models: [] };
  }
}
