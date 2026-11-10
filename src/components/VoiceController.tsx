import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Radio, Loader2, Play, CircleDot } from 'lucide-react';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'INTERRUPTED' | 'ERROR';

interface VoiceControllerProps {
  onTranscriptSubmitted: (transcript: string) => void;
  isProcessingResponse: boolean;
  activeLanguage: string;
  onLanguageChange: (lang: string) => void;
  voicePersonality: string;
  onListeningStarted?: () => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  onTranscriptSubmitted,
  isProcessingResponse,
  activeLanguage,
  onLanguageChange,
  voicePersonality,
  onListeningStarted,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [pttEnabled, setPttEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = !pttEnabled;
      recognition.interimResults = true;
      recognition.lang = activeLanguage === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        if (!isMicMuted) setVoiceState('LISTENING');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) currentFinal += transcript;
          else currentInterim += transcript;
        }
        setInterimTranscript(currentInterim);
        if (currentFinal.trim()) {
          setInterimTranscript('');
          setVoiceState('PROCESSING');
          onTranscriptSubmitted(currentFinal.trim());
          if (pttEnabled) recognition.stop();
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setVoiceState('ERROR');
        else if (event.error !== 'no-speech') setVoiceState('IDLE');
      };

      recognition.onend = () => {
        if (voiceState !== 'SPEAKING' && voiceState !== 'PROCESSING' && !pttEnabled && continuousMode) {
          try { recognition.start(); } catch {}
        } else if (voiceState !== 'SPEAKING' && voiceState !== 'PROCESSING') {
          setVoiceState('IDLE');
        }
      };

      recognitionRef.current = recognition;
    }
  }, [activeLanguage, pttEnabled, continuousMode, isMicMuted]);

  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch {}
  };

  const stopVisualizer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    setAudioLevel(0);
  };

  const toggleMic = () => {
    if (voiceState === 'LISTENING') {
      recognitionRef.current?.stop();
      stopVisualizer();
      setVoiceState('IDLE');
    } else {
      if (onListeningStarted) onListeningStarted();
      recognitionRef.current?.start();
      startVisualizer();
    }
  };

  useEffect(() => {
    if (isProcessingResponse) setVoiceState('PROCESSING');
  }, [isProcessingResponse]);

  return (
    <div className="bg-slate-950/90 border border-cyan-500/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          {voiceState === 'LISTENING' && <span className="text-emerald-400 animate-pulse flex items-center gap-1"><CircleDot className="w-3 h-3" /> LISTENING...</span>}
          {voiceState === 'PROCESSING' && <span className="text-cyan-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> PROCESSING...</span>}
          {voiceState === 'IDLE' && <span className="text-slate-500 flex items-center gap-1"><Radio className="w-3 h-3" /> STANDBY</span>}
          {voiceState === 'ERROR' && <span className="text-rose-500">MIC PERMISSION BLOCKED</span>}
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
          <button onClick={() => onLanguageChange('en')} className={activeLanguage === 'en' ? 'text-cyan-400 font-bold' : ''}>EN</button>
          <span className="opacity-20">|</span>
          <button onClick={() => onLanguageChange('bn')} className={activeLanguage === 'bn' ? 'text-cyan-400 font-bold' : ''}>BN</button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-1 h-8 justify-center bg-slate-900/40 rounded-lg border border-slate-800/50">
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ height: voiceState === 'LISTENING' ? `${Math.max(15, audioLevel * (0.5 + Math.random() * 0.5))}%` : '15%' }} className={`w-1 rounded-full transition-all duration-75 ${voiceState === 'LISTENING' ? 'bg-cyan-500' : 'bg-slate-800'}`} />
          ))}
        </div>

        <button 
          onMouseDown={() => pttEnabled && toggleMic()} 
          onMouseUp={() => pttEnabled && voiceState === 'LISTENING' && toggleMic()}
          onClick={() => !pttEnabled && toggleMic()}
          className={`p-5 rounded-full transition-all duration-300 shadow-xl ${voiceState === 'LISTENING' ? 'bg-rose-500 scale-110 shadow-rose-500/30' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20'}`}
        >
          <Mic className={`w-7 h-7 ${voiceState === 'LISTENING' ? 'text-white' : 'text-slate-950'}`} />
        </button>

        <div className="flex flex-col gap-1.5">
          <button onClick={() => setPttEnabled(!pttEnabled)} className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${pttEnabled ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>PTT: {pttEnabled ? 'ON' : 'OFF'}</button>
          <button onClick={() => setIsMicMuted(!isMicMuted)} className={`p-1.5 rounded-lg border ${isMicMuted ? 'bg-rose-950 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}><MicOff className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {interimTranscript && <div className="text-center text-[11px] text-cyan-300/70 italic px-2 truncate leading-none">"{interimTranscript}"</div>}
    </div>
  );
};
