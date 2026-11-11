import React from 'react';
import { Activity, ListTodo, BrainCircuit, History, ChevronRight, Zap, TrendingUp, ShieldCheck } from 'lucide-react';

interface DashboardViewProps {
  systemHealth: any;
  modelStatus: any;
  onNavigate: (view: any) => void;
  episodicMemories: any[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ systemHealth, modelStatus, onNavigate, episodicMemories }) => {
  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Executive Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core System Status */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-8 space-y-6 hover:border-emerald-500/20 transition-all group">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Optimal</span>
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-100">Core Systems</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Autonomous orchestration layer is active.</p>
          </div>
          <div className="space-y-3 pt-2">
             <div className="flex justify-between items-center text-xs font-mono">
               <span className="text-slate-500 uppercase tracking-tighter">Backend Runtime</span>
               <span className="text-emerald-500 font-bold">HEALTHY</span>
             </div>
             <div className="flex justify-between items-center text-xs font-mono">
               <span className="text-slate-500 uppercase tracking-tighter">Database (WAL)</span>
               <span className="text-emerald-500 font-bold">STABLE</span>
             </div>
             <div className="flex justify-between items-center text-xs font-mono">
               <span className="text-slate-500 uppercase tracking-tighter">Uptime Metrics</span>
               <span className="text-slate-300 font-bold">{systemHealth?.uptime || 0}s</span>
             </div>
          </div>
        </div>

        {/* Intelligence Pipeline */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-8 space-y-6 hover:border-cyan-500/20 transition-all group">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border uppercase tracking-widest ${modelStatus.intelligence.status === 'ACTIVE' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
              {modelStatus.intelligence.status}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-100">Intelligence</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Multi-provider model discovery engine.</p>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-black text-slate-100">{modelStatus.intelligence.discoveredCount || 0} <span className="text-xs font-mono text-slate-500 font-normal uppercase tracking-widest ml-1">Models Routed</span></div>
            <button onClick={() => onNavigate('assistant')} className="mt-4 text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2 hover:text-cyan-400 transition-colors">
              Configure Pipeline <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Operational Queue */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-8 space-y-6 hover:border-indigo-500/20 transition-all group">
          <div className="flex justify-between items-start">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <ListTodo className="w-8 h-8" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-100">Task Queue</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Executive directive status and priority.</p>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-black text-slate-100">0 <span className="text-xs font-mono text-slate-500 font-normal uppercase tracking-widest ml-1">Active Tasks</span></div>
            <button onClick={() => onNavigate('tasks')} className="mt-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 hover:text-indigo-300 transition-colors">
              Open Task Center <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Area - Episodic Memory / Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Episodic Timeline</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">Audit trail of system events and executive interactions.</p>
             </div>
             <History className="w-6 h-6 text-slate-700" />
           </div>

           {episodicMemories.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4 border border-dashed border-white/5 rounded-3xl">
               <History className="w-12 h-12 opacity-20" />
               <p className="text-sm font-mono uppercase tracking-widest text-slate-700">No episodic data recorded in current session</p>
             </div>
           ) : (
             <div className="space-y-4">
               {episodicMemories.map(event => (
                 <div key={event.id} className="flex gap-4 p-5 rounded-3xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all group">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2.5 shrink-0 group-hover:scale-125 transition-transform" />
                   <div className="flex-1 space-y-1">
                     <div className="flex justify-between">
                       <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{event.event_type.replace('_', ' ')}</span>
                       <span className="text-[10px] font-mono text-slate-600 uppercase">{new Date(event.created_at).toLocaleTimeString()}</span>
                     </div>
                     <h4 className="text-sm font-black text-slate-200">{event.title}</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">{event.content}</p>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Security Audit
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-2">
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest font-bold">Active Sessions</div>
                <div className="text-sm font-black text-slate-300">1 Secure Connection</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-2">
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest font-bold">Access Integrity</div>
                <div className="text-sm font-black text-slate-300">AES-256 REST SYNC</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 space-y-6 text-white shadow-2xl shadow-indigo-900/20">
            <Zap className="w-8 h-8 text-white/50" />
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Agent Status</h3>
              <p className="text-xs text-white/70 font-medium mt-1">Autonomous orchestration runtime is currently optimizing resource allocation.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-white" />
              </div>
            </div>
            <button onClick={() => onNavigate('agents')} className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black uppercase tracking-widest transition-all">
              Initialize Agents
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
