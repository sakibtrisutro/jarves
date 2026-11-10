import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Mic, Sliders, CheckCircle2, AlertCircle, Loader2, RefreshCw, Save, Database, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'voice' | 'memory'>('ai');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI & Intelligence Settings
  const [aiConfig, setAiConfig] = useState({
    defaultProvider: 'gemini',
    freeOnly: true,
    selectedModel: 'gemini-3.8-flash',
    geminiApiKey: '',
    openRouterApiKey: '',
    naturalInstructions: 'Always prioritize free models. Prefer models that understand Bangla accurately.',
  });
  const [aiTestResult, setAiTestResult] = useState<{ success?: boolean; message?: string; latency?: number } | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [modelsList, setModelsList] = useState<any[]>([]);

  // Memory State
  const [memories, setMemories] = useState<any[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemContent, setNewMemContent] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.ai) setAiConfig((prev) => ({ ...prev, ...data.ai }));
        }

        const mRes = await fetch(`/api/memory?username=${currentUser}`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMemories(mData.memories || []);
        }

        const modRes = await fetch('/api/models');
        if (modRes.ok) {
          const modData = await modRes.json();
          setModelsList(modData.models || []);
        }
      } catch (err) {
        console.error('Failed to load settings data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiConfig.defaultProvider,
          apiKey: aiConfig.geminiApiKey || aiConfig.openRouterApiKey,
        }),
      });
      const data = await res.json();
      setAiTestResult({ success: data.success, message: data.message, latency: data.latencyMs });
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message });
    } finally {
      setTestingAi(false);
    }
  };

  const handleSyncOpenRouter = async () => {
    if (!aiConfig.openRouterApiKey) {
      alert('Please enter your OpenRouter API Key first.');
      return;
    }
    try {
      const res = await fetch('/api/models/sync-openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiConfig.openRouterApiKey }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully synchronized ${data.syncedCount} models from OpenRouter catalog!`);
        const modRes = await fetch('/api/models');
        const modData = await modRes.json();
        setModelsList(modData.models || []);
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    }
  };

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
      const mRes = await fetch(`/api/memory?username=${currentUser}`);
      const mData = await mRes.json();
      setMemories(mData.memories || []);
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
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'ai', values: aiConfig }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      if (onSettingsSaved) onSettingsSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/75 border border-cyan-500/40 text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">JARVIS Intelligence & Memory ({currentUser})</h2>
              <p className="text-xs text-slate-400">Model Intelligence Engine, OpenRouter Free Mode, and User Isolation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-colors flex items-center gap-2 ${
              activeTab === 'ai' ? 'bg-slate-900 text-cyan-400 border-cyan-500/40' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> AI Provider & Intelligence Engine
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : (
            <>
              {activeTab === 'ai' && (
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Active API Provider</label>
                    <select
                      value={aiConfig.defaultProvider}
                      onChange={(e) => setAiConfig({ ...aiConfig, defaultProvider: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="gemini">Google Gemini (Official GenAI SDK)</option>
                      <option value="openrouter">OpenRouter (Automatic Free Model Discovery)</option>
                    </select>
                  </div>

                  {aiConfig.defaultProvider === 'openrouter' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">OpenRouter API Key</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="sk-or-v1-..."
                          value={aiConfig.openRouterApiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, openRouterApiKey: e.target.value })}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={handleSyncOpenRouter}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900"
                        >
                          Fetch & Sync Models
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={aiConfig.geminiApiKey}
                        onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {/* Strict Free Only Toggle */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-400">Strict Free-Only Mode (Mandatory Policy)</div>
                      <div className="text-xs text-slate-400 mt-0.5">Never silently use or fallback to paid models. Enforced at backend routing level.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiConfig.freeOnly}
                      onChange={(e) => setAiConfig({ ...aiConfig, freeOnly: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 w-5 h-5"
                    />
                  </div>

                  {/* Natural Instructions Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Natural Language Intelligence Instructions</label>
                    <textarea
                      rows={3}
                      value={aiConfig.naturalInstructions}
                      onChange={(e) => setAiConfig({ ...aiConfig, naturalInstructions: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                      placeholder="e.g. Always prioritize free models. Prefer models that understand Bangla accurately..."
                    />
                  </div>

                  {/* Model Registry Summary */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Discovered & Verified Model Registry ({modelsList.length} models)</span>
                      <span className="text-cyan-400 font-mono">Auto Routing Active</span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {modelsList.map((m) => (
                        <div key={m.model_id} className="text-xs flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                          <span className="font-mono text-slate-300 truncate max-w-xs">{m.display_name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${m.is_free ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-amber-950 text-amber-400 border border-amber-900'}`}>
                            {m.is_free ? 'FREE' : 'PAID'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleTestAi}
                      disabled={testingAi}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900 flex items-center gap-2"
                    >
                      {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test Active Provider Connection
                    </button>

                    {aiTestResult && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs ${aiTestResult.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
                        <div className="font-semibold">{aiTestResult.success ? 'Connected Successfully' : 'Connection Failed'}</div>
                        <div className="text-slate-300 mt-0.5">{aiTestResult.message}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="space-y-5 max-w-3xl">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-300 mb-3">Add New Long-Term Memory for {currentUser}</h3>
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
                        placeholder="Content (e.g. Prefers unstitched luxury lawn, size M)"
                        value={newMemContent}
                        onChange={(e) => setNewMemContent(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                      <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                        Save
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stored Memories ({memories.length})</h3>
                    {memories.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                        No persistent memories recorded yet for {currentUser}. JARVIS will automatically store preferences or you can add them above.
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
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {saveSuccess && <span className="text-emerald-400 font-semibold">✓ Intelligence Settings Saved</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center gap-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
