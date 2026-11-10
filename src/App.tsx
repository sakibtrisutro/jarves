import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Volume2, VolumeX, Loader2, Sparkles, Activity, Settings as SettingsIcon, LogOut, ShieldCheck, Zap, AlertTriangle, Terminal, Cpu, Play } from 'lucide-react';
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
  fallbackCount?: number;
}

interface UserSession {
  username: string;
  role: string;
  voicePersonality: string;
}

interface PlaybackSession {
  sessionId: string;
  messageId: string;
  abortController?: AbortController;
  audioElement?: HTMLAudioElement;
  status: 'IDLE' | 'PREPARING' | 'SPEAKING' | 'STOPPED' | 'ERROR';
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
  const [modelStatus, setModelStatus] = useState<any>({ intelligence: { status: 'NOT_INITIALIZED' }, settings: { freeOnly: true } });

  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const activeSessionRef = useRef<PlaybackSession | null>(null);
  const [playbackStateMap, setPlaybackStateMap] = useState<Record<string, any>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchStatus = async () => {
    try {
      const [h, s] = await Promise.all([
        fetch('/api/health').then(r => r.json()),
        fetch('/api/models/status').then(r => r.json())
      ]);
      setSystemHealth(h);
      setModelStatus(s);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setMessages([{
        id: 'msg_welcome',
        role: 'assistant',
        content: `Greetings ${currentUser.username}. J.A.R.V.I.S. is online. Multi-agent orchestration and personal assistant protocols are initialized. How may I assist your business or technical objectives today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'SYSTEM',
        model: 'LOCAL'
      }]);
    }
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const stopPlayback = (msgId?: string) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (activeSessionRef.current) {
      activeSessionRef.current.abortController?.abort();
      if (activeSessionRef.current.audioElement) {
        activeSessionRef.current.audioElement.pause();
        activeSessionRef.current.audioElement.src = '';
      }
      const id = msgId || activeSessionRef.current.messageId;
      setPlaybackStateMap(prev => ({ ...prev, [id]: 'STOPPED' }));
    }
    activeSessionRef.current = null;
  };

  const toggleSpeech = async (msgId: string, text: string) => {
    if (isSpeakerMuted) return;
    if (playbackStateMap[msgId] === 'SPEAKING' || playbackStateMap[msgId] === 'PREPARING') {
      stopPlayback(msgId);
      return;
    }

    stopPlayback();
    const sessionId = `s_${Date.now()}`;
    const abort = new AbortController();
    activeSessionRef.current = { sessionId, messageId: msgId, abortController: abort, status: 'PREPARING' };
    setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'PREPARING' }));

    const clean = text.replace(/[*_#`~[\]]/g, '').replace(/\n+/g, '. ').trim();
    const isBn = /[\u0980-\u09FF]/.test(clean) || language === 'bn';

    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = isBn ? 'bn-BD' : 'en-US';
      u.rate = currentUser?.voicePersonality === 'Female' ? 1.05 : 0.95;
      u.onstart = () => { if (activeSessionRef.current?.sessionId === sessionId) setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'SPEAKING' })); };
      u.onend = () => { if (activeSessionRef.current?.sessionId === sessionId) setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'IDLE' })); };
      window.speechSynthesis.speak(u);
    }
  };

  const handleSend = async (text?: string) => {
    const prompt = (text || inputPrompt).trim();
    if (!prompt || isProcessing || !currentUser) return;
    setInputPrompt('');
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: prompt, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), username: currentUser.username, language, freeOnly: modelStatus.settings.freeOnly })
      });
      const data = await res.json();
      const asstMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', content: data.text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), provider: data.provider, model: data.model, fallbackCount: data.fallbackCount };
      setMessages(prev => [...prev, asstMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', content: `Error: ${err.message}. Verify engine status in Settings.`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally { setIsProcessing(false); }
  };

  if (!currentUser) return <AuthScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      
      {/* Dynamic Dashboard Header */}
      <header className="bg-slate-950/80 border-b border-white/5 px-8 py-4 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
              <div className="relative w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter flex items-center gap-3">
                J.A.R.V.I.S.
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">EXEC-OS v3.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase opacity-70">Strategic Assistant & Autonomous Agent Host</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Intelligence Status</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${modelStatus.intelligence.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                <span className={`text-xs font-bold ${modelStatus.intelligence.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>{modelStatus.intelligence.status}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Primary Network</div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Activity className="w-3 h-3 text-indigo-400" /> 
                {systemHealth?.subsystems.database === 'HEALTHY' ? 'LOCAL-WAL SECURE' : 'DATABASE ERROR'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsDiagnosticsOpen(true)} className="px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-xs font-bold flex items-center gap-2">
              <Terminal className="w-4 h-4" /> DIAGNOSTICS
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentUser(null)} className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {modelStatus.intelligence.status !== 'ACTIVE' && (
            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500"><AlertTriangle className="w-6 h-6" /></div>
              <div className="space-y-1">
                <h3 className="font-bold text-amber-400">Intelligence Engine Not Initialized</h3>
                <p className="text-sm text-slate-400">Automatic model discovery and ranking protocols are currently dormant. Performance may be degraded or restricted.</p>
                <button onClick={() => setIsSettingsOpen(true)} className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-all">INITIALIZE NOW</button>
              </div>
            </div>
          )}

          {messages.map(m => {
            const isUser = m.role === 'user';
            const state = playbackStateMap[m.id] || 'IDLE';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-in fade-in`}>
                <div className="flex items-center gap-3 mb-2 px-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                  <span>{isUser ? currentUser.username : 'JARVIS'}</span>
                  {m.model && <span className="text-cyan-500/60 flex items-center gap-1"><Cpu className="w-3 h-3" /> {m.model}</span>}
                  {m.fallbackCount && m.fallbackCount > 0 && <span className="text-amber-500 flex items-center gap-1"><Zap className="w-3 h-3" /> FALLBACK ×{m.fallbackCount}</span>}
                </div>
                <div className={`max-w-[85%] rounded-3xl p-6 text-sm leading-relaxed shadow-2xl transition-all ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none group-hover:border-cyan-500/20'}`}>
                  <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                  {!isUser && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <button onClick={() => toggleSpeech(m.id, m.content)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state === 'SPEAKING' ? 'bg-indigo-500 text-white animate-pulse' : state === 'PREPARING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-950 text-slate-500 hover:text-slate-200'}`}>
                        {state === 'PREPARING' ? <Loader2 className="w-3 h-3 animate-spin" /> : state === 'SPEAKING' ? <Volume2 className="w-3 h-3" /> : state === 'STOPPED' ? <VolumeX className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {state === 'IDLE' ? 'Read Aloud' : state}
                      </button>
                      <div className="text-[10px] font-mono text-slate-600">{m.timestamp}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Control Console */}
      <footer className="bg-slate-950/80 border-t border-white/5 p-6 backdrop-blur-3xl z-40">
        <div className="max-w-4xl mx-auto space-y-6">
          <VoiceController onTranscriptSubmitted={handleSend} isProcessingResponse={isProcessing} activeLanguage={language} onLanguageChange={(l) => setLanguage(l as 'en' | 'bn')} voicePersonality={currentUser.voicePersonality} onListeningStarted={() => stopPlayback()} />
          <div className="flex items-center gap-3">
            <input type="text" placeholder={`Executive Directive for JARVIS...`} value={inputPrompt} onChange={e => setInputPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium" />
            <button onClick={() => handleSend()} disabled={!inputPrompt.trim() || isProcessing} className="p-4 rounded-2xl bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 disabled:opacity-20 transition-all shadow-xl shadow-cyan-500/20 active:scale-95"><Send className="w-6 h-6" /></button>
          </div>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); fetchStatus(); }} currentUser={currentUser.username} onSettingsSaved={fetchStatus} />
      <DiagnosticsModal isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} systemHealth={systemHealth} />
    </div>
  );
}
