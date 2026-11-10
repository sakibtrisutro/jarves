import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Database, Loader2, RefreshCw, Save, Key, ShieldCheck, Zap, Lock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'control_center' | 'memory'>('providers');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Key Status
  const [keysStatus, setKeysStatus] = useState<any>({
    gemini: { configured: false, masked: '' },
    openai: { configured: false, masked: '' },
    openrouter: { configured: false, masked: '' },
  });

  // Inputs for keys
  const [inputGeminiKey, setInputGeminiKey] = useState('');
  const [inputOpenAiKey, setInputOpenAiKey] = useState('');
  const [inputOpenRouterKey, setInputOpenRouterKey] = useState('');

  // AI & Model Control Status
  const [modelStatus, setModelStatus] = useState<any>({
    isConfigured: false,
    provider: 'NOT CONFIGURED',
    activeModel: 'NONE',
    forceModel: false,
    forcedModelId: '',
    bootstrap: { status: 'NOT INITIALIZED' },
  });

  const [aiConfig, setAiConfig] = useState({
    freeOnly: true,
    forceModel: false,
    forcedModelId: '',
    naturalInstructions: 'Always prioritize free models. Prefer models that understand Bangla accurately.',
  });

  const [modelsList, setModelsList] = useState<any[]>([]);

  // Memory State
  const [memories, setMemories] = useState<any[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemContent, setNewMemContent] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Keys Status
      const kRes = await fetch('/api/keys');
      if (kRes.ok) setKeysStatus(await kRes.json());

      // 2. Models & Control Center Status
      const sRes = await fetch('/api/models/status');
      if (sRes.ok) {
        const sData = await sRes.json();
        setModelStatus(sData);
        setAiConfig((prev) => ({
          ...prev,
          forceModel: sData.forceModel,
          forcedModelId: sData.forcedModelId,
        }));
      }

      // 3. Models List
      const mRes = await fetch('/api/models');
      if (mRes.ok) {
        const mData = await mRes.json();
        setModelsList(mData.models || []);
      }

      // 4. Memory List
      const memRes = await fetch(`/api/memory?username=${currentUser}`);
      if (memRes.ok) {
        const memData = await memRes.json();
        setMemories(memData.memories || []);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadAllData();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Save Key handler
  const handleSaveKey = async (provider: string, apiKey: string) => {
    if (!apiKey.trim()) return;
    setActionLoading(`save_${provider}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `API key for "${provider.toUpperCase()}" saved successfully.` });
        if (provider === 'gemini') setInputGeminiKey('');
        if (provider === 'openai') setInputOpenAiKey('');
        if (provider === 'openrouter') setInputOpenRouterKey('');
        await loadAllData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save key');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Verify Key handler
  const handleVerifyKey = async (provider: string, apiKey?: string) => {
    setActionLoading(`verify_${provider}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Connection verified for ${provider.toUpperCase()}: ${data.message}` });
      } else {
        setStatusMessage({ type: 'error', text: `Verification failed for ${provider.toUpperCase()}: ${data.message}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Key handler
  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`Delete saved API key for ${provider.toUpperCase()}?`)) return;
    setActionLoading(`delete_${provider}`);
    try {
      await fetch(`/api/keys/${provider}`, { method: 'DELETE' });
      setStatusMessage({ type: 'info', text: `API key for ${provider.toUpperCase()} deleted.` });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Discover Models handler
  const handleDiscoverModels = async () => {
    setActionLoading('discover');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/models/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'all' }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Discovered and synchronized ${data.totalDiscovered} models!` });
        await loadAllData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Free Model Bootstrap handler
  const handleBootstrap = async () => {
    setActionLoading('bootstrap');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/models/bootstrap', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `INSTANT FREE BOOTSTRAP ACTIVE! Model: ${data.bootstrap.model} (${data.bootstrap.provider}) verified and running.`,
        });
        await loadAllData();
      } else {
        throw new Error(data.message || 'Bootstrap failed');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Initialize Intelligence handler
  const handleInitializeIntelligence = async () => {
    setActionLoading('intelligence');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/models/initialize-intelligence', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: data.message });
        await loadAllData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Force Model Toggle handler
  const handleToggleForceModel = async (modelId: string, provider: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/models/force-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceModel: enabled, modelId, provider }),
      });
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: enabled ? `FORCE MODEL MODE ENABLED for model "${modelId}". Override active.` : 'FORCE MODEL MODE DISABLED.',
        });
        await loadAllData();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Add Memory handler
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemKey || !newMemContent) return;
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, category: 'preference', key: newMemKey, content: newMemContent }),
      });
      setNewMemKey('');
      setNewMemContent('');
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memory/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser }),
      });
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/75 border border-cyan-500/40 text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">JARVIS Settings & Model Control Center</h2>
              <p className="text-xs text-slate-400">Zero-Config Boot, Independent API Keys, Free Model Bootstrap & Force Model Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Status Banner */}
        <div className="bg-slate-950 border-b border-slate-800/80 px-6 py-2.5 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded font-bold ${modelStatus.isConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
              AI PROVIDER: {modelStatus.isConfigured ? modelStatus.provider.toUpperCase() : 'NOT CONFIGURED'}
            </span>
            <span className="text-slate-400">
              ACTIVE MODEL: <strong className="text-cyan-300">{modelStatus.activeModel}</strong>
            </span>
            <span className="text-slate-400">
              INTELLIGENCE: <strong className={modelStatus.bootstrap?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}>{modelStatus.bootstrap?.status || 'NOT INITIALIZED'}</strong>
            </span>
          </div>
          {modelStatus.forceModel && (
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-500 px-2 py-0.5 rounded font-bold animate-pulse">
              FORCE MODEL ACTIVE
            </span>
          )}
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b ${
            statusMessage.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' :
            statusMessage.type === 'error' ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'providers' ? 'bg-slate-900 text-cyan-400 border-cyan-500/40' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" /> API Keys & Providers
          </button>

          <button
            onClick={() => setActiveTab('control_center')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'control_center' ? 'bg-slate-900 text-cyan-400 border-cyan-500/40' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> Model Control Center ({modelsList.length})
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'memory' ? 'bg-slate-900 text-cyan-400 border-cyan-500/40' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Persistent Memory ({memories.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : (
            <>
              {/* TAB 1: INDEPENDENT API KEYS & PROVIDERS */}
              {activeTab === 'providers' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    Configure API keys independently per provider. Keys are stored in server-side database storage and are never exposed in logs or frontend code.
                  </div>

                  {/* Provider 1: Google Gemini */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">1. Google Gemini API</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${keysStatus.gemini?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-500'}`}>
                          {keysStatus.gemini?.configured ? `CONFIGURED (${keysStatus.gemini.masked})` : 'UNCONFIGURED'}
                        </span>
                      </div>
                      {keysStatus.gemini?.configured && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyKey('gemini')}
                            disabled={actionLoading === 'verify_gemini'}
                            className="px-2.5 py-1 text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded hover:bg-cyan-900"
                          >
                            Verify Key
                          </button>
                          <button
                            onClick={() => handleDeleteKey('gemini')}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Delete Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter Gemini API Key (AIzaSy...)"
                        value={inputGeminiKey}
                        onChange={(e) => setInputGeminiKey(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleSaveKey('gemini', inputGeminiKey)}
                        disabled={!inputGeminiKey.trim() || actionLoading === 'save_gemini'}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                      >
                        Save Gemini Key
                      </button>
                    </div>
                  </div>

                  {/* Provider 2: OpenAI */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">2. OpenAI API</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${keysStatus.openai?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-500'}`}>
                          {keysStatus.openai?.configured ? `CONFIGURED (${keysStatus.openai.masked})` : 'UNCONFIGURED'}
                        </span>
                      </div>
                      {keysStatus.openai?.configured && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyKey('openai')}
                            disabled={actionLoading === 'verify_openai'}
                            className="px-2.5 py-1 text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded hover:bg-cyan-900"
                          >
                            Verify Key
                          </button>
                          <button
                            onClick={() => handleDeleteKey('openai')}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Delete Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter OpenAI API Key (sk-...)"
                        value={inputOpenAiKey}
                        onChange={(e) => setInputOpenAiKey(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleSaveKey('openai', inputOpenAiKey)}
                        disabled={!inputOpenAiKey.trim() || actionLoading === 'save_openai'}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                      >
                        Save OpenAI Key
                      </button>
                    </div>
                  </div>

                  {/* Provider 3: OpenRouter */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">3. OpenRouter API (Free & Multimodal Models)</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${keysStatus.openrouter?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-500'}`}>
                          {keysStatus.openrouter?.configured ? `CONFIGURED (${keysStatus.openrouter.masked})` : 'UNCONFIGURED'}
                        </span>
                      </div>
                      {keysStatus.openrouter?.configured && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyKey('openrouter')}
                            disabled={actionLoading === 'verify_openrouter'}
                            className="px-2.5 py-1 text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded hover:bg-cyan-900"
                          >
                            Verify Key
                          </button>
                          <button
                            onClick={() => handleDeleteKey('openrouter')}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Delete Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter OpenRouter API Key (sk-or-v1-...)"
                        value={inputOpenRouterKey}
                        onChange={(e) => setInputOpenRouterKey(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleSaveKey('openrouter', inputOpenRouterKey)}
                        disabled={!inputOpenRouterKey.trim() || actionLoading === 'save_openrouter'}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                      >
                        Save OpenRouter Key
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MODEL CONTROL CENTER */}
              {activeTab === 'control_center' && (
                <div className="space-y-6">
                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleDiscoverModels}
                        disabled={actionLoading === 'discover'}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900 flex items-center gap-2"
                      >
                        {actionLoading === 'discover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Fetch & Discover Models
                      </button>

                      <button
                        onClick={handleBootstrap}
                        disabled={actionLoading === 'bootstrap'}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900 flex items-center gap-2"
                      >
                        {actionLoading === 'bootstrap' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Instant Free Model Bootstrap
                      </button>

                      <button
                        onClick={handleInitializeIntelligence}
                        disabled={actionLoading === 'intelligence'}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-900 flex items-center gap-2"
                      >
                        {actionLoading === 'intelligence' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                        Initialize Model Intelligence
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiConfig.freeOnly}
                          onChange={(e) => setAiConfig({ ...aiConfig, freeOnly: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-800 text-emerald-500 w-4 h-4"
                        />
                        <span>Strict Free-Only Mode</span>
                      </label>
                    </div>
                  </div>

                  {/* Model Catalog Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Discovered Catalog Registry ({modelsList.length} Models)
                      </span>
                      {modelStatus.forceModel && (
                        <button
                          onClick={() => handleToggleForceModel('', '', false)}
                          className="text-xs text-rose-400 hover:underline font-mono"
                        >
                          Disable Force Model Mode
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-950 text-slate-400 sticky top-0 font-mono text-[11px] border-b border-slate-800">
                          <tr>
                            <th className="p-3">Provider</th>
                            <th className="p-3">Model ID / Name</th>
                            <th className="p-3">Pricing</th>
                            <th className="p-3">Context</th>
                            <th className="p-3">Scores</th>
                            <th className="p-3">Action / Override</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {modelsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                                No models discovered yet. Please save your API key in Tab 1 and click "Fetch & Discover Models".
                              </td>
                            </tr>
                          ) : (
                            modelsList.map((m) => {
                              const isForced = modelStatus.forceModel && modelStatus.forcedModelId === m.model_id;
                              return (
                                <tr key={m.model_id} className={`hover:bg-slate-900/60 ${isForced ? 'bg-cyan-950/30' : ''}`}>
                                  <td className="p-3 font-mono text-cyan-400 uppercase">{m.provider}</td>
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-100">{m.display_name}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{m.model_id}</div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      m.is_free ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                                    }`}>
                                      {m.is_free ? 'FREE' : 'PAID'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-400">{Math.round((m.context_window || 8192) / 1024)}k</td>
                                  <td className="p-3 font-mono text-slate-400">
                                    Code: {m.coding_score} | Reason: {m.reasoning_score}
                                  </td>
                                  <td className="p-3">
                                    <button
                                      onClick={() => handleToggleForceModel(m.model_id, m.provider, !isForced)}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                        isForced
                                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
                                          : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      {isForced ? 'FORCE ACTIVE' : 'Force Model'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PERSISTENT MEMORY */}
              {activeTab === 'memory' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-300 mb-3">Add Persistent Memory for {currentUser}</h3>
                    <form onSubmit={handleAddMemory} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key (e.g. clothing_size)"
                        value={newMemKey}
                        onChange={(e) => setNewMemKey(e.target.value)}
                        className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        placeholder="Content (e.g. Size L, lawn preference)"
                        value={newMemContent}
                        onChange={(e) => setNewMemContent(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                      <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                        Save Memory
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stored Memory Records ({memories.length})</h3>
                    {memories.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                        No persistent memory entries recorded yet.
                      </div>
                    ) : (
                      memories.map((m: any) => (
                        <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">{m.key}</span>
                              <span className="text-[10px] text-slate-500 uppercase">{m.category}</span>
                            </div>
                            <p className="text-xs text-slate-200">{m.content}</p>
                          </div>
                          <button onClick={() => handleDeleteMemory(m.id)} className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1">
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800">
            Close Settings
          </button>
        </div>

      </div>
    </div>
  );
};
