import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Settings as SettingsIcon,
  Bot,
  Send,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Server,
  Zap,
  Globe,
  Terminal,
  ShieldAlert,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { VoiceController } from './components/VoiceController.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Good morning, Sir. J.A.R.V.I.S. is fully online and initialized.\n\nAll primary subsystems are operational:\n• Tri-Layer Hybrid Memory: SQLite WAL Active\n• Voice Intelligence: Bidirectional Speech-to-Text & Natural Voice Synthesis (Bangla & English)\n• Remote Interface: Telegram Bot Gateway Operational\n• Multi-Agent Ecosystem: 10 Specialist Agents Ready\n\nHow may I assist you today, Sir?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [autoReadAloud, setAutoReadAloud] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Poll system health status
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Text-To-Speech Synthesis function (Web Speech API)
  const speakText = (text: string, messageId?: string) => {
    if (isSpeakerMuted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (messageId) setActiveSpeakingId(messageId);

    // Clean text of markdown formatting for clean audio
    const cleanSpeech = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    const isBangla = /[\u0980-\u09FF]/.test(cleanSpeech) || language === 'bn';
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = isBangla ? 'bn-BD' : 'en-US';
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => setActiveSpeakingId(null);
    utterance.onerror = () => setActiveSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Submit Prompt to JARVIS backend
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isProcessing) return;

    setInputPrompt('');
    const userMsgId = `user_${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
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
          language,
          voiceMode: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsgId = `asst_${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider || 'Google Gemini',
        model: data.model || 'gemini-3.8-flash',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto Read Aloud if enabled
      if (autoReadAloud && !isSpeakerMuted) {
        speakText(data.text, assistantMsgId);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sir, I encountered a communication exception: ${err.message}. Please check the Live Diagnostics Center for root-cause analysis.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      fetchHealth();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. MASTER HEADER & EXECUTIVE STATUS BAR */}
      <header className="bg-slate-950/95 border-b border-cyan-500/20 px-4 sm:px-6 py-3.5 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Animated Arc Reactor Core */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-md shadow-cyan-950/50">
            <div className="absolute inset-1 rounded-lg border border-cyan-400/30 animate-pulse" />
            <Bot className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-widest text-slate-100 flex items-center gap-1.5 font-mono">
                J.A.R.V.I.S.
                <span className="text-[10px] tracking-normal font-sans font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  v2.0 Executive
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              TRISUTRO Virtual CEO & Autonomous Executive AI Operating Partner
            </p>
          </div>
        </div>

        {/* Quick Diagnostics Badges & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Diagnostic Button with Live Ping */}
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 text-xs font-semibold flex items-center gap-2 shadow-sm shadow-cyan-950 transition-all"
          >
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="hidden md:inline">Live Diagnostics</span>
            {systemHealth?.subsystems?.total_diagnostic_events > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500 text-slate-950 font-bold">
                {systemHealth.subsystems.total_diagnostic_events}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100 text-xs font-semibold flex items-center gap-2 transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR: QUICK STATUS INDICATORS */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Database: <strong className="text-slate-300 font-mono">SQLite (WAL)</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            AI Provider: <strong className="text-slate-300">Gemini 3.8 Flash</strong>
          </span>
          <span className="flex items-center gap-1.5 hidden md:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Telegram Gateway: <strong className="text-slate-300">Long Polling Active</strong>
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Specialist Agents: <strong className="text-slate-300 font-mono">10 Registered</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-500 font-mono">Target: Windows PC Runtime</span>
        </div>
      </div>

      {/* 3. MAIN CONVERSATIONAL STREAM */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = activeSpeakingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  {isUser ? 'TRISUTRO (Owner)' : 'J.A.R.V.I.S. (Virtual CEO)'}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">{msg.timestamp}</span>
                {msg.provider && (
                  <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-800/40">
                    {msg.provider}
                  </span>
                )}
              </div>

              <div
                className={`max-w-3xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-cyan-600/90 text-slate-950 font-medium rounded-tr-none shadow-cyan-950/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none shadow-slate-950/60'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Assistant Message Action Bar */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <button
                      onClick={() => speakText(msg.content, msg.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                        isSpeaking
                          ? 'bg-indigo-950 border-indigo-500/60 text-indigo-300 font-semibold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Read Aloud / Voice-Over"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-indigo-400' : ''}`} />
                      {isSpeaking ? 'Speaking...' : 'Read Aloud'}
                    </button>

                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
              JARVIS is reasoning and formulating response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 4. BOTTOM INTERACTIVE BAR (VOICE CONTROLLER + TEXT INPUT) */}
      <footer className="bg-slate-950/95 border-t border-slate-800 px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full space-y-3">
        
        {/* Full Voice Interaction HUD */}
        <VoiceController
          onTranscriptSubmitted={(transcript) => handleSendMessage(transcript)}
          isProcessingResponse={isProcessing}
          activeLanguage={language}
          onLanguageChange={(lang) => setLanguage(lang as 'en' | 'bn')}
          autoSpeakResponse={autoReadAloud}
        />

        {/* Text Input Row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={
              language === 'bn'
                ? 'টাইপ করুন অথবা উপরের মাইক্রোফোনে কথা বলুন...'
                : 'Type instructions or click microphone above to speak...'
            }
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isProcessing}
            className="p-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-950"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* 5. MODALS */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        systemHealth={systemHealth}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => fetchHealth()}
      />

    </div>
  );
}
