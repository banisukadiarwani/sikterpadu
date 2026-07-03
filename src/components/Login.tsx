import React, { useState } from 'react';
import { User, SIKTState } from '../types';
import { Shield, Lock, Mail, ChevronRight, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  state: SIKTState;
  onLogin: (user: User) => void;
  onCancel?: () => void;
}

export default function Login({ state, onLogin, onCancel }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Suggested demo passwords for Admin
  const demoPasswords: Record<string, string> = {
    'bowo@gmail.com': 'admin123',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const matchedUser = (state.users || []).find(u => u.email.toLowerCase() === trimmedEmail);

    if (!matchedUser || matchedUser.role !== 'Administrator') {
      setErrorMsg('Akses ditolak. Email tidak terdaftar sebagai Administrator.');
      return;
    }

    const requiredPass = demoPasswords[matchedUser.email] || 'admin123';
    if (password !== requiredPass && password !== '123456') {
      setErrorMsg('Kata sandi salah untuk akun Administrator.');
      return;
    }

    setSuccessMsg(`Autentikasi Berhasil! Selamat datang, ${matchedUser.nama}.`);
    setTimeout(() => {
      onLogin(matchedUser);
      setSuccessMsg(null);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-slate-900">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-850 border border-slate-750 rounded-3xl shadow-xl overflow-hidden relative z-10 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-600 rounded-2xl text-white font-black tracking-widest text-lg shadow-lg mb-2">
            SIKT
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Login Administrator SIKT</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Silakan masukkan kredensial Administrator</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-3">
            
            {/* Email Field */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="email"
                placeholder="Email Administrator (Contoh: bowo@gmail.com)"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 transition-all font-mono font-medium"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="password"
                placeholder="Kata Sandi Administrator"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 transition-all font-mono font-medium"
              />
            </div>
          </div>

          {/* Alert validations messages */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-900/40 rounded-xl text-[11px] text-red-200 leading-relaxed font-semibold animate-in shake duration-250">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-900/40 rounded-xl text-[11px] text-emerald-200 leading-relaxed font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!email || !password}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-md transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1 cursor-pointer"
          >
            Masuk Sebagai Administrator <ChevronRight className="h-4 w-4" />
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-2xl text-xs font-bold tracking-wider uppercase transition border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              Kembali ke Mode Tamu (Guest)
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
