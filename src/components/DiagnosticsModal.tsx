import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Pause,
  Play,
  Download,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Server,
  Zap,
  Bot,
  Database,
  Radio,
  Clock,
  Terminal,
} from 'lucide-react';

export interface SystemEvent {
  event_id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: string;
  component: string;
  message: string;
  error_code?: string;
  correlation_id?: string;
  task_id?: string;
  agent_id?: string;
  provider_id?: string;
  metadata?: Record<string, any>;
  stack_trace?: string;
  troubleshooting?: string;
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemHealth: any;
}

const CATEGORIES = [
  'ALL',
  'SYSTEM',
  'API',
  'VOICE',
  'TELEGRAM',
  'AGENT',
  'TASK',
  'DATABASE',
  'SECURITY',
  'ERROR',
];

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose, systemHealth }) => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=200');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchLogs();

    // Connect to live SSE stream
    try {
      const es = new EventSource('/api/logs/stream');
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'EVENT' && payload.event) {
            setEvents((prev) => {
              if (isPaused) return prev;
              const exists = prev.some((x) => x.event_id === payload.event.event_id);
              if (exists) return prev;
              return [payload.event, ...prev.slice(0, 300)];
            });
          }
        } catch {}
      };

      return () => {
        es.close();
      };
    } catch (err) {
      console.error('SSE connection error:', err);
    }
  }, [isOpen, isPaused]);

  if (!isOpen) return null;

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (selectedCategory !== 'ALL' && ev.category !== selectedCategory) return false;
    if (selectedLevel !== 'ALL' && ev.level !== selectedLevel) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        ev.message.toLowerCase().includes(q) ||
        ev.component.toLowerCase().includes(q) ||
        (ev.error_code && ev.error_code.toLowerCase().includes(q)) ||
        (ev.correlation_id && ev.correlation_id.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const errorCount = events.filter((e) => e.level === 'ERROR' || e.level === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.level === 'WARNING').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all diagnostic events?')) {
      await fetch('/api/logs/clear', { method: 'POST' });
      setEvents([]);
      setSelectedEvent(null);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-400" /> CRITICAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> WARNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                JARVIS Live System Diagnostics
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                  Live SSE Stream
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time sub-system diagnostics, error correlation, API health & agent monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isPaused
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Resume Stream' : 'Pause'}
            </button>
            <a
              href="/api/logs/export"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </a>
            <button
              onClick={handleClearLogs}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Health Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">System Health</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                {systemHealth?.status === 'healthy' ? 'Healthy' : 'Operational'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Active Agents</div>
              <div className="text-sm font-bold text-cyan-300">
                {systemHealth?.subsystems?.active_agents || 10} Live Specialists
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">API Connections</div>
              <div className="text-sm font-bold text-indigo-300">
                {systemHealth?.subsystems?.ai_provider || 'Active'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${errorCount > 0 ? 'bg-rose-950/60 border-rose-500/30 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Tracked Errors</div>
              <div className={`text-sm font-bold ${errorCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {errorCount} Errors ({warningCount} Warnings)
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search error, message, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO Only</option>
              <option value="WARNING">WARNING Only</option>
              <option value="ERROR">ERROR Only</option>
              <option value="CRITICAL">CRITICAL Only</option>
            </select>
          </div>
        </div>

        {/* Main Content Area (Split Table + Detail Inspection) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Events Stream Table */}
          <div className={`flex-1 overflow-y-auto divide-y divide-slate-800/60 ${selectedEvent ? 'hidden md:block md:w-3/5' : 'w-full'}`}>
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Terminal className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No diagnostic events match current filter.</p>
                <p className="text-xs text-slate-600 mt-1">Events will appear automatically in real-time as JARVIS executes.</p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isSelected = selectedEvent?.event_id === event.event_id;
                return (
                  <div
                    key={event.event_id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-3 sm:px-5 sm:py-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-800/40 ${
                      isSelected ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <div className="pt-0.5">{getLevelBadge(event.level)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {event.category}
                        </span>
                        <span className="text-xs font-medium text-slate-300 truncate">
                          {event.component}
                        </span>
                        {event.error_code && (
                          <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900">
                            {event.error_code}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {event.message}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 self-center shrink-0" />
                  </div>
                );
              })
            )}
          </div>

          {/* Event Detail Inspection Slide-Over */}
          {selectedEvent && (
            <div className="w-full md:w-2/5 border-l border-slate-800 bg-slate-950 overflow-y-auto p-5 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {getLevelBadge(selectedEvent.level)}
                  <span className="text-sm font-bold text-slate-200">Event Details</span>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Troubleshooting Guidance Banner */}
              {selectedEvent.troubleshooting && (
                <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3.5 text-xs">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" /> Suggested Resolution & Troubleshooting:
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedEvent.troubleshooting}
                  </pre>
                </div>
              )}

              {/* Metadata Fields */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Event ID:</span>
                  <span className="font-mono text-slate-300 flex items-center gap-1">
                    {selectedEvent.event_id}
                    <button
                      onClick={() => handleCopy(selectedEvent.event_id, 'eid')}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {copiedId === 'eid' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Component:</span>
                  <span className="text-slate-200 font-medium">{selectedEvent.component}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-200">{selectedEvent.category}</span>
                </div>

                {selectedEvent.error_code && (
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">Error Code:</span>
                    <span className="font-mono text-rose-400 font-bold">{selectedEvent.error_code}</span>
                  </div>
                )}

                {selectedEvent.correlation_id && (
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">Correlation ID:</span>
                    <span className="font-mono text-slate-400">{selectedEvent.correlation_id}</span>
                  </div>
                )}
              </div>

              {/* Event Message */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Message:</div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-slate-200 font-mono break-words leading-relaxed">
                  {selectedEvent.message}
                </div>
              </div>

              {/* Stack Trace if present */}
              {selectedEvent.stack_trace && (
                <div>
                  <div className="text-xs font-semibold text-rose-400 mb-1">Stack Trace:</div>
                  <pre className="bg-slate-900/90 border border-rose-950 p-3 rounded-lg text-[11px] text-rose-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {selectedEvent.stack_trace}
                  </pre>
                </div>
              )}

              {/* Metadata JSON */}
              {selectedEvent.metadata && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1">Context Payload:</div>
                  <pre className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-[11px] text-slate-300 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Showing {filteredEvents.length} of {events.length} events</span>
            <span className="text-slate-700">•</span>
            <span>Persistence: SQLite WAL (Local)</span>
          </div>
          <div>
            <span className="text-cyan-400/80 font-mono">JARVIS Telemetry Engine v2.0</span>
          </div>
        </div>

      </div>
    </div>
  );
};
