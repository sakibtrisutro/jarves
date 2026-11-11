import React, { useState } from 'react';
import { MessageSquare, Search, Plus, Trash2, Calendar, Clock, ChevronRight, Hash, Filter, Terminal, User } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsViewProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({ conversations, onSelect, onDelete, onNew }) => {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase text-white">Archives</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">Contextual Logs & Strategic Dialogues</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search archives..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all w-64 text-white" 
            />
          </div>
          <button 
            onClick={onNew}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: conversations.length, icon: MessageSquare, color: 'text-cyan-500' },
          { label: 'Active Threads', value: 1, icon: Hash, color: 'text-emerald-500' },
          { label: 'Avg Length', value: '12 msg', icon: Clock, color: 'text-indigo-500' },
          { label: 'Archive Size', value: '1.4 MB', icon: Terminal, color: 'text-slate-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
             <div className={`p-3 rounded-xl bg-slate-950 border border-white/5 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
             </div>
             <div>
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
                <div className="text-sm font-black text-slate-100">{stat.value}</div>
             </div>
          </div>
        ))}
      </div>

      {/* Main List */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600 space-y-4">
             <MessageSquare className="w-16 h-16 opacity-10" />
             <p className="text-sm font-mono uppercase tracking-widest">No archived sessions found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => onSelect(conv.id)}
                className="p-6 flex items-center gap-6 hover:bg-white/[0.02] transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-cyan-500 transition-colors">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-black text-slate-100 truncate uppercase tracking-tight group-hover:text-white transition-colors">{conv.title}</h4>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-white/5 bg-slate-800 text-slate-500 uppercase tracking-widest">Archive</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 font-medium italic">"{conv.summary || 'Strategic dialogue overview pending...'}"</p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-1">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(conv.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(conv.updated_at).toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> System Trace: 0x4F</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    className="p-3 rounded-xl bg-slate-950 border border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-3 rounded-xl bg-cyan-500 text-slate-950 shadow-lg">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
