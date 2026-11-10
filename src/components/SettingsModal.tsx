import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Cpu,
  Mic,
  Send,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Volume2,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'voice' | 'telegram'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General Settings State
  const [general, setGeneral] = useState({
    appName: 'JARVIS Virtual CEO',
    language: 'en',
    defaultMode: 'voice',
    theme: 'dark',
    autoReadAloud: true,
  });

  // AI Provider State
  const [aiConfig, setAiConfig] = useState({
    defaultProvider: 'gemini',
    geminiApiKey: '',
    selectedModel: 'gemini-3.8-flash',
    groqApiKey: '',
    openRouterApiKey: '',
    ollamaUrl: 'http://localhost:11434',
  });
  const [aiTestResult, setAiTestResult] = useState<{ success?: boolean; message?: string; latency?: number } | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // Voice Settings State
  const [voiceConfig, setVoiceConfig] = useState({
    voiceInputEnabled: true,
    voiceOutputEnabled: true,
    continuousMode: true,
    pushToTalk: false,
    speechSpeed: 1.0,
    speechVolume: 1.0,
    language: 'en-US',
    preferredVoice: 'default',
  });
  const [playingTestAudio, setPlayingTestAudio] = useState(false);

  // Telegram Settings State
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: '',
    botUsername: '',
    allowedUserIds: '',
    enabled: true,
    pollingMode: true,
  });
  const [telegramTestResult, setTelegramTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Fetch current settings on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.general) setGeneral(data.general);
          if (data.ai) setAiConfig((prev) => ({ ...prev, ...data.ai }));
          if (data.voice) setVoiceConfig((prev) => ({ ...prev, ...data.voice }));
          if (data.telegram) {
            setTelegramConfig({
              ...data.telegram,
              allowedUserIds: Array.isArray(data.telegram.allowedUserIds)
                ? data.telegram.allowedUserIds.join(', ')
                : data.telegram.allowedUserIds || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  // Test AI Connection
  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.defaultProvider,
          apiKey: aiConfig.geminiApiKey || undefined,
        }),
      });
      const data = await res.json();
      setAiTestResult({
        success: data.success,
        message: data.message,
        latency: data.latencyMs,
      });
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingAi(false);
    }
  };

  // Test Telegram Connection
  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: telegramConfig.botToken }),
      });
      const data = await res.json();
      setTelegramTestResult({
        success: data.success,
        message: data.message,
      });
      if (data.bot?.username) {
        setTelegramConfig((prev) => ({ ...prev, botUsername: data.bot.username }));
      }
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.message || 'Telegram test failed',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  // Test Voice Synthesis
  const handleTestVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPlayingTestAudio(true);
      const isBangla = voiceConfig.language.startsWith('bn');
      const sampleText = isBangla
        ? 'হ্যালো স্যার, আমি জারভিস। আপনার ভয়েস সিস্টেম এখন সক্রিয় ও কার্যকর।'
        : 'Hello Sir. I am JARVIS. Voice communication and speech synthesis are operating at optimal parameters.';

      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = voiceConfig.language;
      utterance.rate = voiceConfig.speechSpeed;
      utterance.volume = voiceConfig.speechVolume;

      utterance.onend = () => setPlayingTestAudio(false);
      utterance.onerror = () => setPlayingTestAudio(false);

      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech Synthesis is not supported in this browser.');
    }
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'general', values: general }),
      });

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'ai', values: aiConfig }),
      });

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'voice', values: voiceConfig }),
      });

      const allowedArray = telegramConfig.allowedUserIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'telegram',
          values: {
            ...telegramConfig,
            allowedUserIds: allowedArray,
          },
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      if (onSettingsSaved) onSettingsSaved();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Centralized JARVIS Settings</h2>
              <p className="text-xs text-slate-400">Manage Voice, AI Models, Telegram Bot, and Local Runtime Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> General
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> AI Providers & APIs
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'voice'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" /> Voice Settings
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'telegram'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" /> Telegram Bot Integration
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : (
            <>
              {/* 1. GENERAL TAB */}
              {activeTab === 'general' && (
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Application Name</label>
                    <input
                      type="text"
                      value={general.appName}
                      onChange={(e) => setGeneral({ ...general, appName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Language</label>
                      <select
                        value={general.language}
                        onChange={(e) => setGeneral({ ...general, language: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="en">English (US / UK)</option>
                        <option value="bn">Bangla / বাংলা</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Default Interface Mode</label>
                      <select
                        value={general.defaultMode}
                        onChange={(e) => setGeneral({ ...general, defaultMode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="voice">Voice Interaction HUD</option>
                        <option value="text">Classic Text Terminal</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={general.autoReadAloud}
                        onChange={(e) => setGeneral({ ...general, autoReadAloud: e.target.checked })}
                        className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-sm text-slate-200">
                        Auto Read Aloud (Speak AI responses automatically)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* 2. AI PROVIDER TAB */}
              {activeTab === 'ai' && (
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Active AI Provider</label>
                    <select
                      value={aiConfig.defaultProvider}
                      onChange={(e) => setAiConfig({ ...aiConfig, defaultProvider: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="gemini">Google Gemini (Official GenAI SDK) — Recommended</option>
                      <option value="groq">Groq Cloud (Llama 3.3 70B Fast Tier)</option>
                      <option value="openrouter">OpenRouter (Multi-model Fallback)</option>
                      <option value="ollama">Ollama (Local Offline Runtime)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gemini API Key
                      <span className="text-slate-500 font-normal ml-2">(Stored safely in backend environment)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy... (leave blank to use server environment default)"
                      value={aiConfig.geminiApiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Model Selection</label>
                    <select
                      value={aiConfig.selectedModel}
                      onChange={(e) => setAiConfig({ ...aiConfig, selectedModel: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="gemini-3.8-flash">gemini-3.8-flash (Fast, Low Latency, Multimodal)</option>
                      <option value="gemini-4-argon">gemini-4-argon (Advanced Reasoning & Coding)</option>
                      <option value="gemini-3.5-transcribe">gemini-3.5-transcribe (High-Precision Audio STT)</option>
                      <option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts (Natural Speech Output)</option>
                    </select>
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestAi}
                      disabled={testingAi}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900/60 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test API Connection & Latency
                    </button>

                    {aiTestResult && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        aiTestResult.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}>
                        {aiTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-semibold">{aiTestResult.success ? 'Connection Operational' : 'Connection Error'}</div>
                          <div className="text-slate-300 mt-0.5">{aiTestResult.message}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. VOICE SETTINGS TAB */}
              {activeTab === 'voice' && (
                <div className="space-y-5 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voiceConfig.voiceInputEnabled}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, voiceInputEnabled: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Voice Input (Microphone)</div>
                        <div className="text-[11px] text-slate-400">Speech-to-Text via Web Speech & Gemini</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voiceConfig.voiceOutputEnabled}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, voiceOutputEnabled: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Voice Output (Speaker)</div>
                        <div className="text-[11px] text-slate-400">Natural AI-generated voice speech</div>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Speech Recognition Language</label>
                      <select
                        value={voiceConfig.language}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, language: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="en-IN">English (India / International)</option>
                        <option value="bn-BD">Bangla / বাংলা (বাংলাদেশ)</option>
                        <option value="bn-IN">Bangla / বাংলা (ভারত)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Speech Speed: {voiceConfig.speechSpeed}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={voiceConfig.speechSpeed}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, speechSpeed: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500 mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voiceConfig.continuousMode}
                        onChange={(e) => setVoiceConfig({ ...voiceConfig, continuousMode: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-4 h-4"
                      />
                      <span className="text-xs text-slate-200">
                        Continuous Conversation Mode (Listen again automatically after speaking)
                      </span>
                    </label>
                  </div>

                  {/* Test Voice Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestVoice}
                      disabled={playingTestAudio}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900/60 flex items-center gap-2 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {playingTestAudio ? 'Speaking Voice Sample...' : 'Test Voice Synthesis'}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. TELEGRAM BOT INTEGRATION TAB */}
              {activeTab === 'telegram' && (
                <div className="space-y-5 max-w-2xl">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-200">How to set up your Telegram Bot:</div>
                      <div>1. Open Telegram and search for <code className="text-cyan-400 font-mono">@BotFather</code>.</div>
                      <div>2. Send <code className="text-cyan-400 font-mono">/newbot</code> and name your bot (e.g. <i>MyJarvisBot</i>).</div>
                      <div>3. Copy the HTTP API token provided by BotFather and paste it below.</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Telegram Bot Token</label>
                    <input
                      type="password"
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                      value={telegramConfig.botToken}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Authorized User IDs (Comma-separated)
                      <span className="text-slate-500 font-normal ml-2">(Only these Telegram users can command JARVIS)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 518294821, 98127391"
                      value={telegramConfig.allowedUserIds}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, allowedUserIds: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.enabled}
                        onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-4 h-4"
                      />
                      <span className="text-xs text-slate-200">Enable Telegram Bot Service</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramConfig.pollingMode}
                        onChange={(e) => setTelegramConfig({ ...telegramConfig, pollingMode: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 w-4 h-4"
                      />
                      <span className="text-xs text-slate-200">Long Polling Daemon (Works on Windows without open ports)</span>
                    </label>
                  </div>

                  {/* Test Telegram Connection Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestTelegram}
                      disabled={testingTelegram}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900/60 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test Telegram Connection
                    </button>

                    {telegramTestResult && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        telegramTestResult.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}>
                        {telegramTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-semibold">{telegramTestResult.success ? 'Bot Connection Verified' : 'Connection Failed'}</div>
                          <div className="text-slate-300 mt-0.5">{telegramTestResult.message}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {saveSuccess && <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Settings Saved Successfully</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save All Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
