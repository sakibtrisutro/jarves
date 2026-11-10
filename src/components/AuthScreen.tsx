import React, { useState } from 'react';
import { Bot, Lock, User, KeyRound, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: { username: string; role: string; voicePersonality: string; mustChangePassword: boolean }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<'Sakib' | 'Sanjida'>('Sakib');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [needsPasswordChangeUser, setNeedsPasswordChangeUser] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser, password }),
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
    if (!newPassword || newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      const username = needsPasswordChangeUser || selectedUser;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword }),
      });

      if (!res.ok) throw new Error('Password update failed');

      // Now proceed to login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: newPassword }),
      });
      const data = await loginRes.json();
      if (loginRes.ok) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-md p-8 shadow-2xl shadow-cyan-950/60 relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-inner shadow-cyan-950">
            <Bot className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-slate-100">J.A.R.V.I.S.</h1>
          <p className="text-xs text-slate-400 mt-1">TRISUTRO Virtual CEO & Personal Assistant OS</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isChangingPassword ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Select User Account</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedUser('Sakib'); setPassword('1234'); }}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    selectedUser === 'Sakib'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-950'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" /> Sakib (Male Voice)
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedUser('Sanjida'); setPassword('1234'); }}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    selectedUser === 'Sanjida'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-950'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" /> Sanjida (Female Voice)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Password (Initial default: 1234)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sign In to JARVIS
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
              For security, please change your temporary default password (1234) for <b>{needsPasswordChangeUser}</b>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">New Secure Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Update Password & Continue
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
