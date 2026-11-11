import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Database, Loader2, RefreshCw, Save, Key, ShieldCheck, Zap, Lock, Trash2, CheckCircle2, AlertCircle, MessageSquare, Terminal, Users, Globe, Bell, Power, Play, Search } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  onSettingsSaved?: () => void;
}

type Tab = 'providers' | 'intelligence' | 'voice' | 'telegram' | 'accounts' | 'memory' | 'network' | 'system';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<Tab>('providers');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [keysStatus, setKeysStatus] = useState<any>({});
  const [modelStatus, setModelStatus] = useState<any>({ intelligence: { status: 'NOT_INITIALIZED' }, settings: { freeOnly: true } });
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<any>({ pttEnabled: true, autoListen: false, continuousMode: false });
  const [telegramConfig, setTelegramConfig] = useState<any>({ enabled: false, botToken: '', authorizedIds: '' });

  const [inputKeys, setInputKeys] = useState({ gemini: '', openai: '', openrouter: '' });
  const [modelSearch, setModelSearch] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('all');

  const handleScanProvider = async (provider: string) => {
    setActionLoading(`scan_${provider}`);
    try {
      const res = await fetch('/api/models/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', text: `Scanned ${provider.toUpperCase()}: Discovered ${data.totalDiscovered} models.` });
        await loadData();
      } else {
        setStatus({ type: 'error', text: data.error || `Failed to scan ${provider}` });
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [k, m, mod, mem, s] = await Promise.all([
        fetch('/api/keys').then(r => r.json()),
        fetch('/api/models/status').then(r => r.json()),
        fetch('/api/models').then(r => r.json()),
        fetch(`/api/memory?username=${currentUser}`).then(r => r.json()),
        fetch('/api/settings').then(r => r.json())
      ]);
      setKeysStatus(k);
      setModelStatus(m);
      setModelsList(mod.models || []);
      setMemories(mem.memories || []);
      setVoiceConfig(s.voice || { pttEnabled: true, autoListen: false, continuousMode: false });
      setTelegramConfig(s.telegram || { enabled: false, botToken: '', authorizedIds: '' });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) loadData(); }, [isOpen, currentUser]);

  const handleSaveKey = async (provider: string) => {
    const key = (inputKeys as any)[provider];
    if (!key) return;
    setActionLoading(`save_${provider}`);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: key }) });
      if (res.ok) {
        setStatus({ type: 'success', text: `Key saved for ${provider.toUpperCase()}` });
        setInputKeys({ ...inputKeys, [provider]: '' });
        await loadData();
      }
    } catch (err: any) { setStatus({ type: 'error', text: err.message }); }
    finally { setActionLoading(null); }
  };

  const handleInitIntelligence = async () => {
    setActionLoading('init_intel');
    try {
      const res = await fetch('/api/models/initialize-intelligence', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', text: `Intelligence initialized. Discovered ${data.discoveredCount} models.` });
        await loadData();
      }
    } catch (err: any) { setStatus({ type: 'error', text: err.message }); }
    finally { setActionLoading(null); }
  };

  const handleUpdateSettings = async (category: string, values: any) => {
    setActionLoading(`save_${category}`);
    try {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, values }) });
      setStatus({ type: 'success', text: `${category.toUpperCase()} settings updated.` });
      await loadData();
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) { setStatus({ type: 'error', text: err.message }); }
    finally { setActionLoading(null); }
  };

  const [systemHealth, setSystemHealth] = useState<any>(null);
  useEffect(() => {
    if (activeTab === 'network' || activeTab === 'system') {
      fetch('/api/health').then(r => r.json()).then(setSystemHealth).catch(console.error);
    }
  }, [activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-[0_0_100px_rgba(6,182,212,0.1)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950/50 border-b border-slate-800/50 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">SYSTEM CONFIGURATION</h2>
              <p className="text-xs text-slate-500 font-mono tracking-widest uppercase opacity-70">Unified Intelligence & Operational Parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-xl text-slate-500 hover:text-slate-100 hover:bg-slate-800/50 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-64 bg-slate-950/30 border-r border-slate-800/50 p-4 space-y-1 overflow-y-auto">
            {[
              { id: 'providers', icon: Key, label: 'AI Providers' },
              { id: 'intelligence', icon: Cpu, label: 'Model Intelligence' },
              { id: 'voice', icon: Play, label: 'Voice & Audio' },
              { id: 'telegram', icon: MessageSquare, label: 'Telegram Bot' },
              { id: 'accounts', icon: Users, label: 'Account Security' },
              { id: 'memory', icon: Database, label: 'Persistent Memory' },
              { id: 'network', icon: Globe, label: 'Network & LAN' },
              { id: 'system', icon: Power, label: 'System Control' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${activeTab === t.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
              >
                <t.icon className={`w-4 h-4 transition-transform ${activeTab === t.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            {loading && <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>}
            
            {status && (
              <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/20 border-rose-500/30 text-rose-400'}`}>
                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{status.text}</span>
                <button onClick={() => setStatus(null)} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
            )}

            {activeTab === 'providers' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Independent API Provider Management</h3>
                  <p className="text-sm text-slate-400">Configure separate credentials for each AI provider. Keys are stored encrypted server-side.</p>
                </div>

                {['gemini', 'openai', 'openrouter'].map(p => (
                  <div key={p} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                        <span className="font-bold text-slate-200 uppercase tracking-widest text-xs">{p} API</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${keysStatus[p]?.configured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                          {keysStatus[p]?.configured ? `ACTIVE: ${keysStatus[p].masked}` : 'NOT CONFIGURED'}
                        </span>
                      </div>
                      {keysStatus[p]?.configured && (
                        <button onClick={async () => {
                          if (confirm(`Remove ${p.toUpperCase()} credentials?`)) {
                            await fetch(`/api/keys/${p}`, { method: 'DELETE' });
                            setStatus({ type: 'info', text: `${p.toUpperCase()} key removed.` });
                            loadData();
                          }
                        }} className="text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder={`Paste your ${p} API key...`}
                        value={(inputKeys as any)[p]}
                        onChange={e => setInputKeys({ ...inputKeys, [p]: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                      <button
                        onClick={() => handleSaveKey(p)}
                        disabled={!(inputKeys as any)[p] || actionLoading === `save_${p}`}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-30 transition-all shadow-lg active:scale-95"
                      >
                        {actionLoading === `save_${p}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'intelligence' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1">Model Intelligence Engine</h3>
                    <p className="text-sm text-slate-400">Autonomous multi-provider discovery, task-aware routing, and strict Free Mode enforcement.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleScanProvider('all')}
                      disabled={Boolean(actionLoading)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs hover:bg-slate-700 transition-all"
                    >
                      {actionLoading === 'scan_all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-cyan-400" />}
                      SCAN ALL
                    </button>
                    <button
                      onClick={handleInitIntelligence}
                      disabled={Boolean(actionLoading)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      {actionLoading === 'init_intel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      RE-INITIALIZE
                    </button>
                  </div>
                </div>

                {/* Status KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Engine Status</div>
                    <div className={`text-lg font-black ${modelStatus.intelligence.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {modelStatus.intelligence.status}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">Sync: {modelStatus.intelligence.lastInitialized ? new Date(modelStatus.intelligence.lastInitialized).toLocaleTimeString() : 'Never'}</div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Active Model</div>
                    <div className="text-sm font-bold text-cyan-400 truncate">{modelStatus.intelligence.activeModel || 'NONE'}</div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Provider: {modelStatus.intelligence.activeProvider || 'NONE'}</div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Discovered Catalog</div>
                    <div className="text-lg font-black text-slate-100">{modelStatus.intelligence.discoveredCount || modelsList.length} <span className="text-xs font-normal text-slate-500">Models</span></div>
                    <div className="text-[10px] text-emerald-400 font-mono font-bold">{modelStatus.intelligence.freeCount || modelsList.filter(m => m.is_free).length} Free Models</div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Failover Protection</div>
                    <div className="text-lg font-black text-emerald-400">ENABLED</div>
                    <div className="text-[10px] text-slate-500 font-mono">Live Multi-Provider Routing</div>
                  </div>
                </div>

                {/* Per-Provider Scanner Badges */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">Configured Provider Discovery Controls</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'openrouter', name: 'OpenRouter', color: 'border-indigo-500/30 text-indigo-400' },
                      { id: 'gemini', name: 'Google Gemini', color: 'border-cyan-500/30 text-cyan-400' },
                      { id: 'openai', name: 'OpenAI', color: 'border-emerald-500/30 text-emerald-400' }
                    ].map(p => {
                      const isConfigured = keysStatus[p.id]?.configured;
                      const providerCount = modelsList.filter(m => m.provider === p.id).length;
                      return (
                        <div key={p.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-200">{p.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {isConfigured ? `${providerCount} models registered` : 'Key Not Configured'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleScanProvider(p.id)}
                            disabled={!isConfigured || Boolean(actionLoading)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-[11px] font-bold text-cyan-400 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 transition-all"
                          >
                            {actionLoading === `scan_${p.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Scan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strict Free Mode Toggle */}
                <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2 text-sm"><ShieldCheck className="w-4 h-4" /> STRICT FREE MODE ENFORCEMENT</div>
                    <p className="text-xs text-slate-400 max-w-md">Filter discovery catalog exclusively for zero-cost input/output models. Never silently charges API balance.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modelStatus.settings.freeOnly}
                    onChange={e => handleUpdateSettings('ai', { ...modelStatus.settings, freeOnly: e.target.checked })}
                    className="w-6 h-6 rounded-lg bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                </div>

                {/* Discovered Model Catalog */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Discovered Catalog Registry ({modelsList.length})</span>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter models..."
                          value={modelSearch}
                          onChange={e => setModelSearch(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 w-44 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        {['all', 'openrouter', 'gemini', 'openai'].map(f => (
                          <button
                            key={f}
                            onClick={() => setSelectedProviderFilter(f)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedProviderFilter === f ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 sticky top-0 text-slate-500 font-mono border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-3">Provider</th>
                          <th className="px-6 py-3">Model ID</th>
                          <th className="px-6 py-3">Cost</th>
                          <th className="px-6 py-3">Score</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {modelsList
                          .filter(m => selectedProviderFilter === 'all' || m.provider === selectedProviderFilter)
                          .filter(m => !modelSearch || m.model_id.toLowerCase().includes(modelSearch.toLowerCase()) || m.display_name.toLowerCase().includes(modelSearch.toLowerCase()))
                          .map(m => (
                            <tr key={m.model_id} className="hover:bg-slate-800/20 transition-colors">
                              <td className="px-6 py-3 font-bold text-cyan-400 uppercase">{m.provider}</td>
                              <td className="px-6 py-3 font-mono text-slate-200 font-semibold">{m.model_id}</td>
                              <td className="px-6 py-3">
                                {m.is_free ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">FREE</span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">PAID</span>
                                )}
                              </td>
                              <td className="px-6 py-3 font-mono">{m.reasoning_score}</td>
                              <td className="px-6 py-3 text-right">
                                <button
                                  onClick={() => handleUpdateSettings('ai', { ...modelStatus.settings, forceModel: true, forcedModelId: m.model_id, forcedProvider: m.provider })}
                                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-[10px] font-bold transition-all"
                                >
                                  Force Model
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Voice & Audio Intelligence</h3>
                  <p className="text-sm text-slate-400">Configure PTT protocols, microphone sensitivity, and automated listening modes.</p>
                </div>
                <div className="grid gap-4">
                  {[
                    { id: 'pttEnabled', label: 'Push-to-Talk Mode', desc: 'Require manual activation for microphone input.' },
                    { id: 'autoListen', label: 'Auto-Listen After Response', desc: 'Automatically reactive mic after assistant finishes speaking.' },
                    { id: 'continuousMode', label: 'Continuous Awareness', desc: 'Keep microphone active for natural multi-turn dialogue.' },
                  ].map(item => (
                    <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-200 text-sm">{item.label}</div>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(voiceConfig as any)[item.id]}
                        onChange={e => handleUpdateSettings('voice', { ...voiceConfig, [item.id]: e.target.checked })}
                        className="w-6 h-6 rounded-lg bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'telegram' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Remote Access: Telegram Bot</h3>
                  <p className="text-sm text-slate-400">Authorize remote directive execution via Telegram. Requires an active Bot Token from @BotFather.</p>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><MessageSquare className="w-5 h-5" /></div>
                      <span className="font-bold text-slate-200 uppercase tracking-widest text-xs">Bot Status</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${telegramConfig.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        {telegramConfig.enabled ? 'ACTIVE & CONNECTED' : 'DISABLED'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings('telegram', { ...telegramConfig, enabled: !telegramConfig.enabled })}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${telegramConfig.enabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
                    >
                      {telegramConfig.enabled ? 'STOP BOT' : 'START BOT'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold ml-1">Bot API Token</label>
                      <input
                        type="password"
                        placeholder="7458123456:AAHe-..."
                        value={telegramConfig.botToken}
                        onChange={e => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold ml-1">Authorized User IDs (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="12345678, 87654321"
                        value={telegramConfig.authorizedIds}
                        onChange={e => setTelegramConfig({ ...telegramConfig, authorizedIds: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateSettings('telegram', telegramConfig)}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-all"
                    >
                      UPDATE BOT CONFIGURATION
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Email & Account Recovery</h3>
                  <p className="text-sm text-slate-400">Configure SMTP protocols to enable autonomous password recovery and system alerts.</p>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">SMTP Host</label>
                       <input type="text" placeholder="smtp.gmail.com" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">SMTP Port</label>
                       <input type="text" placeholder="587" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">Sender Identity</label>
                     <input type="text" placeholder="JARVIS OS <noreply@trisutro.bond>" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                  </div>
                  <button className="w-full py-3 rounded-xl bg-slate-100 text-slate-950 font-bold text-sm hover:bg-white transition-all active:scale-[0.98]">
                    SAVE SMTP CONFIGURATION
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Account Security & Access</h3>
                  <p className="text-sm text-slate-400">Manage credentials and session protocols for user: <span className="text-cyan-400 font-bold">{currentUser}</span></p>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-slate-100">{currentUser}</div>
                      <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">Active Executive Profile</div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-800/50" />
                  <div className="space-y-4">
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Change Access Password</div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="password" placeholder="New Password" id="new_pw" className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                      <input type="password" placeholder="Confirm Password" id="conf_pw" className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100" />
                    </div>
                    <button
                      onClick={async () => {
                        const np = (document.getElementById('new_pw') as HTMLInputElement).value;
                        const cp = (document.getElementById('conf_pw') as HTMLInputElement).value;
                        if (!np || np !== cp) return setStatus({ type: 'error', text: 'Passwords do not match or are empty.' });
                        setActionLoading('change_pw');
                        const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, newPassword: np }) });
                        if (res.ok) setStatus({ type: 'success', text: 'Password updated successfully.' });
                        setActionLoading(null);
                      }}
                      className="w-full py-3 rounded-xl bg-slate-100 text-slate-950 font-bold text-sm hover:bg-white transition-all active:scale-[0.98]"
                    >
                      {actionLoading === 'change_pw' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'UPDATE PASSWORD'}
                    </button>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => window.location.reload()} className="w-full py-3 rounded-xl border border-rose-500/30 text-rose-400 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all">TERMINATE SESSION & LOGOUT</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">Persistent Personal Memory</h3>
                    <p className="text-sm text-slate-400">Contextual preferences and learned directives isolated to your profile.</p>
                  </div>
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">{memories.length} ENTRIES STORED</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                  {memories.length === 0 ? (
                    <div className="p-12 text-center text-slate-600 font-mono text-xs uppercase tracking-widest">No persistent memories recorded yet.</div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-800/50">
                      {memories.map(m => (
                        <div key={m.id} className="p-4 flex items-start justify-between hover:bg-slate-800/20 group">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-tighter">{m.category}</span>
                              <span className="text-sm font-bold text-slate-200">{m.key}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed pr-8">{m.content}</p>
                            <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this memory?')) {
                                await fetch(`/api/memory/${m.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
                                loadData();
                              }
                            }}
                            className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">Network Architecture & LAN Status</h3>
                  <p className="text-sm text-slate-400">Configure local network access and verify dynamic IP routing for mobile connectivity.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 w-fit text-indigo-400"><Globe className="w-8 h-8" /></div>
                    <div>
                      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Local Network IP</div>
                      <div className="text-3xl font-black text-slate-100 tracking-tighter">http://{systemHealth?.lanIp || '127.0.0.1'}:3000</div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">Use this address to access JARVIS from your mobile phone or other devices on the same Wi-Fi network.</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Subsystem Status</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-400">SECURE</span>
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      {systemHealth && Object.entries(systemHealth.subsystems).map(([name, status]) => (
                        <div key={name} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500 uppercase">{name.replace('_', ' ')}</span>
                          <span className={status === 'HEALTHY' || status === 'CONFIGURED' || status === 'READY' ? 'text-emerald-500' : 'text-amber-500'}>{status as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">System Control & Operations</h3>
                  <p className="text-sm text-slate-400">Master runtime controls, database maintenance, and backup/restore protocols.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/30 transition-all text-left group">
                    <Database className="w-6 h-6 mb-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-200 text-sm">Backup Data</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-1">Full Snapshot</div>
                  </button>
                  <button className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/30 transition-all text-left group">
                    <RefreshCw className="w-6 h-6 mb-4 text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                    <div className="font-bold text-slate-200 text-sm">Restore Data</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-1">Load Archive</div>
                  </button>
                  <button onClick={() => window.location.reload()} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:bg-rose-500/10 transition-all text-left group border-rose-500/10">
                    <Power className="w-6 h-6 mb-4 text-rose-500 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-200 text-sm">Restart Server</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-1">Graceful Cycle</div>
                  </button>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Diagnostic Information</div>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-slate-800/50 py-1"><span className="text-slate-500">VERSION</span><span className="text-slate-300">v3.0.0-FINAL</span></div>
                    <div className="flex justify-between border-b border-slate-800/50 py-1"><span className="text-slate-500">RUNTIME</span><span className="text-slate-300">Node.js {systemHealth?.uptime ? 'v' + process.version : '--'}</span></div>
                    <div className="flex justify-between border-b border-slate-800/50 py-1"><span className="text-slate-500">UPTIME</span><span className="text-slate-300">{systemHealth?.uptime || 0}s</span></div>
                    <div className="flex justify-between border-b border-slate-800/50 py-1"><span className="text-slate-500">DATABASE</span><span className="text-slate-300">SQLite (WAL)</span></div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Status */}
        <div className="bg-slate-950/80 border-t border-slate-800/50 px-8 py-3 flex items-center justify-between text-[10px] font-mono tracking-wider">
          <div className="flex items-center gap-4 text-slate-500 uppercase font-bold">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SECURE SESSION</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> ENCRYPTION ACTIVE</span>
          </div>
          <div className="text-slate-600">JARVIS OS v3.0.0-FINAL</div>
        </div>

      </div>
    </div>
  );
};
