import React, { useState } from 'react';
import { ListTodo, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, ChevronRight, MoreVertical, Calendar, Zap, Play, Loader2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'pending' | 'scheduled' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  schedule_type: 'once' | 'recurring';
  scheduled_at: string | null;
  created_at: string;
}

interface TaskCenterViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: any) => void;
  onCreateTask: (task: any) => void;
}

export const TaskCenterView: React.FC<TaskCenterViewProps> = ({ tasks, onUpdateTask, onCreateTask }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.description.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    return matchesSearch && t.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'running': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'failed': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Task Center</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">Lifecycle Management & Autonomous Scheduling</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all w-64" 
            />
          </div>
          <button className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all">
            <Filter className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-900/20">
            <Plus className="w-4 h-4" /> New Directive
          </button>
        </div>
      </div>

      {/* Task Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'running', 'completed', 'failed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-slate-950 shadow-lg' : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:border-white/10'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task Grid/List */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600 space-y-4">
             <ListTodo className="w-16 h-16 opacity-10" />
             <div className="text-center">
               <p className="text-sm font-mono uppercase tracking-widest">No matching directives found</p>
               <p className="text-[10px] mt-2 opacity-50">Use the chat to issue new executive orders.</p>
             </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTasks.map(task => (
              <div key={task.id} className="p-6 flex items-center gap-6 hover:bg-white/[0.02] transition-all group">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${getStatusColor(task.status)}`}>
                  {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : 
                   task.status === 'failed' ? <AlertCircle className="w-6 h-6" /> : 
                   task.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                   <Clock className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-black text-slate-100 truncate uppercase tracking-tight">{task.title}</h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                      task.priority === 'high' || task.priority === 'critical' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 
                      task.priority === 'normal' ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : 
                      'text-slate-500 border-white/5 bg-slate-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 font-medium">{task.description || 'No detailed instructions provided.'}</p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-1">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()}</span>
                    {task.scheduled_at && <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(task.scheduled_at).toLocaleTimeString()}</span>}
                    <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> {task.schedule_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {task.status === 'pending' && (
                    <button onClick={() => onUpdateTask(task.id, { status: 'running' })} className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 transition-all">
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}
                  <button className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Overlay Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
               <Calendar className="w-5 h-5 text-indigo-400" />
               Executive Schedule
             </h3>
             <ChevronRight className="w-5 h-5 text-slate-700" />
           </div>
           <div className="grid grid-cols-7 gap-2">
             {[...Array(31)].slice(0, 7).map((_, i) => (
               <div key={i} className="aspect-square rounded-xl bg-slate-950/50 border border-white/5 flex flex-col items-center justify-center gap-1">
                 <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">{['S','M','T','W','T','F','S'][i]}</span>
                 <span className="text-xs font-black text-slate-400">{i + 1}</span>
               </div>
             ))}
           </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center space-y-4">
           <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
             <Zap className="w-8 h-8" />
           </div>
           <div>
             <h3 className="text-lg font-black uppercase tracking-tight text-white">Autonomous Dispatch</h3>
             <p className="text-xs text-slate-500 mt-1 max-w-[200px]">System is currently analyzing task priorities and agent availability.</p>
           </div>
        </div>
      </div>

    </div>
  );
};
