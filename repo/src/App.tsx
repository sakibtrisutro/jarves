import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Volume2, VolumeX, Loader2, Sparkles, Activity, 
  Settings as SettingsIcon, LogOut, ShieldCheck, Zap, AlertTriangle, 
  Terminal, Cpu, Play, LayoutDashboard, MessageSquare, ListTodo, 
  BrainCircuit, Database, History, Bell, Menu, X, Search, Plus, 
  ChevronRight, Calendar, Globe, Power, Trash2, CheckCircle2, User, Lock, ExternalLink
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { VoiceController } from './components/VoiceController.tsx';

// View Components
import { DashboardView } from './components/DashboardView.tsx';
import { TaskCenterView } from './components/TaskCenterView.tsx';
import { AgentsView } from './components/AgentsView.tsx';
import { MemoryView } from './components/MemoryView.tsx';
import { ConversationsView } from './components/ConversationsView.tsx';

/**
 * Types & Interfaces
 */
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
  token: string;
}

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: any;
  priority: any;
  schedule_type: any;
  scheduled_at: string | null;
  created_at: string;
}

interface Memory {
  id: string;
  category: string;
  key: string;
  content: string;
  created_at: string;
}

type View = 'dashboard' | 'assistant' | 'conversations' | 'tasks' | 'agents' | 'memory' | 'notifications';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<View>('assistant');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Assistant State
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  // Unified State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [episodicMemories, setEpisodicMemories] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<any>({ intelligence: { status: 'NOT_INITIALIZED' }, settings: { freeOnly: true } });

  // Audio State
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [playbackStateMap, setPlaybackStateMap] = useState<Record<string, any>>({});
  const activeSessionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /**
   * API Helper with HttpOnly Cookie & Bearer Auth
   */
  const apiFetch = async (path: string, options: any = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(currentUser?.token ? { 'Authorization': `Bearer ${currentUser.token}` } : {}),
      ...options.headers
    };
    const res = await fetch(path, { credentials: 'same-origin', ...options, headers });
    if (res.status === 401) {
      setCurrentUser(null);
      return res;
    }
    return res;
  };

  const loadAllData = async () => {
    if (!currentUser) return;
    try {
      const [h, s, c, t, m, e, a] = await Promise.all([
        apiFetch('/api/health').then(r => r.json()),
        apiFetch('/api/models/status').then(r => r.json()),
        apiFetch('/api/conversations').then(r => r.json()),
        apiFetch('/api/tasks').then(r => r.json()),
        apiFetch('/api/memory').then(r => r.json()),
        apiFetch('/api/memory/episodic?limit=10').then(r => r.json()),
        apiFetch('/api/agents').then(r => r.json())
      ]);
      setSystemHealth(h);
      setModelStatus(s);
      setConversations(c.conversations || []);
      setTasks(t.tasks || []);
      setMemories(m.memories || []);
      setEpisodicMemories(e.memories || []);
      setAgents(a.agents || []);
    } catch {}
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData();
      const interval = setInterval(loadAllData, 20000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && messages.length === 0) {
      setMessages([{
        id: 'msg_welcome',
        role: 'assistant',
        content: `Greetings ${currentUser.username}. J.A.R.V.I.S. is online. Protocols for autonomous orchestration and executive assistance are initialized. How may I serve your objectives?`,
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
    activeSessionRef.current = { sessionId, messageId: msgId };
    setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'PREPARING' }));

    const clean = text.replace(/[*_#`~[\]]/g, '').replace(/\n+/g, '. ').trim();
    const isBn = /[\u0980-\u09FF]/.test(clean) || language === 'bn';

    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = isBn ? 'bn-BD' : 'en-US';
      u.rate = currentUser?.voicePersonality === 'Female' ? 1.05 : 0.95;
      u.onstart = () => setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'SPEAKING' }));
      u.onend = () => setPlaybackStateMap(prev => ({ ...prev, [msgId]: 'IDLE' }));
      window.speechSynthesis.speak(u);
    }
  };

  const handleSend = async (text?: string) => {
    const prompt = (text || inputPrompt).trim();
    if (!prompt || isProcessing || !currentUser) return;
    
    setInputPrompt('');
    const userMsg: Message = { 
      id: `u_${Date.now()}`, 
      role: 'user', 
      content: prompt, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setActiveView('assistant');

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: prompt, 
          conversationId: activeConversationId,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), 
          language, 
          freeOnly: modelStatus.settings.freeOnly 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat error');

      const asstMsg: Message = { 
        id: `a_${Date.now()}`, 
        role: 'assistant', 
        content: data.text, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        provider: data.provider, 
        model: data.model, 
        fallbackCount: data.fallbackCount 
      };
      setMessages(prev => [...prev, asstMsg]);
      if (data.conversationId) setActiveConversationId(data.conversationId);
      loadAllData(); // Refresh tasks/memory if any created
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        id: `e_${Date.now()}`, 
        role: 'assistant', 
        content: `Operational Error: ${err.message}. Please verify core protocols.`, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } finally { setIsProcessing(false); }
  };

  const selectConversation = async (id: string) => {
    setMessages([]);
    setIsProcessing(true);
    setActiveView('assistant');
    setActiveConversationId(id);
    try {
      const res = await apiFetch(`/api/conversations/${id}/messages`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: m.metadata_json ? JSON.parse(m.metadata_json).model : undefined
        })));
      }
    } catch {}
    finally { setIsProcessing(false); }
  };

  const newConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setActiveView('assistant');
  };

  const createTask = async (taskData: any) => {
    try {
      await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(taskData) });
      loadAllData();
    } catch {}
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      loadAllData();
    } catch {}
  };

  const deleteMemory = async (id: string) => {
    try {
      await apiFetch(`/api/memory/${id}`, { method: 'DELETE' });
      loadAllData();
    } catch {}
  };

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  };

  if (!currentUser) return <AuthScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Sidebar Restoration */}
      <aside className={`bg-slate-900 border-r border-white/5 flex flex-col transition-all duration-300 z-50 shadow-[20px_0_50px_rgba(0,0,0,0.5)] ${isSidebarOpen ? 'w-72' : 'w-0 -translate-x-full lg:w-20'}`}>
        <div className={`p-6 flex items-center border-b border-white/5 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Bot className="w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <div>
                <div className="text-lg font-black tracking-tighter">JARVIS</div>
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Autonomous OS</div>
              </div>
            )}
          </div>
          {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500"><X className="w-5 h-5" /></button>}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'assistant', icon: BrainCircuit, label: 'Assistant' },
            { id: 'conversations', icon: MessageSquare, label: 'Archives' },
            { id: 'tasks', icon: ListTodo, label: 'Task Center' },
            { id: 'agents', icon: Zap, label: 'Agents & Skills' },
            { id: 'memory', icon: Database, label: 'Memory' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group relative ${activeView === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}
            >
              <item.icon className={`w-4 h-4 shrink-0 transition-transform ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              {isSidebarOpen && <span>{item.label}</span>}
              {activeView === item.id && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="bg-slate-950/50 rounded-[2rem] p-4 border border-white/5">
            <div className={`flex items-center gap-3 ${isSidebarOpen ? 'mb-3' : 'mb-0 justify-center'}`}>
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-black truncate">{currentUser.username}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{currentUser.role}</div>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button onClick={handleLogout} className="w-full py-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2">
                <LogOut className="w-3.5 h-3.5" /> TERMINATE SESSION
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Operational Header */}
        <header className="h-20 bg-slate-950/50 border-b border-white/5 px-8 flex items-center justify-between backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all mr-2 shadow-lg">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 uppercase">
                {activeView === 'assistant' ? 'Executive Assistant' : activeView}
                {activeView === 'assistant' && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">Live Sync</span>}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 px-6 py-2 bg-slate-900/50 rounded-2xl border border-white/5 shadow-inner">
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Intelligence</div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${modelStatus.intelligence.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                  <span className={`text-[11px] font-black ${modelStatus.intelligence.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>{modelStatus.intelligence.status}</span>
                </div>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Network</div>
                <div className="text-[11px] font-black text-slate-300 uppercase">{systemHealth?.subsystems.database === 'HEALTHY' ? 'SECURE-WAL' : 'RESTRICTED'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-3 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all shadow-lg relative">
                 <Bell className="w-5 h-5" />
                 <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-slate-900" />
              </button>
              <button onClick={() => setIsDiagnosticsOpen(true)} className="p-3 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-cyan-400 transition-all shadow-lg">
                <Terminal className="w-5 h-5" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all shadow-lg">
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* View Switcher */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'assistant' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-8 pb-40">
                  {modelStatus.intelligence.status !== 'ACTIVE' && (
                    <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/20 flex items-start gap-6 animate-in fade-in slide-in-from-top-4 duration-700 shadow-2xl">
                      <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-500 shadow-inner"><AlertTriangle className="w-7 h-7" /></div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-amber-400 uppercase tracking-tight">Intelligence Protocols Dormant</h3>
                        <p className="text-sm text-slate-400 font-medium max-w-md">Autonomous model discovery and task-routing kernels are currently uninitialized. System responsiveness may be degraded.</p>
                        <button onClick={() => setIsSettingsOpen(true)} className="mt-4 px-6 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-[10px] hover:bg-amber-400 transition-all uppercase tracking-widest shadow-xl shadow-amber-900/20">Activate Neural Core</button>
                      </div>
                    </div>
                  )}

                  {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    const state = playbackStateMap[m.id] || 'IDLE';
                    return (
                      <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-in fade-in duration-500`}>
                        <div className={`flex items-center gap-3 mb-3 px-3 text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] font-black`}>
                          <span>{isUser ? currentUser.username : 'JARVIS CORE'}</span>
                          {m.model && <span className="text-cyan-500/60 flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {m.model}</span>}
                          {m.fallbackCount && m.fallbackCount > 0 && <span className="text-amber-500 flex items-center gap-1.5"><Zap className="w-3 h-3" /> FALLBACK ×{m.fallbackCount}</span>}
                        </div>
                        <div className={`max-w-[88%] rounded-[2.5rem] p-8 text-[15px] leading-relaxed shadow-[0_20px_60px_rgba(0,0,0,0.4)] border transition-all duration-500 ${isUser ? 'bg-indigo-600 text-white border-indigo-500/50 rounded-tr-none' : 'bg-slate-900 border-white/5 text-slate-200 rounded-tl-none group-hover:border-cyan-500/20'}`}>
                          <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                          {!isUser && (
                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                              <button onClick={() => toggleSpeech(m.id, m.content)} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${state === 'SPEAKING' ? 'bg-indigo-500 text-white animate-pulse shadow-lg shadow-indigo-500/30' : state === 'PREPARING' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-950 text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}>
                                {state === 'PREPARING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state === 'SPEAKING' ? <Volume2 className="w-3.5 h-3.5" /> : state === 'STOPPED' ? <VolumeX className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                {state === 'IDLE' ? 'Synthesize Audio' : state}
                              </button>
                              <div className="text-[10px] font-mono text-slate-600 font-bold">{m.timestamp}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Console Restoration */}
              <div className="p-10 bg-slate-950/90 border-t border-white/5 backdrop-blur-3xl absolute bottom-0 left-0 right-0 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-4xl mx-auto space-y-8">
                  <VoiceController 
                    onTranscriptSubmitted={handleSend} 
                    isProcessingResponse={isProcessing} 
                    activeLanguage={language} 
                    onLanguageChange={(l) => setLanguage(l as 'en' | 'bn')} 
                    voicePersonality={currentUser.voicePersonality} 
                    onListeningStarted={() => stopPlayback()} 
                  />
                  <div className="flex items-center gap-5">
                    <div className="flex-1 relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
                      <input 
                        type="text" 
                        placeholder={`Provide strategic directive for JARVIS...`} 
                        value={inputPrompt} 
                        onChange={e => setInputPrompt(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()} 
                        className="relative w-full bg-slate-900 border border-white/10 rounded-[1.8rem] px-8 py-5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium shadow-2xl" 
                      />
                    </div>
                    <button 
                      onClick={() => handleSend()} 
                      disabled={!inputPrompt.trim() || isProcessing} 
                      className="p-6 rounded-[1.8rem] bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 disabled:opacity-20 transition-all shadow-[0_10px_40px_rgba(6,182,212,0.4)] active:scale-95 flex items-center justify-center"
                    >
                      {isProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <DashboardView systemHealth={systemHealth} modelStatus={modelStatus} onNavigate={setActiveView} episodicMemories={episodicMemories} />
          )}

          {activeView === 'tasks' && (
            <TaskCenterView tasks={tasks} onUpdateTask={updateTask} onCreateTask={createTask} />
          )}

          {activeView === 'agents' && (
            <AgentsView agents={agents} />
          )}

          {activeView === 'memory' && (
            <MemoryView memories={memories} onDelete={deleteMemory} />
          )}

          {activeView === 'conversations' && (
            <ConversationsView conversations={conversations} onSelect={selectConversation} onDelete={() => {}} onNew={newConversation} />
          )}

          {activeView === 'notifications' && (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shadow-2xl">
                <Bell className="w-10 h-10 opacity-30" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Notification Center</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">All executive alerts and agent event logs will appear here. No unread notifications in current session.</p>
              </div>
              <button onClick={() => setActiveView('dashboard')} className="px-8 py-4 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-200 transition-all">Back to HQ</button>
            </div>
          )}
        </main>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); loadAllData(); }} currentUser={currentUser.username} onSettingsSaved={loadAllData} />
        <DiagnosticsModal isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} systemHealth={systemHealth} />
      </div>
    </div>
  );
}
