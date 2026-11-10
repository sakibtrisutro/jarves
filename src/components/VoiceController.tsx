import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Radio, Loader2 } from 'lucide-react';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'MUTED' | 'ERROR';

interface VoiceControllerProps {
  onTranscriptSubmitted: (transcript: string) => void;
  isProcessingResponse: boolean;
  activeLanguage: string;
  onLanguageChange: (lang: string) => void;
  voicePersonality: string; // 'Male' or 'Female'
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  onTranscriptSubmitted,
  isProcessingResponse,
  activeLanguage,
  onLanguageChange,
  voicePersonality,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Speech Recognition robustly with permission handling
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = activeLanguage === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        if (!isMicMuted) {
          setVoiceState('LISTENING');
        }
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        setInterimTranscript(currentInterim);

        if (currentFinal.trim()) {
          setInterimTranscript('');
          setVoiceState('PROCESSING');
          onTranscriptSubmitted(currentFinal.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceState('ERROR');
          alert('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        } else if (event.error !== 'no-speech') {
          setVoiceState('IDLE');
        }
      };

      recognition.onend = () => {
        if (isContinuousMode && !isMicMuted && voiceState !== 'SPEAKING' && voiceState !== 'PROCESSING') {
          try {
            recognition.start();
          } catch {}
        } else if (voiceState !== 'SPEAKING' && voiceState !== 'PROCESSING') {
          setVoiceState('IDLE');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      stopAudioVisualizer();
    };
  }, [activeLanguage, isContinuousMode, isMicMuted]);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (err: any) {
      console.warn('Microphone stream permission notice:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    if (isProcessingResponse) {
      setVoiceState('PROCESSING');
    }
  }, [isProcessingResponse]);

  const toggleListening = () => {
    if (isMicMuted) setIsMicMuted(false);

    if (voiceState === 'LISTENING') {
      try { recognitionRef.current?.stop(); } catch {}
      stopAudioVisualizer();
      setVoiceState('IDLE');
    } else {
      try {
        recognitionRef.current?.start();
        startAudioVisualizer();
        setVoiceState('LISTENING');
      } catch {
        setVoiceState('LISTENING');
      }
    }
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceState(isContinuousMode ? 'LISTENING' : 'IDLE');
  };

  return (
    <div className="bg-slate-950/85 border border-cyan-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      
      {/* Top Status & Mode Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {voiceState === 'LISTENING' && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              JARVIS is Listening...
            </span>
          )}
          {voiceState === 'PROCESSING' && (
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40">
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              Processing...
            </span>
          )}
          {voiceState === 'SPEAKING' && (
            <span className="flex items-center gap-1.5 text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/40">
              <Volume2 className="w-3.5 h-3.5 animate-bounce text-indigo-400" />
              JARVIS Speaking ({voicePersonality} Voice)
            </span>
          )}
          {voiceState === 'ERROR' && (
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40">
              Microphone Permission Blocked
            </span>
          )}
          {voiceState === 'IDLE' && (
            <span className="flex items-center gap-1.5 text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
              <Radio className="w-3 h-3 text-slate-500" />
              Standby (Click mic to speak)
            </span>
          )}
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${activeLanguage === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('bn')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${activeLanguage === 'bn' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {/* Center Visualizer & Talk Button */}
      <div className="flex items-center justify-between gap-4 py-1">
        
        {/* Wave Bars */}
        <div className="flex items-center gap-1 h-10 w-28 sm:w-36 justify-center bg-slate-900/60 border border-slate-800 rounded-xl px-2">
          {[...Array(8)].map((_, i) => {
            const height = voiceState === 'LISTENING' ? Math.max(12, (audioLevel * (0.4 + (i % 3) * 0.3)) % 100) : 6;
            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1.5 rounded-full transition-all duration-75 ${voiceState === 'LISTENING' ? 'bg-emerald-400' : 'bg-slate-700'}`}
              />
            );
          })}
        </div>

        {/* Talk Button */}
        <button
          onClick={toggleListening}
          className={`p-4 sm:p-5 rounded-full transition-all duration-300 transform active:scale-95 shadow-lg ${
            voiceState === 'LISTENING'
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50 scale-105'
              : 'bg-slate-900 border-2 border-cyan-500/60 text-cyan-400 hover:bg-cyan-950/60 shadow-cyan-950'
          }`}
          title="Start / Stop Microphone"
        >
          {voiceState === 'LISTENING' ? <Mic className="w-7 h-7 animate-pulse" /> : <Mic className="w-7 h-7" />}
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {voiceState === 'SPEAKING' && (
            <button
              onClick={handleStopSpeaking}
              className="px-3 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-rose-500 shadow-lg animate-bounce"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop Speaking
            </button>
          )}

          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`p-2.5 rounded-xl border transition-colors ${isMicMuted ? 'bg-rose-950 border-rose-600 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`p-2.5 rounded-xl border transition-colors ${isSpeakerMuted ? 'bg-rose-950 border-rose-600 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {interimTranscript && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 italic">
          "{interimTranscript}"
        </div>
      )}

    </div>
  );
};
