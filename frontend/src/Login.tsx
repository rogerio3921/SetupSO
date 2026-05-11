import React, { useState } from 'react';
import axios from 'axios';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin
        ? { email, password }
        : {
            email,
            password,
            fullName,
            badgeNumber,
            department: 'Centro Cirúrgico',
            function: 'Enfermeiro',
          };

      const response = await axios.post(`${API_URL}${endpoint}`, data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onLoginSuccess(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <section className="flex items-center justify-center bg-white px-8 py-12 lg:px-12">
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <div className="relative mb-6 flex h-44 w-44 items-center justify-center">
              <svg viewBox="0 0 220 220" className="h-44 w-44 drop-shadow-sm" aria-hidden="true">
                <defs>
                  <linearGradient id="setupsoRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#18a38d" />
                    <stop offset="100%" stopColor="#19b59c" />
                  </linearGradient>
                </defs>
                <path
                  d="M 152 34 A 78 78 0 1 0 176 146"
                  fill="none"
                  stroke="url(#setupsoRing)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 170 142 L 178 154 L 164 153 Z"
                  fill="#18a38d"
                />
                <path
                  d="M 66 88 H 154"
                  stroke="#0f4f66"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 92 88 L 84 113 H 136 L 128 88"
                  fill="#0f4f66"
                />
                <path
                  d="M 104 113 H 116 V 143 H 104 Z"
                  fill="#0f4f66"
                />
                <circle cx="84" cy="150" r="7" fill="#0f4f66" />
                <circle cx="136" cy="150" r="7" fill="#0f4f66" />
                <path d="M 72 142 H 148" stroke="#0f4f66" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl font-medium tracking-tight text-slate-900">SetupSO</h1>
              <p className="text-sm tracking-[0.3em] text-slate-400 uppercase">Tempos e Movimentos</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900">
              Acessar Conta
            </h2>
            <p className="mt-1 text-lg text-slate-700">Informe seus dados</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {!isLogin && (
                <>
                  <div>
                    <label className="mb-2 block text-lg font-normal text-slate-900">Nome completo</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 w-full rounded-md border border-[#bfe2ab] bg-white px-4 text-slate-900 outline-none transition focus:border-[#8ecf68] focus:ring-2 focus:ring-[#dff2cb]"
                      required={!isLogin}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-lg font-normal text-slate-900">Número de crachá</label>
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      className="h-11 w-full rounded-md border border-[#bfe2ab] bg-white px-4 text-slate-900 outline-none transition focus:border-[#8ecf68] focus:ring-2 focus:ring-[#dff2cb]"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-lg font-normal text-slate-900">Login</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#bfe2ab] bg-white px-4 text-slate-900 outline-none transition focus:border-[#8ecf68] focus:ring-2 focus:ring-[#dff2cb]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-lg font-normal text-slate-900">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#bfe2ab] bg-white px-4 text-slate-900 outline-none transition focus:border-[#8ecf68] focus:ring-2 focus:ring-[#dff2cb]"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-full bg-[#c8e2ae] px-8 py-2.5 text-base font-medium text-slate-900 shadow-sm transition hover:bg-[#b7d996] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Acessando...' : 'ACESSAR'}
                </button>
              </div>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm text-[#b8bcc4]">
              <button
                type="button"
                className="block w-full text-center transition hover:text-slate-500"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Esqueceu a senha?' : 'Já tem uma conta? Faça login'}
              </button>
              <button
                type="button"
                className="block w-full text-center transition hover:text-slate-500"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Crie seu cadastro agora mesmo' : 'Voltar para o login'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
