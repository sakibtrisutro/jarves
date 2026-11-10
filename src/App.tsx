import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Volume2, Sparkles, Activity, Settings as SettingsIcon, LogOut, ShieldCheck, Zap } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { VoiceController } from './components/VoiceController.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

interface UserSession {
  username: string;
  role: string;
  voicePersonality: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<any>({
    isConfigured: false,
    provider: 'NOT CONFIGURED',
    activeModel: 'NONE',
    bootstrap: { status: 'NOT INITIALIZED' },
  });

  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [autoReadAloud, setAutoReadAloud] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchModelStatus = async () => {
    try {
      const res = await fetch('/api/models/status');
      if (res.ok) {
        setModelStatus(await res.json());
      }
    } catch {}
  };

  useEffect(() => {
    fetchModelStatus();
  }, []);

  // Set welcome message when user logs in
  useEffect(() => {
    if (currentUser) {
      setMessages([
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: `Welcome back, ${currentUser.username}. J.A.R.V.I.S. is initialized with your personal assistant context and voice personality (${currentUser.voicePersonality}).\n\nHow may I assist you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: modelStatus.isConfigured ? modelStatus.provider : 'NOT CONFIGURED',
          model: modelStatus.isConfigured ? modelStatus.activeModel : 'NONE',
        },
      ]);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setSystemHealth(await res.json());
      } catch {}
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const speakText = (text: string, messageId?: string) => {
    if (isSpeakerMuted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (messageId) setActiveSpeakingId(messageId);

    const cleanSpeech = text.replace(/[*_#`~[\]]/g, '').replace(/\n+/g, '. ').trim();
    const isBangla = /[\u0980-\u09FF]/.test(cleanSpeech) || language === 'bn';
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = isBangla ? 'bn-BD' : 'en-US';
    utterance.rate = currentUser?.voicePersonality === 'Female' ? 1.05 : 0.95;

    utterance.onend = () => setActiveSpeakingId(null);
    utterance.onerror = () => setActiveSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isProcessing || !currentUser) return;

    setInputPrompt('');
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          username: currentUser.username,
          language,
          voiceMode: true,
          freeOnly: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const asstId = `asst_${Date.now()}`;
      const assistantMessage: Message = {
        id: asstId,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider || 'JARVIS',
        model: data.model || 'NONE',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (autoReadAloud && !isSpeakerMuted) {
        speakText(data.text, asstId);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Communication exception: ${err.message}. Please check Settings -> API Keys & Providers.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-950/95 border-b border-cyan-500/20 px-6 py-3.5 backdrop-blur-md sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest font-mono text-slate-100 flex items-center gap-2">
              J.A.R.V.I.S.
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                User: {currentUser.username} ({currentUser.voicePersonality})
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">TRISUTRO Virtual CEO & Persistent Personal Assistant OS</p>
          </div>
        </div>

        {/* Runtime Status Indicators */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className={`px-2.5 py-1 rounded-lg border font-bold ${
            modelStatus.isConfigured
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              : 'bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse'
          }`}>
            AI PROVIDER: {modelStatus.isConfigured ? modelStatus.provider.toUpperCase() : 'NOT CONFIGURED'}
          </span>

          <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            MODEL: <strong className="text-cyan-400">{modelStatus.activeModel}</strong>
          </span>

          {modelStatus.forceModel && (
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-500 px-2 py-1 rounded font-bold">
              FORCE MODE
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-semibold flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-cyan-400" /> Diagnostics
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-2"
            title="Settings & Model Control Center"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentUser(null)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs font-semibold"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Stream */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-5">
        {!modelStatus.isConfigured && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex items-center justify-between">
            <div>
              <strong>AI Provider is Not Configured.</strong> Please open Settings → API Keys & Providers to enter your Gemini, OpenAI, or OpenRouter API key.
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
            >
              Configure API Keys
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = activeSpeakingId === msg.id;

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in`}>
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                <span>{isUser ? currentUser.username : 'J.A.R.V.I.S.'}</span>
                <span className="font-mono text-slate-600">{msg.timestamp}</span>
                {msg.model && <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.2 rounded">{msg.model}</span>}
              </div>

              <div className={`max-w-3xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-lg ${
                isUser ? 'bg-cyan-600/90 text-slate-950 font-medium rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <button
                      onClick={() => speakText(msg.content, msg.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                        isSpeaking ? 'bg-indigo-950 border-indigo-500 text-indigo-300 font-semibold' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-indigo-400' : ''}`} />
                      {isSpeaking ? 'Speaking...' : 'Read Aloud'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-start gap-2.5 animate-pulse">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-cyan-300 font-mono">
              JARVIS Model Intelligence routing request...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer controls */}
      <footer className="bg-slate-950/95 border-t border-slate-800 px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full space-y-3">
        <VoiceController
          onTranscriptSubmitted={(t) => handleSendMessage(t)}
          isProcessingResponse={isProcessing}
          activeLanguage={language}
          onLanguageChange={(l) => setLanguage(l as 'en' | 'bn')}
          voicePersonality={currentUser.voicePersonality}
        />

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message JARVIS (${currentUser.username}'s Assistant)...`}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isProcessing}
            className="p-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-40 shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          fetchModelStatus();
        }}
        currentUser={currentUser.username}
        onSettingsSaved={() => fetchModelStatus()}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        systemHealth={systemHealth}
      />

    </div>
  );
}
