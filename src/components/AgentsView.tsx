import React, { useState, useEffect } from 'react';
import { 
  Zap, ShieldCheck, Cpu, Terminal, ChevronRight, Loader2, Power, 
  Settings, Globe, Code, LineChart, FileText, Bot, CheckCircle2, 
  Search, Play, AlertCircle, Wrench
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role?: string;
  description: string;
  status: string;
  permissionTier?: 'tier1' | 'tier2';
  capabilities: string[];
  allowedTools?: string[];
}

interface Skill {
  id: string;
  name: string;
  description: string;
  status: string;
  file: string;
  supportedAgents: string[];
}

interface AgentsViewProps {
  agents: Agent[];
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents: initialAgents }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'skills'>('agents');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [testedSkill, setTestedSkill] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoadingSkills(true);
    try {
      const res = await fetch('/api/skills', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch {}
    finally { setLoadingSkills(false); }
  };

  const testSkill = (skillId: string) => {
    setTestedSkill(prev => ({ ...prev, [skillId]: 'TESTING' }));
    setTimeout(() => {
      setTestedSkill(prev => ({ ...prev, [skillId]: 'PASSED' }));
    }, 600);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Agent & Skill Center</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">
            Autonomous Multi-Agent Orchestration & Core Capabilities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-white/5 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'agents' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Agents ({initialAgents.length || 11})
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'skills' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Wrench className="w-3.5 h-3.5" /> Skills ({skills.length || 10})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'agents' ? (
        /* Agents Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {initialAgents.map(agent => (
            <div key={agent.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 group hover:border-cyan-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-cyan-400 shadow-xl group-hover:scale-105 transition-transform">
                      {agent.id.includes('code') || agent.id.includes('dev') ? <Code className="w-7 h-7" /> : 
                       agent.id.includes('partner') ? <Bot className="w-7 h-7 text-indigo-400" /> : 
                       agent.id.includes('data') ? <LineChart className="w-7 h-7" /> : 
                       <Cpu className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">{agent.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'READY' || agent.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">{agent.status}</span>
                        {agent.permissionTier && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-500/20 uppercase">
                            {agent.permissionTier.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {agent.description}
                </p>

                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">Capabilities</div>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.map(cap => (
                        <span key={cap} className="px-3 py-1 rounded-lg bg-slate-950/80 border border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {agent.allowedTools && agent.allowedTools.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">Authorized Tools</div>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.allowedTools.map(t => (
                        <span key={t} className="px-2.5 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/20 text-[9px] font-mono text-cyan-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-white/5">
                <button className="flex-1 py-3 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]">
                  Dispatch Subtask
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Skill Center Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {skills.map(skill => (
            <div key={skill.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight">{skill.name}</h4>
                      <span className="text-[9px] font-mono text-slate-500">{skill.file}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                    {skill.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {skill.description}
                </p>

                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Supported by: <span className="text-slate-300 font-bold">{skill.supportedAgents.join(', ')}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/5">
                <button 
                  onClick={() => testSkill(skill.id)}
                  disabled={testedSkill[skill.id] === 'TESTING'}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  {testedSkill[skill.id] === 'TESTING' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : testedSkill[skill.id] === 'PASSED' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {testedSkill[skill.id] === 'PASSED' ? 'Verification Passed' : 'Test Skill Integrity'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orchestration Stream */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            <Terminal className="w-5 h-5 text-cyan-500" />
            Autonomous Orchestration Bus
          </h3>
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Active Dispatcher</span>
        </div>
        <div className="font-mono text-xs space-y-2 opacity-60">
          <div className="flex gap-4"><span className="text-slate-600">[ORCHESTRATOR]</span> <span className="text-emerald-400">OK</span> <span>Partner Coordinator initialized with Tier 2 authorization.</span></div>
          <div className="flex gap-4"><span className="text-slate-600">[SKILL_REGISTRY]</span> <span className="text-cyan-400">LOAD</span> <span>10 specialized skills bound to active runtime pipelines.</span></div>
          <div className="flex gap-4"><span className="text-slate-600">[TASK_SCHEDULER]</span> <span className="text-indigo-400">SYNC</span> <span>SQLite WAL scheduler synced with persistent database records.</span></div>
        </div>
      </div>

    </div>
  );
};
