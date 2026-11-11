import React, { useState } from 'react';
import { Database, Search, Filter, Trash2, Edit3, ShieldCheck, Zap, History, Database as DatabaseIcon, BrainCircuit, ChevronRight, AlertCircle } from 'lucide-react';

interface Memory {
  id: string;
  category: string;
  key: string;
  content: string;
  created_at: string;
}

interface MemoryViewProps {
  memories: Memory[];
  onDelete: (id: string) => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ memories, onDelete }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'semantic' | 'episodic'>('semantic');

  const filteredMemories = memories.filter(m => 
    m.key.toLowerCase().includes(search.toLowerCase()) || 
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Persistent Memory</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">Multi-Layer Knowledge Storage & User Context Persistence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search context..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all w-64" 
            />
          </div>
        </div>
      </div>

      {/* Layer Navigation */}
      <div className="flex gap-4 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('semantic')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'semantic' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <DatabaseIcon className="w-3 h-3" /> Semantic Layer
        </button>
        <button 
          onClick={() => setActiveTab('episodic')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'episodic' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <History className="w-3 h-3" /> Episodic Layer
        </button>
      </div>

      {activeTab === 'semantic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-slate-900/30 border border-dashed border-white/5 rounded-[2.5rem] text-slate-600 space-y-4">
                 <BrainCircuit className="w-16 h-16 opacity-10" />
                 <p className="text-sm font-mono uppercase tracking-widest">No semantic records found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredMemories.map(m => (
                  <div key={m.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 hover:border-cyan-500/20 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                       <button className="p-2 rounded-lg bg-slate-950 border border-white/5 text-slate-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                       <button onClick={() => onDelete(m.id)} className="p-2 rounded-lg bg-slate-950 border border-white/5 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-cyan-500 shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 pr-20">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-slate-500 border border-white/5 uppercase tracking-tighter">{m.category}</span>
                          <h4 className="text-sm font-black text-slate-200 uppercase tracking-tight">{m.key}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">{m.content}</p>
                        <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest pt-1">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar / Stats */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
               <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
                 <ShieldCheck className="w-5 h-5 text-emerald-400" />
                 Memory Integrity
               </h3>
               <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Load Factor</span>
                       <span className="text-xs font-black text-slate-300">0.02%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-[2%] h-full bg-cyan-500" />
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-950/50 border border-white/5 space-y-1">
                     <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Active Vectors</span>
                     <div className="text-2xl font-black text-slate-100">{memories.length}</div>
                  </div>
               </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] p-8 space-y-4">
               <div className="flex items-center gap-3 text-amber-500">
                 <AlertCircle className="w-5 h-5" />
                 <h3 className="text-sm font-black uppercase tracking-widest">Protocol Notice</h3>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">Semantic records are persistent across sessions. Modifying these entries will affect assistant decision logic and routing behavior.</p>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 bg-slate-900/30 border border-dashed border-white/5 rounded-[2.5rem] text-slate-600 space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-800">
            <History className="w-10 h-10 opacity-20" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Episodic Stream Syncing</h3>
            <p className="text-xs text-slate-600 max-w-[320px] mx-auto mt-2 leading-relaxed">System is reconciling action history with the persistent event store. This view will update upon successful verification.</p>
          </div>
        </div>
      )}

    </div>
  );
};
