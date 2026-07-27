import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLoginSuccess(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex">
      {/* Left side - Dark branding with animations */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#0a1520] items-center justify-center overflow-hidden">
        {/* Timeline vertical line with heartbeat */}
        <div className="absolute right-8 top-0 bottom-0 flex flex-col items-center">
          {/* Vertical line */}
          <div className="w-px h-full bg-gradient-to-b from-transparent via-teal-500/30 to-transparent relative">
            {/* Heartbeat pulse traveling down */}
            <div className="absolute w-1 left-1/2 -translate-x-1/2 animate-heartbeat-down">
              <div className="w-1 h-16 bg-gradient-to-b from-transparent via-teal-400 to-transparent rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
            </div>
          </div>
          {/* Time markers */}
          <div className="absolute top-12 -left-8 text-[10px] font-mono text-teal-500/60">00:00</div>
          <div className="absolute top-1/4 -left-8 text-[10px] font-mono text-teal-500/60">06:15</div>
          <div className="absolute top-1/2 -left-8 text-[10px] font-mono text-teal-400/80 font-bold">{timeStr}</div>
          <div className="absolute top-3/4 -left-8 text-[10px] font-mono text-teal-500/60">18:30</div>
          <div className="absolute bottom-12 -left-8 text-[10px] font-mono text-teal-500/60">24:00</div>
        </div>

        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-teal-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-32 right-32 w-80 h-80 bg-teal-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col px-12 max-w-lg">
          {/* Logo with animated clock */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative w-14 h-14">
              {/* Clock ring */}
              <svg viewBox="0 0 56 56" className="w-14 h-14">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(20,184,166,0.3)" strokeWidth="2" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeDasharray="150.8" strokeDashoffset="37.7" strokeLinecap="round" className="animate-clock-ring" />
                {/* Clock hands */}
                <line x1="28" y1="28" x2="28" y2="16" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" className="origin-center animate-clock-minute" style={{ transformOrigin: '28px 28px' }} />
                <line x1="28" y1="28" x2="28" y2="20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" className="origin-center animate-clock-hour" style={{ transformOrigin: '28px 28px' }} />
                <circle cx="28" cy="28" r="2.5" fill="#14b8a6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">SetupSO</h1>
              <p className="text-[11px] text-teal-400 tracking-[0.25em] uppercase font-bold">Tempos & Movimentos</p>
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-8">
            <p className="text-[11px] text-teal-400 tracking-[0.2em] uppercase font-bold mb-4">— Cronoanálise cirúrgica</p>
            <h2 className="text-4xl font-black text-white leading-tight">
              Inteligência operacional<br />
              para <span className="text-teal-400">centros cirúrgicos</span>
            </h2>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed tracking-wide uppercase">
              Cada minuto de sala, medido, mapeado e otimizado em tempo real.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div>
              <p className="text-3xl font-black text-white">32<span className="text-teal-400 text-lg">%</span></p>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Redução média no tempo de troca de sala</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">100<span className="text-teal-400 text-lg">%</span></p>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Conformidade com protocolos hospitalares</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">24<span className="text-teal-400 text-lg">/7</span></p>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Indicadores atualizados em tempo real</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">SetupSO © 2026 — Ambiente validado</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-black text-slate-900">SetupSO</h1>
            <p className="text-xs text-teal-600 tracking-widest uppercase">Tempos & Movimentos</p>
          </div>

          {/* Secure badge */}
          <div className="flex justify-start mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 text-xs font-bold text-teal-700 tracking-wide uppercase">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Ambiente seguro
            </span>
          </div>

          <h2 className="text-3xl font-black text-slate-900">Acessar conta</h2>
          <p className="text-sm text-slate-500 mt-1">Entre com suas credenciais para continuar</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-2 tracking-widest uppercase">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-2 tracking-widest uppercase">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-3.5 pr-12 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-600 tracking-widest uppercase font-bold">Lembrar de mim</span>
              </label>
              <button type="button" className="text-[11px] text-teal-600 hover:text-teal-700 font-bold tracking-wide">
                Esqueceu a senha?
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 text-sm tracking-wide"
            >
              {loading ? 'Acessando...' : 'Acessar'}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>
          </form>

          {/* SSO */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <span className="relative bg-white px-3 text-[11px] text-slate-400 tracking-widest uppercase">ou</span>
            </div>
            <button
              type="button"
              className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-all text-sm"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Acessar com SSO
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-400 tracking-wide">
            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>Seus dados estão protegidos com criptografia de nível hospitalar.</span>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes heartbeat-down {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-heartbeat-down {
          animation: heartbeat-down 3s ease-in-out infinite;
        }
        @keyframes clock-ring {
          0% { stroke-dashoffset: 150.8; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -150.8; }
        }
        .animate-clock-ring {
          animation: clock-ring 8s linear infinite;
        }
        @keyframes clock-minute {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-clock-minute {
          animation: clock-minute 4s linear infinite;
        }
        @keyframes clock-hour {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-clock-hour {
          animation: clock-hour 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
