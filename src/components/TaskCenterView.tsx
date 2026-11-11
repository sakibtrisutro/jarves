import React, { useState } from 'react';
import { 
  ListTodo, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, MoreVertical, Calendar as CalendarIcon, Zap, Play, 
  Loader2, Pause, RotateCcw, ShieldAlert, Check, X, ChevronLeft, CalendarDays, Eye
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'pending' | 'scheduled' | 'running' | 'waiting_approval' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  schedule_type: 'once' | 'recurring';
  scheduled_at: string | null;
  recurrence_rule?: string | null;
  error_json?: string | null;
  result_json?: string | null;
  created_at: string;
}

interface TaskCenterViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: any) => void;
  onCreateTask: (task: any) => void;
}

export const TaskCenterView: React.FC<TaskCenterViewProps> = ({ tasks, onUpdateTask, onCreateTask }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarScope, setCalendarScope] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [newScheduleType, setNewScheduleType] = useState<'once' | 'recurring'>('once');
  const [newScheduledAt, setNewScheduledAt] = useState('');

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
      case 'waiting_approval': return 'text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse';
      case 'paused': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'scheduled': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'pending': return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/approve`, { method: 'POST', credentials: 'same-origin' });
      onUpdateTask(id, { status: 'pending' });
    } catch {}
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/reject`, { method: 'POST', credentials: 'same-origin' });
      onUpdateTask(id, { status: 'cancelled' });
    } catch {}
  };

  const handleRetry = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/retry`, { method: 'POST', credentials: 'same-origin' });
      onUpdateTask(id, { status: 'pending' });
    } catch {}
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      schedule_type: newScheduleType,
      scheduled_at: newScheduledAt ? new Date(newScheduledAt).toISOString() : null,
    });
    setNewTitle('');
    setNewDesc('');
    setIsCreateModalOpen(false);
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Task Center & Scheduler</h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest font-mono opacity-70">ACID Lifecycle Management & Calendar Engine</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-white/5 rounded-2xl p-1">
            <button 
              onClick={() => setViewMode('list')} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode('calendar')} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-900/20"
          >
            <Plus className="w-4 h-4" /> New Directive
          </button>
        </div>
      </div>

      {/* Task Filters */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2">
          {['all', 'pending', 'scheduled', 'running', 'waiting_approval', 'paused', 'completed', 'failed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-slate-950 shadow-lg' : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:border-white/10'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative group shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-2xl pl-11 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500/50 transition-all w-52" 
          />
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Task List View */
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-600 space-y-4">
              <ListTodo className="w-16 h-16 opacity-10" />
              <div className="text-center">
                <p className="text-sm font-mono uppercase tracking-widest">No matching directives found</p>
                <p className="text-[10px] mt-2 opacity-50">Issue a directive in the assistant or click "New Directive".</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTasks.map(task => (
                <div key={task.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-all group">
                  <div className="flex items-start gap-5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 mt-1 ${getStatusColor(task.status)}`}>
                      {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : 
                       task.status === 'failed' ? <AlertCircle className="w-6 h-6" /> : 
                       task.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                       task.status === 'waiting_approval' ? <ShieldAlert className="w-6 h-6" /> :
                       task.status === 'paused' ? <Pause className="w-6 h-6" /> :
                       <Clock className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-black text-slate-100 truncate uppercase tracking-tight">{task.title}</h4>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                          task.priority === 'critical' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 
                          task.priority === 'high' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 
                          task.priority === 'normal' ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : 
                          'text-slate-500 border-white/5 bg-slate-800'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 font-medium">{task.description || 'No detailed instructions provided.'}</p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-1">
                        <span className="flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> {new Date(task.created_at).toLocaleDateString()}</span>
                        {task.scheduled_at && <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(task.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> {task.schedule_type}</span>
                        {task.recurrence_rule && <span className="text-indigo-400 font-bold">↻ {task.recurrence_rule}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Operational Action Controls */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {task.status === 'waiting_approval' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleApprove(task.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button 
                          onClick={() => handleReject(task.id)}
                          className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-rose-400 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {task.status === 'pending' && (
                      <button 
                        onClick={() => onUpdateTask(task.id, { status: 'running' })} 
                        className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Execute
                      </button>
                    )}

                    {task.status === 'running' && (
                      <button 
                        onClick={() => onUpdateTask(task.id, { status: 'paused' })} 
                        className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}

                    {task.status === 'paused' && (
                      <button 
                        onClick={() => onUpdateTask(task.id, { status: 'running' })} 
                        className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Resume
                      </button>
                    )}

                    {task.status === 'failed' && (
                      <button 
                        onClick={() => handleRetry(task.id)} 
                        className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retry
                      </button>
                    )}

                    <button 
                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      className="p-2.5 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-all"
                      title="Inspect Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Calendar View (Day / Week / Month) */
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  if (calendarScope === 'month') d.setMonth(d.getMonth() - 1);
                  else if (calendarScope === 'week') d.setDate(d.getDate() - 7);
                  else d.setDate(d.getDate() - 1);
                  setCurrentDate(d);
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                {currentDate.toLocaleDateString(undefined, { 
                  month: 'long', 
                  year: 'numeric',
                  ...(calendarScope === 'day' ? { day: 'numeric' } : {}) 
                })}
              </h3>
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  if (calendarScope === 'month') d.setMonth(d.getMonth() + 1);
                  else if (calendarScope === 'week') d.setDate(d.getDate() + 7);
                  else d.setDate(d.getDate() + 1);
                  setCurrentDate(d);
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-white/5">
              {(['day', 'week', 'month'] as const).map(scope => (
                <button
                  key={scope}
                  onClick={() => setCalendarScope(scope)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarScope === scope ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          {calendarScope === 'month' && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-mono font-bold text-slate-500 uppercase">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(firstDayIndex)].map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-24 rounded-2xl bg-slate-950/20 border border-white/[0.02]" />
                ))}
                {[...Array(daysInMonth)].map((_, i) => {
                  const dayNum = i + 1;
                  const dayTasks = tasks.filter(t => {
                    const d = t.scheduled_at ? new Date(t.scheduled_at) : new Date(t.created_at);
                    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dayNum;
                  });
                  return (
                    <div key={`day-${dayNum}`} className="min-h-24 rounded-2xl bg-slate-950/60 border border-white/5 p-2 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                      <span className="text-xs font-black text-slate-400">{dayNum}</span>
                      <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                        {dayTasks.map(dt => (
                          <div key={dt.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border ${getStatusColor(dt.status)}`} title={dt.title}>
                            {dt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarScope === 'week' && (
            <div className="grid grid-cols-7 gap-3">
              {[...Array(7)].map((_, idx) => {
                const dayDate = new Date(currentDate);
                dayDate.setDate(currentDate.getDate() - currentDate.getDay() + idx);
                const dayTasks = tasks.filter(t => {
                  const d = t.scheduled_at ? new Date(t.scheduled_at) : new Date(t.created_at);
                  return d.toDateString() === dayDate.toDateString();
                });
                return (
                  <div key={idx} className="min-h-72 rounded-2xl bg-slate-950/60 border border-white/5 p-3 flex flex-col">
                    <div className="text-center pb-2 border-b border-white/5">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</div>
                      <div className="text-sm font-black text-white">{dayDate.getDate()}</div>
                    </div>
                    <div className="space-y-2 mt-3 flex-1 overflow-y-auto">
                      {dayTasks.map(t => (
                        <div key={t.id} className={`p-2 rounded-xl border text-[10px] space-y-1 ${getStatusColor(t.status)}`}>
                          <div className="font-bold truncate">{t.title}</div>
                          <div className="text-[8px] opacity-70 font-mono">{t.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calendarScope === 'day' && (
            <div className="space-y-3">
              <div className="text-sm font-black text-slate-300">Agenda for {currentDate.toDateString()}</div>
              <div className="divide-y divide-white/5 bg-slate-950/60 rounded-2xl border border-white/5">
                {tasks.filter(t => {
                  const d = t.scheduled_at ? new Date(t.scheduled_at) : new Date(t.created_at);
                  return d.toDateString() === currentDate.toDateString();
                }).length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase">No scheduled directives for this day.</div>
                ) : (
                  tasks.filter(t => {
                    const d = t.scheduled_at ? new Date(t.scheduled_at) : new Date(t.created_at);
                    return d.toDateString() === currentDate.toDateString();
                  }).map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-white">{t.title}</div>
                        <div className="text-[10px] font-mono text-slate-500">{t.description || 'No description'}</div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(t.status)}`}>{t.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Inspection Drawer */}
      {selectedTask && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" /> Task Execution Details: {selectedTask.title}
            </h3>
            <button onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
              <span className="text-slate-500 uppercase block text-[9px]">ID</span>
              <span className="text-slate-200">{selectedTask.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
              <span className="text-slate-500 uppercase block text-[9px]">Status</span>
              <span className="text-cyan-400 uppercase font-bold">{selectedTask.status}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
              <span className="text-slate-500 uppercase block text-[9px]">Priority</span>
              <span className="text-amber-400 uppercase font-bold">{selectedTask.priority}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
              <span className="text-slate-500 uppercase block text-[9px]">Recurrence</span>
              <span className="text-purple-400 uppercase">{selectedTask.recurrence_rule || 'None'}</span>
            </div>
          </div>
          {selectedTask.error_json && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
              <span className="font-black uppercase block mb-1">Execution Failure Log:</span>
              <pre className="whitespace-pre-wrap">{selectedTask.error_json}</pre>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" /> New Autonomous Directive
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Directive Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Audit Weekly Facebook Analytics"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Detailed Instructions</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Provide scope, constraints, and success criteria for the autonomous agent..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <select 
                    value={newPriority} 
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Schedule Type</label>
                  <select 
                    value={newScheduleType} 
                    onChange={e => setNewScheduleType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="once">Once</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Scheduled Execution Time (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={newScheduledAt}
                  onChange={e => setNewScheduledAt(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-cyan-400 shadow-lg shadow-cyan-950/20"
                >
                  Dispatch Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
