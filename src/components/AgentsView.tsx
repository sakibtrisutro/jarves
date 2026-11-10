import React from 'react';
import { Zap, ShieldCheck, Cpu, Terminal, ChevronRight, Loader2, Power, Settings, Globe, Code, LineChart } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  capabilities: string[];
}

interface AgentsViewProps {
  agents: Agent[];
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents }) => {
  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Agent Orchestration</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">Distributed Intelligence & Autonomous Task Dispatch</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Orchestrator Online</span>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 group hover:border-cyan-500/20 transition-all">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-white/5 flex items-center justify-center text-cyan-400 shadow-2xl group-hover:scale-105 transition-transform">
                  {agent.id === 'coding_agent' ? <Code className="w-8 h-8" /> : <LineChart className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">{agent.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'READY' || agent.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{agent.status}</span>
                  </div>
                </div>
              </div>
              <button className="p-3 rounded-2xl bg-slate-950 border border-white/5 text-slate-600 hover:text-white transition-all">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              {agent.description}
            </p>

            <div className="space-y-4">
               <div className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest ml-1">Core Capabilities</div>
               <div className="flex flex-wrap gap-2">
                 {agent.capabilities.map(cap => (
                   <span key={cap} className="px-4 py-1.5 rounded-xl bg-slate-950/80 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {cap}
                   </span>
                 ))}
               </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
               <button className="flex-1 py-4 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]">
                 Initialize Module
               </button>
               <button className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-slate-500 hover:text-rose-400 transition-all">
                 <Power className="w-5 h-5" />
               </button>
            </div>
          </div>
        ))}

        {/* Discovery Card */}
        <div className="bg-slate-900/50 border border-dashed border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-20 h-20 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-800">
             <Globe className="w-10 h-10 opacity-20" />
           </div>
           <div className="space-y-2">
             <h3 className="text-lg font-black text-slate-300 uppercase tracking-tight">Agent Discovery</h3>
             <p className="text-xs text-slate-600 max-w-[280px]">Autonomous scanning of local and remote agent repositories in progress.</p>
           </div>
           <button className="px-6 py-2.5 rounded-xl border border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-all">
             Scan Workspace
           </button>
        </div>
      </div>

      {/* Orchestration Logs Placeholder */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
        <div className="flex items-center justify-between">
           <h3 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-4">
             <Terminal className="w-6 h-6 text-cyan-500" />
             Orchestration Feed
           </h3>
           <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Real-time Stream</span>
        </div>
        <div className="font-mono text-[11px] space-y-3 opacity-40">
           <div className="flex gap-4"><span className="text-slate-700">[14:22:01]</span> <span className="text-cyan-600">INF</span> <span>Orchestrator kernel synchronized with multi-user protocol.</span></div>
           <div className="flex gap-4"><span className="text-slate-700">[14:22:05]</span> <span className="text-cyan-600">INF</span> <span>Agent "Dev-Ops Engine" heartbeat verified.</span></div>
           <div className="flex gap-4"><span className="text-slate-700">[14:22:10]</span> <span className="text-indigo-600">TRC</span> <span>Memory optimization pass completed for user "Sakib".</span></div>
        </div>
      </div>

    </div>
  );
};
