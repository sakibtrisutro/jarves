import React, { useState, useEffect } from 'react';
import { Bot, Lock, User, KeyRound, Loader2, Sparkles, AlertCircle, Eye, EyeOff, CheckCircle2, ChevronRight, Mail } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: { username: string; role: string; voicePersonality: string; mustChangePassword: boolean; token: string }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<'Sakib' | 'Sanjida'>('Sakib');
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setStatusSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsPasswordChangeUser, setNeedsPasswordChangeUser] = useState<string | null>(null);

  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Auto-login via HttpOnly session cookie
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
      }
    } catch {
      // No active session cookie
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user.mustChangePassword) {
        setNeedsPasswordChangeUser(data.user.username);
        setIsChangingPassword(true);
      } else {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const username = needsPasswordChangeUser || selectedUser;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');

      setStatusSuccess('Security policy applied. Session authenticated.');
      setTimeout(() => onLoginSuccess(data.user), 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryStatus(null);
    if (!recoveryEmailInput.trim()) {
      setError('Please provide an email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Recovery service unavailable.');
      } else {
        setRecoveryStatus({ success: true, message: data.message });
      }
    } catch (err: any) {
      setError(err.message || 'Recovery request error');
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
           <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Account Recovery</h1>
            <p className="text-sm text-slate-400 mt-2 pr-4 pl-4">Provide your verified email address to receive a secure recovery link.</p>
          </div>

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-400 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {recoveryStatus?.message && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-400 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">{recoveryStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">Verified Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  value={recoveryEmailInput}
                  onChange={e => setRecoveryEmailInput(e.target.value)}
                  placeholder="sakib@example.com" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all" 
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'SEND RECOVERY LINK'}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsForgotPassword(false); setError(''); setRecoveryStatus(null); }} 
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              Return to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100 selection:bg-cyan-500/30">
      <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] w-full max-w-md p-10 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Animated Background Gradients */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-center text-cyan-400 mb-6 shadow-2xl">
            <Bot className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white">J.A.R.V.I.S. <span className="text-cyan-500 text-sm font-mono tracking-widest ml-1">OS</span></h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase mt-2 opacity-70 font-bold">Executive Intelligence System</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-400 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {!isChangingPassword ? (
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Selection</label>
              <div className="grid grid-cols-2 gap-3">
                {(['Sakib', 'Sanjida'] as const).map(user => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => { setSelectedUser(user); setPassword('1234'); }}
                    className={`group py-4 px-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                      selectedUser === user
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-950/50 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${selectedUser === user ? 'bg-cyan-500/20' : 'bg-slate-900 group-hover:bg-slate-800'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black tracking-wide uppercase">{user}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Access Key</label>
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-mono font-bold text-slate-600 hover:text-cyan-500 transition-colors uppercase tracking-widest">Recovery?</button>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password required"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium placeholder:text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded-lg bg-slate-950 border-white/5 text-cyan-500 focus:ring-0 transition-all cursor-pointer appearance-none checked:bg-cyan-500 border border-white/10"
                />
                {rememberMe && <CheckCircle2 className="w-3 h-3 text-slate-950 absolute left-1 pointer-events-none" />}
              </div>
              <label htmlFor="remember" className="text-xs font-bold text-slate-400 select-none cursor-pointer">Remember this executive session</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-sm hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(6,182,212,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Initialize Connection
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6 relative z-10 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-[11px] leading-relaxed text-amber-400/90 font-medium">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-black uppercase tracking-widest">Protocol Required</span>
              </div>
              For security, please redefine the temporary access key for executive profile: <span className="text-amber-300 font-bold">{needsPasswordChangeUser}</span>.
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">New Access Key</label>
                <div className="relative group">
                  <KeyRound className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm Access Key</label>
                <div className="relative group">
                  <CheckCircle2 className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Verify key"
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-white text-slate-950 font-black text-sm hover:bg-slate-100 active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              Apply Security Policy
            </button>
            
            <button type="button" onClick={() => setIsChangingPassword(false)} className="w-full text-[10px] font-black text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-[0.2em]">Abort Restoration</button>
          </form>
        )}

      </div>
      
      {/* Footer Branding */}
      <div className="fixed bottom-8 text-[10px] font-mono text-slate-600 tracking-[0.3em] uppercase">
        Trisutro Autonomous Technologies
      </div>
    </div>
  );
};
